"""편의시설 핀 소스.

카카오 로컬 키워드 검색으로 실제 POI(화장실/음수대/바람주입/맛집)를 가져오고,
키가 없거나 호출이 실패하면 seed(DB) 로 폴백한다. 대여소(stations)와 같은 패턴.
"""

import asyncio
import logging
import time
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import AMENITY_CACHE_TTL_SECONDS, has_kakao_key
from ..models import Amenity
from .kakao import search_places

logger = logging.getLogger(__name__)

# 좌표가 안 넘어올 때 쓰는 기본 기준점 (대전시청)
DAEJEON_CENTER = (36.3504, 127.3845)  # (lat, lng)
SEARCH_RADIUS_M = 3000

# 카카오 키워드 검색은 'sort=distance' 로 기준점에서 가까운 순 15건씩 준다.
# 한 종류당 3페이지(최대 45건)까지 받아서 주변을 촘촘히 채운다.
PAGES_PER_KIND = 3

# 캐시 키를 만들 때 좌표를 이 자리수로 뭉갠다 (약 100m). 지도를 조금 움직였다고
# 매번 카카오를 새로 때리지 않게 하려는 것.
COORD_PRECISION = 3

# 종류 -> 카카오 키워드. 순서가 응답 순서가 된다.
# '바람주입': 카카오에 자전거 공기주입기 POI 가 0건이라, 실제로 바람을 넣을 수 있는
#   자전거 수리점(대부분 셀프 공기주입기 비치)을 실데이터 프록시로 쓴다.
KIND_QUERIES: dict[str, str] = {
    "화장실": "화장실",
    "음수대": "음수대",
    "바람주입": "자전거 수리",
    "맛집": "맛집",
}


@dataclass(frozen=True)
class AmenityView:
    kind: str
    name: str
    lat: float
    lng: float
    description: str | None = None


class _Cache:
    """기준 좌표별 TTL 인메모리 캐시.

    결과가 기준 좌표에 따라 달라지므로 좌표를 키로 쓴다 (약 100m 단위로 뭉갬).
    지도를 조금씩 움직일 때 카카오를 반복 호출하지 않게 해준다.
    """

    def __init__(self, ttl_seconds: int, max_entries: int = 32) -> None:
        self._ttl = ttl_seconds
        self._max_entries = max_entries
        self._entries: dict[tuple, tuple[float, list[AmenityView]]] = {}
        self._lock = asyncio.Lock()

    async def get(self, lat: float, lng: float, radius: int) -> list[AmenityView] | None:
        key = (round(lat, COORD_PRECISION), round(lng, COORD_PRECISION), radius)
        hit = self._entries.get(key)
        if hit and (time.monotonic() - hit[0]) < self._ttl:
            return hit[1]

        async with self._lock:
            hit = self._entries.get(key)
            if hit and (time.monotonic() - hit[0]) < self._ttl:
                return hit[1]

            fetched = await _fetch_all(lat, lng, radius)
            if fetched is not None:
                # 메모리가 무한히 늘지 않게 오래된 항목부터 버린다.
                if len(self._entries) >= self._max_entries:
                    oldest = min(self._entries, key=lambda k: self._entries[k][0])
                    self._entries.pop(oldest, None)
                self._entries[key] = (time.monotonic(), fetched)
                return fetched

            # 실패: 만료된 값이라도 있으면 재사용, 없으면 None (seed 폴백)
            return hit[1] if hit else None

    def clear(self) -> None:
        self._entries.clear()


_cache = _Cache(AMENITY_CACHE_TTL_SECONDS)


async def _fetch_all(lat: float, lng: float, radius: int) -> list[AmenityView] | None:
    """주어진 기준 좌표 주변에서 4종을 카카오에서 병렬로 긁어 하나의 리스트로.

    - 키가 없으면 None.
    - 모든 종류 호출이 실패하면(예: 키 IP 차단) None → 호출자가 seed 로 폴백.
    - 일부만 성공하면 성공한 종류만 채운다 (빈 종류는 결과가 없는 것).
    """
    if not has_kakao_key():
        return None

    kinds = list(KIND_QUERIES.items())
    results = await asyncio.gather(
        *(
            search_places(
                query, lat=lat, lng=lng, radius=radius, size=15, pages=PAGES_PER_KIND
            )
            for _, query in kinds
        )
    )

    views: list[AmenityView] = []
    any_ok = False
    for (kind, _query), places in zip(kinds, results):
        if places is None:
            continue  # 이 종류만 실패 (전체 실패 판단은 any_ok 로)
        any_ok = True
        for p in places:
            views.append(
                AmenityView(
                    kind=kind,
                    name=p["name"],
                    lat=p["lat"],
                    lng=p["lng"],
                    description=p["address"] or None,
                )
            )

    if not any_ok:
        return None
    logger.info("카카오 편의시설 %d곳을 불러왔습니다.", len(views))
    return views


def _seed_views(db: Session, kind: str | None) -> list[AmenityView]:
    stmt = select(Amenity)
    if kind:
        stmt = stmt.where(Amenity.kind == kind)
    rows = db.scalars(stmt.order_by(Amenity.id)).all()
    return [AmenityView(a.kind, a.name, a.lat, a.lng, a.description) for a in rows]


async def get_amenities(
    db: Session,
    kind: str | None = None,
    *,
    lat: float | None = None,
    lng: float | None = None,
    radius: int = SEARCH_RADIUS_M,
) -> tuple[list[AmenityView], str]:
    """(편의시설 목록, source). source 는 "kakao" 또는 "seed".

    lat/lng 를 주면 그 지점 주변을 검색한다. 안 주면 대전시청 기준.
    (기준점을 고정하면 'sort=distance' 때문에 결과가 그 근처에만 몰린다.)
    """
    center_lat = lat if lat is not None else DAEJEON_CENTER[0]
    center_lng = lng if lng is not None else DAEJEON_CENTER[1]

    live = await _cache.get(center_lat, center_lng, radius)
    if live is not None:
        views = [v for v in live if not kind or v.kind == kind]
        return views, "kakao"
    return _seed_views(db, kind), "seed"


def clear_cache() -> None:
    _cache.clear()
