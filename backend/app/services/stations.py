"""실시간(또는 seed) 거점 목록에 우리 DB 의 편의시설/거치대 정보를 붙이는 계층.

stations 라우터와 routes 라우터가 같은 결과를 보도록 여기 한 곳에서만 병합한다.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Station, StationFacility
from .tashu import LiveStation, get_live_stations

# 거치대 대비 잔여 비율 임계값 (집중도 지도 범례)
SURPLUS_RATIO = 0.7  # 이상이면 과잉(빨강)
SHORTAGE_RATIO = 0.2  # 이하면 부족(파랑)


@dataclass
class StationView:
    id: int
    name: str
    lat: float
    lng: float
    available_bikes: int
    rack_count: int
    has_toilet: bool
    has_water: bool
    has_pump: bool
    nearby_spots: list[str]
    address: str | None = None

    @property
    def fill_ratio(self) -> float | None:
        """거치대 대비 잔여 비율. 거치대 수를 모르면 None."""
        if self.rack_count <= 0:
            return None
        return round(min(1.0, self.available_bikes / self.rack_count), 3)

    @property
    def density(self) -> str:
        """과잉 / 적정 / 부족."""
        ratio = self.fill_ratio
        if ratio is None:
            # 거치대 수를 모르면 절대 대수로 판단한다.
            if self.available_bikes >= 7:
                return "과잉"
            if self.available_bikes <= 2:
                return "부족"
            return "적정"
        if ratio >= SURPLUS_RATIO:
            return "과잉"
        if ratio <= SHORTAGE_RATIO:
            return "부족"
        return "적정"


def _normalize(name: str) -> str:
    """이름 매칭용 정규화: 공백 제거 + '거점'/'대여소' 같은 접미사 제거."""
    cleaned = name.replace(" ", "")
    for suffix in ("대여소", "거점", "정류소"):
        cleaned = cleaned.replace(suffix, "")
    return cleaned


def _match_facility(
    name: str,
    station_id: int,
    by_id: dict[int, StationFacility],
    facilities: list[StationFacility],
) -> StationFacility | None:
    """1) tashu_station_id 정확 매칭 → 2) 이름 정규화 부분 일치."""
    hit = by_id.get(station_id)
    if hit is not None:
        return hit

    target = _normalize(name)
    if not target:
        return None
    for facility in facilities:
        key = _normalize(facility.name)
        if key and (key == target or key in target or target in key):
            return facility
    return None


def _merge(
    raw: list[tuple[int, str, float, float, int, str | None]],
    facilities: list[StationFacility],
) -> list[StationView]:
    by_id = {f.tashu_station_id: f for f in facilities if f.tashu_station_id is not None}
    views: list[StationView] = []
    for station_id, name, lat, lng, available, address in raw:
        facility = _match_facility(name, station_id, by_id, facilities)
        views.append(
            StationView(
                id=station_id,
                name=name,
                lat=lat,
                lng=lng,
                available_bikes=available,
                rack_count=facility.rack_count if facility else 0,
                has_toilet=bool(facility.has_toilet) if facility else False,
                has_water=bool(facility.has_water) if facility else False,
                has_pump=bool(facility.has_pump) if facility else False,
                nearby_spots=list(facility.nearby_spots or []) if facility else [],
                address=address,
            )
        )
    return views


def _seed_rows(db: Session) -> list[tuple[int, str, float, float, int, str | None]]:
    stations = db.scalars(select(Station).order_by(Station.id)).all()
    return [(s.id, s.name, s.lat, s.lng, s.available_bikes, None) for s in stations]


def _live_rows(
    live: list[LiveStation],
) -> list[tuple[int, str, float, float, int, str | None]]:
    return [(s.id, s.name, s.lat, s.lng, s.available_bikes, s.address) for s in live]


async def get_stations(db: Session) -> tuple[list[StationView], str]:
    """(거점 목록, source). source 는 "live" 또는 "seed"."""
    facilities = db.scalars(select(StationFacility)).all()

    live = await get_live_stations()
    if live:
        return _merge(_live_rows(live), list(facilities)), "live"

    # 키가 없거나 공공 API 실패 → seed 데이터로 데모를 계속 돌린다.
    return _merge(_seed_rows(db), list(facilities)), "seed"
