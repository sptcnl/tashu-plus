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

# 검색 기준점 — 대전시청 인근. 반경 20km 로 대전 전역을 덮는다.
DAEJEON_CENTER = (36.3504, 127.3845)  # (lat, lng)
SEARCH_RADIUS_M = 20000

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
    """TTL 인메모리 캐시 (services/tashu.py 와 같은 구조)."""

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._value: list[AmenityView] | None = None
        self._fetched_at: float = 0.0
        self._lock = asyncio.Lock()

    def _fresh(self) -> bool:
        return self._value is not None and (time.monotonic() - self._fetched_at) < self._ttl

    async def get(self) -> list[AmenityView] | None:
        if self._fresh():
            return self._value
        async with self._lock:
            if self._fresh():
                return self._value
            fetched = await _fetch_all()
            if fetched is not None:
                self._value = fetched
                self._fetched_at = time.monotonic()
                return fetched
            # 실패: 오래된 값이라도 있으면 재사용, 없으면 None (seed 폴백)
            return self._value

    def clear(self) -> None:
        self._value = None
        self._fetched_at = 0.0


_cache = _Cache(AMENITY_CACHE_TTL_SECONDS)


async def _fetch_all() -> list[AmenityView] | None:
    """4종을 카카오에서 병렬로 긁어 하나의 리스트로.

    - 키가 없으면 None.
    - 모든 종류 호출이 실패하면(예: 키 IP 차단) None → 호출자가 seed 로 폴백.
    - 일부만 성공하면 성공한 종류만 채운다 (빈 종류는 결과가 없는 것).
    """
    if not has_kakao_key():
        return None

    lat, lng = DAEJEON_CENTER
    kinds = list(KIND_QUERIES.items())
    results = await asyncio.gather(
        *(
            search_places(query, lat=lat, lng=lng, radius=SEARCH_RADIUS_M, size=15)
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


async def get_amenities(db: Session, kind: str | None = None) -> tuple[list[AmenityView], str]:
    """(편의시설 목록, source). source 는 "kakao" 또는 "seed"."""
    live = await _cache.get()
    if live is not None:
        views = [v for v in live if not kind or v.kind == kind]
        return views, "kakao"
    return _seed_views(db, kind), "seed"


def clear_cache() -> None:
    _cache.clear()
