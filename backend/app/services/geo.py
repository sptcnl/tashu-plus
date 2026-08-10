"""좌표 계산 유틸.

주의: 외부 API 두 곳의 좌표 축 이름이 서로 반대다.
  - 타슈 공공 API: x_pos = 위도(lat), y_pos = 경도(lng)
  - 카카오 REST API: x = 경도(lng), y = 위도(lat)
이 모듈과 내부 스키마는 혼동을 막기 위해 항상 (lat, lng) 이름을 명시해서 다룬다.
"""

import math

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 좌표 사이 대권거리(미터)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _to_local_xy(lat: float, lng: float, ref_lat: float) -> tuple[float, float]:
    """등거리 원통 도법으로 미터 단위 평면 좌표로 근사 변환.

    대전 시내 정도의 좁은 범위에서 점-선분 거리를 재는 용도로는 충분하다.
    """
    x = math.radians(lng) * EARTH_RADIUS_M * math.cos(math.radians(ref_lat))
    y = math.radians(lat) * EARTH_RADIUS_M
    return x, y


def _point_segment_distance_m(
    lat: float,
    lng: float,
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
    ref_lat: float,
) -> float:
    px, py = _to_local_xy(lat, lng, ref_lat)
    ax, ay = _to_local_xy(lat1, lng1, ref_lat)
    bx, by = _to_local_xy(lat2, lng2, ref_lat)

    abx, aby = bx - ax, by - ay
    seg_len_sq = abx * abx + aby * aby
    if seg_len_sq == 0:
        return math.hypot(px - ax, py - ay)

    # 선분 위로의 정사영 비율을 [0, 1] 로 클램프해 선분 밖으로 나가지 않게 한다.
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / seg_len_sq))
    cx, cy = ax + t * abx, ay + t * aby
    return math.hypot(px - cx, py - cy)


def min_distance_to_path_m(lat: float, lng: float, path: list[dict]) -> float:
    """점에서 경로(폴리라인)까지의 최단거리(미터).

    path 는 [{"lat": .., "lng": ..}, ...] 형태. 점이 1개면 그 점까지의 거리를 준다.
    """
    if not path:
        return float("inf")
    if len(path) == 1:
        return haversine_m(lat, lng, path[0]["lat"], path[0]["lng"])

    ref_lat = path[0]["lat"]
    best = float("inf")
    for a, b in zip(path, path[1:]):
        d = _point_segment_distance_m(
            lat, lng, a["lat"], a["lng"], b["lat"], b["lng"], ref_lat
        )
        if d < best:
            best = d
    return best
