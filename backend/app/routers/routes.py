"""이동수단별 경로 비교.

카카오맵 REST 경로 API(도보/자전거/대중교통)로 실제 경로를 조회하고,
타슈 카드는 "도보 → 자전거 → 도보" 3구간을 각각 조회해서 합산한다.
카카오 키가 없거나 호출이 실패하면 직선거리 기반 mock 으로 폴백한다.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import DANGER_RADIUS_M
from ..database import get_db
from ..models import Report
from ..schemas import (
    LatLng,
    RouteCompareOut,
    RouteOption,
    RouteSegment,
    StationBrief,
)
from ..services.geo import haversine_m, min_distance_to_path_m
from ..services.kakao import (
    RouteLeg,
    RouteResult,
    bicycle_route,
    transit_route,
    walk_route,
)
from ..services.stations import StationView, get_stations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/routes", tags=["routes"])

# PLACEHOLDER: 실제 요금 확인 후 교체 예정 (타슈 기본 대여료 / 시내버스 성인 현금)
TASHU_FARE = 500
BUS_FARE_FALLBACK = 1500

# mock 폴백용 평균 속도 (km/h)
BIKE_KMH = 13.0
BUS_KMH = 18.0
WALK_KMH = 4.2
BUS_OVERHEAD_MIN = 9


def _minutes(seconds: int) -> int:
    # 길이 0인 구간(출발지가 곧 거점인 경우)은 0분으로 둔다. 그 외에는 최소 1분.
    if seconds <= 0:
        return 0
    return max(1, round(seconds / 60))


def _to_latlng(path: list[dict]) -> list[LatLng]:
    return [LatLng(lat=p["lat"], lng=p["lng"]) for p in path]


def _straight_path(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> list[dict]:
    """mock 폴백에서 지도에 뭐라도 그릴 수 있도록 만드는 직선 경로."""
    return [{"lat": a_lat, "lng": a_lng}, {"lat": b_lat, "lng": b_lng}]


# ------------------------------------------------------------------ 거점 선택


def _nearest_pickup(views: list[StationView], lat: float, lng: float) -> StationView | None:
    """출발지에서 가장 가까운, 자전거가 1대 이상 있는 거점."""
    candidates = [v for v in views if v.available_bikes >= 1]
    if not candidates:
        return None
    return min(candidates, key=lambda v: haversine_m(lat, lng, v.lat, v.lng))


def _nearest_return(
    views: list[StationView], lat: float, lng: float, exclude_id: int | None
) -> StationView | None:
    """도착지에서 가장 가까운, 거치가 가능한 거점.

    거치대 수를 모르는 거점(rack_count == 0)은 거치 가능으로 취급한다.
    """
    candidates = [
        v
        for v in views
        if v.id != exclude_id and (v.rack_count <= 0 or v.available_bikes < v.rack_count)
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda v: haversine_m(lat, lng, v.lat, v.lng))


# ------------------------------------------------------------------ 위험구간


def _count_dangers(db: Session, path: list[dict]) -> int:
    """미처리 제보가 경로에서 DANGER_RADIUS_M 이내에 있으면 위험구간으로 센다."""
    if not path:
        return 0
    reports = db.scalars(
        select(Report).where(Report.status.in_(["접수", "처리중"]))
    ).all()
    return sum(
        1 for r in reports if min_distance_to_path_m(r.lat, r.lng, path) <= DANGER_RADIUS_M
    )


# ------------------------------------------------------------------ 카드 조립


def _walk_card(result: RouteResult) -> RouteOption:
    return RouteOption(
        key="walk",
        mode="도보",
        total_min=_minutes(result.duration_s),
        distance_m=result.distance_m,
        cost=0,
        summary=f"{result.distance_m / 1000:.1f}km 걷기",
        segments=[
            RouteSegment(
                mode="도보",
                description="전 구간 도보",
                duration_min=_minutes(result.duration_s),
                distance_m=result.distance_m,
                path=_to_latlng(result.path),
            )
        ],
        polyline=_to_latlng(result.path),
    )


def _transit_card(result: RouteResult) -> RouteOption:
    fare = result.fare or BUS_FARE_FALLBACK
    transfer_text = f" · 환승 {result.transfers}회" if result.transfers else ""
    return RouteOption(
        key="transit",
        mode="버스",
        total_min=_minutes(result.duration_s),
        distance_m=result.distance_m,
        cost=fare,
        summary=f"{result.distance_m / 1000:.1f}km{transfer_text}",
        transfers=result.transfers,
        segments=[
            RouteSegment(
                mode=leg.mode,
                description=leg.guidance or leg.mode,
                duration_min=_minutes(leg.duration_s) if leg.duration_s else 0,
                distance_m=leg.distance_m,
                path=_to_latlng(leg.path),
            )
            for leg in result.legs
        ],
        polyline=_to_latlng(result.path),
    )


def _tashu_card(
    db: Session,
    pickup: StationView,
    dropoff: StationView,
    access: RouteResult,
    ride: RouteResult,
    egress: RouteResult,
) -> RouteOption:
    total_s = access.duration_s + ride.duration_s + egress.duration_s
    total_m = access.distance_m + ride.distance_m + egress.distance_m
    full_path = [*access.path, *ride.path, *egress.path]

    segments = [
        RouteSegment(
            mode="도보",
            description=f"출발지 → {pickup.name} 거점",
            duration_min=_minutes(access.duration_s),
            distance_m=access.distance_m,
            path=_to_latlng(access.path),
        ),
        RouteSegment(
            mode="자전거",
            description=f"{pickup.name} 거점 → {dropoff.name} 거점",
            duration_min=_minutes(ride.duration_s),
            distance_m=ride.distance_m,
            path=_to_latlng(ride.path),
        ),
        RouteSegment(
            mode="도보",
            description=f"{dropoff.name} 거점 → 목적지",
            duration_min=_minutes(egress.duration_s),
            distance_m=egress.distance_m,
            path=_to_latlng(egress.path),
        ),
    ]
    # 출발지/목적지가 곧 거점이면 걷는 구간이 없다. 0분·0m 구간은 노이즈라 빼고,
    # 자전거 구간은 항상 남긴다.
    segments = [s for s in segments if s.mode == "자전거" or s.distance_m > 0]

    waypoints = [f"{pickup.name} 거점", f"{dropoff.name} 거점"]
    return RouteOption(
        key="tashu",
        mode="타슈 + 도보",
        total_min=_minutes(total_s),
        distance_m=total_m,
        cost=TASHU_FARE,
        recommended=True,
        summary=" > ".join(["출발지", *waypoints, "목적지"]),
        segments=segments,
        polyline=_to_latlng(full_path),
        waypoints=waypoints,
        from_station=StationBrief(
            id=pickup.id,
            name=pickup.name,
            lat=pickup.lat,
            lng=pickup.lng,
            available_bikes=pickup.available_bikes,
            rack_count=pickup.rack_count,
        ),
        to_station=StationBrief(
            id=dropoff.id,
            name=dropoff.name,
            lat=dropoff.lat,
            lng=dropoff.lng,
            available_bikes=dropoff.available_bikes,
            rack_count=dropoff.rack_count,
        ),
        danger_count=_count_dangers(db, full_path),
    )


# ------------------------------------------------------------------ mock 폴백


def _mock_result(
    a_lat: float, a_lng: float, b_lat: float, b_lng: float, kmh: float
) -> RouteResult:
    distance_m = int(haversine_m(a_lat, a_lng, b_lat, b_lng))
    duration_s = int(max(60, distance_m / 1000 / kmh * 3600))
    return RouteResult(
        duration_s=duration_s,
        distance_m=distance_m,
        path=_straight_path(a_lat, a_lng, b_lat, b_lng),
    )


def _mock_compare(
    db: Session,
    views: list[StationView],
    from_lat: float,
    from_lng: float,
    to_lat: float,
    to_lng: float,
) -> list[RouteOption]:
    options: list[RouteOption] = []

    pickup = _nearest_pickup(views, from_lat, from_lng)
    dropoff = _nearest_return(views, to_lat, to_lng, pickup.id if pickup else None)
    if pickup and dropoff:
        access = _mock_result(from_lat, from_lng, pickup.lat, pickup.lng, WALK_KMH)
        ride = _mock_result(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, BIKE_KMH)
        egress = _mock_result(dropoff.lat, dropoff.lng, to_lat, to_lng, WALK_KMH)
        options.append(_tashu_card(db, pickup, dropoff, access, ride, egress))

    bus = _mock_result(from_lat, from_lng, to_lat, to_lng, BUS_KMH)
    bus.duration_s += BUS_OVERHEAD_MIN * 60  # 정류장 도보 + 대기 + 환승
    bus.fare = BUS_FARE_FALLBACK
    bus.transfers = 1
    bus.legs = [
        RouteLeg(
            mode="버스",
            duration_s=bus.duration_s,
            distance_m=bus.distance_m,
            path=bus.path,
            guidance="시내버스 이용",
        )
    ]
    options.append(_transit_card(bus))

    options.append(_walk_card(_mock_result(from_lat, from_lng, to_lat, to_lng, WALK_KMH)))
    return options


# ------------------------------------------------------------------ 엔드포인트


@router.get(
    "/compare",
    response_model=RouteCompareOut,
    summary="타슈/버스/도보 경로 비교 (카카오 경로 API, 실패 시 mock)",
)
async def compare_routes(
    from_lat: float = Query(..., ge=-90, le=90, description="출발 위도"),
    from_lng: float = Query(..., ge=-180, le=180, description="출발 경도"),
    to_lat: float = Query(..., ge=-90, le=90, description="도착 위도"),
    to_lng: float = Query(..., ge=-180, le=180, description="도착 경도"),
    from_name: str = Query("현재 위치", description="출발지 표시명"),
    to_name: str = Query("목적지", description="도착지 표시명"),
    db: Session = Depends(get_db),
):
    views, _ = await get_stations(db)

    pickup = _nearest_pickup(views, from_lat, from_lng)
    dropoff = _nearest_return(views, to_lat, to_lng, pickup.id if pickup else None)

    # 도보 / 대중교통 / 타슈 3구간을 한 번에 동시 호출한다.
    tasks: dict[str, asyncio.Future] = {
        "walk": asyncio.ensure_future(walk_route(from_lat, from_lng, to_lat, to_lng)),
        "transit": asyncio.ensure_future(transit_route(from_lat, from_lng, to_lat, to_lng)),
    }
    if pickup and dropoff:
        tasks["access"] = asyncio.ensure_future(
            walk_route(from_lat, from_lng, pickup.lat, pickup.lng)
        )
        tasks["ride"] = asyncio.ensure_future(
            bicycle_route(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
        )
        tasks["egress"] = asyncio.ensure_future(
            walk_route(dropoff.lat, dropoff.lng, to_lat, to_lng)
        )

    gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)
    results: dict[str, RouteResult | None] = {}
    for key, value in zip(tasks.keys(), gathered):
        if isinstance(value, BaseException):
            logger.warning("카카오 경로 조회 실패(%s): %s", key, value)
            results[key] = None
        else:
            results[key] = value

    options: list[RouteOption] = []

    if pickup and dropoff and results.get("access") and results.get("ride") and results.get("egress"):
        options.append(
            _tashu_card(
                db,
                pickup,
                dropoff,
                results["access"],  # type: ignore[arg-type]
                results["ride"],  # type: ignore[arg-type]
                results["egress"],  # type: ignore[arg-type]
            )
        )
    if results.get("transit"):
        options.append(_transit_card(results["transit"]))  # type: ignore[arg-type]
    if results.get("walk"):
        options.append(_walk_card(results["walk"]))  # type: ignore[arg-type]

    # 3장 중 하나라도 못 만들었으면 전체를 mock 으로 통일해 카드 구성이 깨지지 않게 한다.
    source = "kakao"
    if len(options) < 3:
        logger.info("카카오 경로 %d/3 성공 → mock 폴백", len(options))
        options = _mock_compare(db, views, from_lat, from_lng, to_lat, to_lng)
        source = "mock"

    # 타슈 카드가 없으면 가장 빠른 카드를 추천으로 올린다.
    if options and not any(o.recommended for o in options):
        min(options, key=lambda o: o.total_min).recommended = True


    return RouteCompareOut(
        origin=from_name,
        destination=to_name,
        origin_coord=LatLng(lat=from_lat, lng=from_lng),
        destination_coord=LatLng(lat=to_lat, lng=to_lng),
        source=source,
        options=options,
    )
