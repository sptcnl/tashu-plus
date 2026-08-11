"""카카오맵 REST API 클라이언트 (2026-07-21 신규 추가된 경로 API 4종 중 3종).

    도보     GET {base}/v2/routing/walk
    자전거   GET {base}/v2/routing/bicycle
    대중교통 GET {base}/v2/routing/publictraffic
    인증     Authorization: KakaoAK <REST_API_KEY>

공통 규칙 (문서 확인 결과):
  - 요청 파라미터 start_x/start_y/end_x/end_y 에서 **x = 경도(lng), y = 위도(lat)**
    (타슈 공공 API 와 축 이름이 반대라 헷갈리기 쉬움)
  - totalTime 단위는 초(s), totalDistance 단위는 미터(m)
  - 성공 시 status == "OK"

이 모듈은 응답을 내부 표준형(RouteLeg)으로 정규화한다. 좌표는 축 혼동을 막기 위해
바깥으로 나갈 때 항상 [{"lat":..,"lng":..}] 형태로 변환한다.
"""

import logging
from dataclasses import dataclass, field

import httpx

from ..config import (
    HTTP_TIMEOUT_SECONDS,
    KAKAO_API_BASE,
    KAKAO_REST_KEY,
    has_kakao_key,
)
from .geo import haversine_m

logger = logging.getLogger(__name__)

WALK_PATH = "/v2/routing/walk"
BICYCLE_PATH = "/v2/routing/bicycle"
TRANSIT_PATH = "/v2/routing/publictraffic"
KEYWORD_PATH = "/v2/local/search/keyword.json"


@dataclass
class RouteLeg:
    """정규화된 한 구간."""

    mode: str  # 도보 / 자전거 / 버스 / 지하철
    duration_s: int
    distance_m: int
    path: list[dict] = field(default_factory=list)  # [{"lat":..,"lng":..}]
    guidance: str = ""


@dataclass
class RouteResult:
    duration_s: int
    distance_m: int
    path: list[dict] = field(default_factory=list)
    legs: list[RouteLeg] = field(default_factory=list)
    fare: int = 0
    transfers: int = 0


def _headers() -> dict[str, str]:
    return {"Authorization": f"KakaoAK {KAKAO_REST_KEY}"}


def _points_to_latlng(points: object) -> list[dict]:
    """카카오의 [[x, y], ...] (x=경도, y=위도) 를 [{"lat":..,"lng":..}] 로 변환."""
    if not isinstance(points, list):
        return []
    out: list[dict] = []
    for p in points:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            try:
                out.append({"lat": float(p[1]), "lng": float(p[0])})
            except (TypeError, ValueError):
                continue
        elif isinstance(p, dict) and "x" in p and "y" in p:
            try:
                out.append({"lat": float(p["y"]), "lng": float(p["x"])})
            except (TypeError, ValueError):
                continue
    return out


async def _get(path: str, params: dict) -> dict | None:
    if not has_kakao_key():
        return None
    url = f"{KAKAO_API_BASE}{path}"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            res = await client.get(url, params=params, headers=_headers())
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as exc:
        logger.warning("카카오 API %s 응답 오류: %s", path, exc.response.status_code)
        return None
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("카카오 API %s 호출 실패: %s", path, exc)
        return None


