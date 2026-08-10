from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    NearbyListOut,
    NearbyStationOut,
    StationListOut,
    StationOut,
)
from ..services.geo import haversine_m
from ..services.stations import StationView, get_stations
from ..services.tashu import cache_age_seconds

router = APIRouter(prefix="/stations", tags=["stations"])


def _to_out(view: StationView) -> StationOut:
    return StationOut(
        id=view.id,
        name=view.name,
        lat=view.lat,
        lng=view.lng,
        available_bikes=view.available_bikes,
        rack_count=view.rack_count,
        has_toilet=view.has_toilet,
        has_water=view.has_water,
        has_pump=view.has_pump,
        nearby_spots=view.nearby_spots,
        address=view.address,
        density=view.density,
        fill_ratio=view.fill_ratio,
    )


@router.get(
    "",
    response_model=StationListOut,
    summary="거점 목록 (타슈 실시간, 실패 시 seed)",
)
async def list_stations(db: Session = Depends(get_db)):
    views, source = await get_stations(db)
    return StationListOut(
        source=source,
        count=len(views),
        cache_age_seconds=round(cache_age_seconds(), 1) if cache_age_seconds() else None,
        stations=[_to_out(v) for v in views],
    )


@router.get(
    "/nearby",
    response_model=NearbyListOut,
    summary="현재 위치 주변 거점 (haversine 거리순)",
)
async def nearby_stations(
    lat: float = Query(..., ge=-90, le=90, description="기준 위도"),
    lng: float = Query(..., ge=-180, le=180, description="기준 경도"),
    radius: float = Query(1000, gt=0, le=50_000, description="반경 (미터)"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    views, source = await get_stations(db)

    scored: list[tuple[float, StationView]] = []
    for view in views:
        distance = haversine_m(lat, lng, view.lat, view.lng)
        if distance <= radius:
            scored.append((distance, view))
    scored.sort(key=lambda pair: pair[0])

    return NearbyListOut(
        source=source,
        count=len(scored),
        stations=[
            NearbyStationOut(**_to_out(view).model_dump(), distance_m=round(distance, 1))
            for distance, view in scored[:limit]
        ],
    )


@router.get("/{station_id}", response_model=StationOut, summary="거점 상세")
async def get_station(station_id: int, db: Session = Depends(get_db)):
    views, _ = await get_stations(db)
    for view in views:
        if view.id == station_id:
            return _to_out(view)
    raise HTTPException(status_code=404, detail="거점을 찾을 수 없습니다.")