def _coord_params(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> dict[str, str]:
    # x = 경도, y = 위도
    return {
        "start_x": str(from_lng),
        "start_y": str(from_lat),
        "end_x": str(to_lng),
        "end_y": str(to_lat),
    }


def zero_leg(lat: float, lng: float, mode: str = "도보") -> RouteResult:
    """길이 0인 구간.

    출발지/도착지가 거점과 사실상 같은 지점이면 경로가 필요 없다. 이 경우를 실패로
    취급하면 타슈 카드 전체가 날아가므로 0분 구간으로 대체한다.
    """
    point = [{"lat": lat, "lng": lng}]
    return RouteResult(
        duration_s=0,
        distance_m=0,
        path=point,
        legs=[RouteLeg(mode=mode, duration_s=0, distance_m=0, path=point)],
    )


def _parse_walk_like(payload: dict, mode: str, start: tuple[float, float]) -> RouteResult | None:
    """도보/자전거 공통 응답 파서.

    { status, route: { properties: {totalDistance, totalTime},
                       legs: [ { properties:{distance,time},
                                 steps:[ {properties:{...}, path:{points:[[x,y]]}} ] } ] } }
    """
    status = payload.get("status")
    if status != "OK":
        # SAME_POINT = 출발지와 도착지가 같은 지점. 오류가 아니라 '이동 불필요' 이므로
        # 0분 구간으로 돌려준다. (도착지를 거점으로 고르면 실제로 자주 발생한다)
        if status == "SAME_POINT":
            return zero_leg(start[0], start[1], mode)
        logger.info("카카오 %s 경로 status=%s", mode, status)
        return None

    route = payload.get("route")
    if not isinstance(route, dict):
        return None

    props = route.get("properties") or {}
    try:
        duration_s = int(props.get("totalTime") or 0)
        distance_m = int(props.get("totalDistance") or 0)
    except (TypeError, ValueError):
        return None

    path: list[dict] = []
    guidance_bits: list[str] = []
    for leg in route.get("legs") or []:
        if not isinstance(leg, dict):
            continue
        for step in leg.get("steps") or []:
            if not isinstance(step, dict):
                continue
            path.extend(_points_to_latlng((step.get("path") or {}).get("points")))
            text = (step.get("properties") or {}).get("guidance")
            if text:
                guidance_bits.append(str(text))

    if duration_s <= 0 and not path:
        return None

    return RouteResult(
        duration_s=duration_s,
        distance_m=distance_m,
        path=path,
        legs=[
            RouteLeg(
                mode=mode,
                duration_s=duration_s,
                distance_m=distance_m,
                path=path,
                guidance=" · ".join(guidance_bits[:3]),
            )
        ],
    )


# 이 거리 이하면 경로 API 를 부르지 않고 0분 구간으로 처리한다 (미터).
SAME_POINT_THRESHOLD_M = 25.0


def _is_same_point(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> bool:
    return haversine_m(from_lat, from_lng, to_lat, to_lng) <= SAME_POINT_THRESHOLD_M


async def walk_route(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> RouteResult | None:
    if _is_same_point(from_lat, from_lng, to_lat, to_lng):
        return zero_leg(from_lat, from_lng, "도보")
    payload = await _get(WALK_PATH, _coord_params(from_lat, from_lng, to_lat, to_lng))
    return _parse_walk_like(payload, "도보", (from_lat, from_lng)) if payload else None


async def bicycle_route(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> RouteResult | None:
    if _is_same_point(from_lat, from_lng, to_lat, to_lng):
        return zero_leg(from_lat, from_lng, "자전거")
    payload = await _get(BICYCLE_PATH, _coord_params(from_lat, from_lng, to_lat, to_lng))
    return _parse_walk_like(payload, "자전거", (from_lat, from_lng)) if payload else None


_TRANSIT_MODE_LABEL = {"BUS": "버스", "SUBWAY": "지하철", "WALKING": "도보"}


async def transit_route(
    from_lat: float, from_lng: float, to_lat: float, to_lng: float
) -> RouteResult | None:
    """대중교통 경로. 여러 후보 중 소요시간이 가장 짧은 것을 고른다."""
    payload = await _get(TRANSIT_PATH, _coord_params(from_lat, from_lng, to_lat, to_lng))
    if not payload or payload.get("status") != "OK":
        if payload:
            logger.info("카카오 대중교통 status=%s", payload.get("status"))
        return None

    routes = [r for r in (payload.get("routes") or []) if isinstance(r, dict)]
    if not routes:
        return None

    def total_time(route: dict) -> int:
        try:
            return int((route.get("properties") or {}).get("totalTime") or 0)
        except (TypeError, ValueError):
            return 0

    best = min((r for r in routes if total_time(r) > 0), key=total_time, default=None)
    if best is None:
        return None

    props = best.get("properties") or {}
    fare_raw = props.get("fare")
    fare = 0
    if isinstance(fare_raw, dict):
        try:
            fare = int(fare_raw.get("value") or 0)
        except (TypeError, ValueError):
            fare = 0

    path: list[dict] = []
    legs: list[RouteLeg] = []
    for step in best.get("steps") or []:
        if not isinstance(step, dict):
            continue
        sp = step.get("properties") or {}
        step_path = _points_to_latlng((step.get("path") or {}).get("points"))
        path.extend(step_path)

        vehicles = sp.get("vehicles")
        vehicle_name = ""
        if isinstance(vehicles, list) and vehicles and isinstance(vehicles[0], dict):
            vehicle_name = str(vehicles[0].get("name") or "")

        try:
            step_time = int(sp.get("time") or 0)
            step_distance = int(sp.get("distance") or 0)
        except (TypeError, ValueError):
            step_time, step_distance = 0, 0

        legs.append(
            RouteLeg(
                mode=_TRANSIT_MODE_LABEL.get(str(sp.get("type")), str(sp.get("type") or "이동")),
                duration_s=step_time,
                distance_m=step_distance,
                path=step_path,
                guidance=vehicle_name or str(sp.get("guidance") or ""),
            )
        )

    try:
        transfers = int(props.get("transfers") or 0)
        duration_s = int(props.get("totalTime") or 0)
        distance_m = int(props.get("totalDistance") or 0)
    except (TypeError, ValueError):
        return None

    return RouteResult(
        duration_s=duration_s,
        distance_m=distance_m,
        path=path,
        legs=legs,
        fare=fare,
        transfers=transfers,
    )


async def search_keyword(query: str) -> dict | None:
    """키워드로 장소 좌표 찾기 (경로 화면의 출발/도착 입력을 좌표로 바꾸는 용도).

    응답 documents[0] 의 x=경도, y=위도.
    """
    payload = await _get(KEYWORD_PATH, {"query": query, "size": 1})
    if not payload:
        return None
    documents = payload.get("documents")
    if not isinstance(documents, list) or not documents:
        return None
    doc = documents[0]
    try:
        return {
            "name": str(doc.get("place_name") or query),
            "address": str(doc.get("road_address_name") or doc.get("address_name") or ""),
            "lat": float(doc["y"]),
            "lng": float(doc["x"]),
        }
    except (KeyError, TypeError, ValueError):
        return None


async def search_places(
    query: str,
    *,
    lat: float,
    lng: float,
    radius: int = 20000,
    size: int = 15,
) -> list[dict] | None:
    """키워드로 특정 좌표 주변 장소 '여러 곳' 을 좌표와 함께 찾는다 (편의시설 핀 용도).

    - x=경도(lng), y=위도(lat), radius(m) 안에서 가까운 순으로.
    - 키가 없거나 호출이 실패하면 None (호출자가 seed 로 폴백).
    - 결과가 0건이면 빈 리스트를 돌려준다 (호출은 성공했으나 해당 종류가 없는 것).
    """
    payload = await _get(
        KEYWORD_PATH,
        {
            "query": query,
            "x": str(lng),
            "y": str(lat),
            "radius": max(0, min(radius, 20000)),
            "size": max(1, min(size, 15)),
            "sort": "distance",
        },
    )
    if not payload:
        return None
    documents = payload.get("documents")
    if not isinstance(documents, list):
        return None

    places: list[dict] = []
    for doc in documents:
        if not isinstance(doc, dict):
            continue
        try:
            name = str(doc.get("place_name") or "").strip()
            lat_v = float(doc["y"])
            lng_v = float(doc["x"])
        except (KeyError, TypeError, ValueError):
            continue
        if not name:
            continue
        places.append(
            {
                "name": name,
                "address": str(
                    doc.get("road_address_name") or doc.get("address_name") or ""
                ).strip(),
                "lat": lat_v,
                "lng": lng_v,
            }
        )
    return places
