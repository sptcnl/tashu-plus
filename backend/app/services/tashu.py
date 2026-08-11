"""타슈 실시간 대여소 현황 프록시.

엔드포인트 (공공데이터포털 15119663 은 LINK 형 안내 페이지이고, 실제 호출은 아래로 한다):
    GET https://bikeapp.tashu.or.kr:50041/v1/openapi/station
    헤더: api-token: <발급키>

응답 스키마:
    {
      "count": 12,
      "next": null,
      "previous": null,
      "results": [
        {
          "id": 1,
          "name": "대여소 한글명",
          "name_en": "...",
          "name_cn": "...",
          "x_pos": "36.3504",     # 위도(latitude)  <- 이름과 반대!
          "y_pos": "127.3845",    # 경도(longitude) <- 이름과 반대!
          "address": "...",
          "parking_count": 5      # 대여 가능한 자전거 수
        }
      ]
    }

거치대 총 개수(rack_count)는 이 API 에 없어서 우리 DB(StationFacility)에서 채운다.
프론트에서 직접 호출하지 않고 반드시 이 프록시를 경유해 키 노출을 막는다.
"""

import asyncio
import logging
import time
from dataclasses import dataclass

import httpx

from ..config import (
    HTTP_TIMEOUT_SECONDS,
    TASHU_API_KEY,
    TASHU_API_URL,
    TASHU_CACHE_TTL_SECONDS,
    has_tashu_key,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LiveStation:
    """공공 API 가 준 대여소 한 곳. 좌표는 (lat, lng) 로 정규화해서 들고 있다."""

    id: int
    name: str
    lat: float
    lng: float
    available_bikes: int
    address: str | None = None


class _Cache:
    """TTL 인메모리 캐시.

    동시에 여러 요청이 들어와도 만료 시 한 번만 원본을 호출하도록 Lock 을 쓴다.
    (프로세스 로컬 캐시이므로 워커를 여러 개 띄우면 워커별로 하나씩 잡힌다.)
    """

    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._value: list[LiveStation] | None = None
        self._fetched_at: float = 0.0
        self._lock = asyncio.Lock()

    def _fresh(self) -> bool:
        return self._value is not None and (time.monotonic() - self._fetched_at) < self._ttl

    @property
    def age_seconds(self) -> float | None:
        if self._value is None:
            return None
        return time.monotonic() - self._fetched_at

    async def get(self) -> list[LiveStation] | None:
        if self._fresh():
            return self._value

        async with self._lock:
            # Lock 을 기다리는 동안 다른 요청이 이미 채웠을 수 있다.
            if self._fresh():
                return self._value

            fetched = await _request_stations()
            if fetched is not None:
                self._value = fetched
                self._fetched_at = time.monotonic()
                return fetched

            # 호출 실패: 오래된 값이라도 있으면 그걸 쓰고, 없으면 None (seed 폴백)
            return self._value

    def clear(self) -> None:
        self._value = None
        self._fetched_at = 0.0


_cache = _Cache(TASHU_CACHE_TTL_SECONDS)


def _parse_station(raw: dict) -> LiveStation | None:
    """응답 항목 하나를 LiveStation 으로. 좌표/수량이 문자열로 와도 견디게 한다."""
    try:
        # 실제 API 의 id 는 "ST0003" 같은 문자열이라 숫자만 뽑아 정수로 만든다.
        # (문서 예시는 정수였지만 운영 응답과 형식이 다르다.)
        raw_id = str(raw["id"]).strip()
        digits = "".join(ch for ch in raw_id if ch.isdigit())
        station_id = int(digits)
        name = str(raw.get("name") or "").strip()
        # x_pos = 위도, y_pos = 경도 (필드 이름과 축이 반대)
        lat = float(raw["x_pos"])
        lng = float(raw["y_pos"])
    except (KeyError, TypeError, ValueError):
        logger.warning("타슈 응답 항목을 해석할 수 없어 건너뜁니다: %r", raw)
        return None

    if not name:
        return None
    # 대전 범위를 크게 벗어난 좌표는 축이 뒤집혀 온 경우이므로 보정한다.
    if not (33.0 <= lat <= 39.0 and 124.0 <= lng <= 132.0):
        if 33.0 <= lng <= 39.0 and 124.0 <= lat <= 132.0:
            logger.warning("좌표 축이 뒤바뀐 항목을 보정합니다: %s", name)
            lat, lng = lng, lat
        else:
            logger.warning("좌표 범위를 벗어난 항목을 건너뜁니다: %s (%s, %s)", name, lat, lng)
            return None

    try:
        available = int(raw.get("parking_count") or 0)
    except (TypeError, ValueError):
        available = 0

    return LiveStation(
        id=station_id,
        name=name,
        lat=lat,
        lng=lng,
        available_bikes=max(0, available),
        address=(str(raw["address"]).strip() if raw.get("address") else None),
    )


async def _request_stations() -> list[LiveStation] | None:
    """공공 API 호출. 실패하면 None 을 돌려주고 예외를 밖으로 내보내지 않는다."""
    if not has_tashu_key():
        return None

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            res = await client.get(TASHU_API_URL, headers={"api-token": TASHU_API_KEY})
            res.raise_for_status()
            payload = res.json()
    except httpx.HTTPStatusError as exc:
        logger.warning("타슈 API 응답 오류: %s", exc.response.status_code)
        return None
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("타슈 API 호출 실패: %s", exc)
        return None

    results = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(results, list):
        logger.warning("타슈 API 응답에 results 배열이 없습니다.")
        return None

    stations = [s for s in (_parse_station(r) for r in results if isinstance(r, dict)) if s]
    if not stations:
        logger.warning("타슈 API 응답에서 유효한 대여소를 찾지 못했습니다.")
        return None

    logger.info("타슈 실시간 대여소 %d곳을 불러왔습니다.", len(stations))
    return stations


async def get_live_stations() -> list[LiveStation] | None:
    """실시간 대여소 목록. 키가 없거나 호출이 실패하면 None (호출자가 seed 로 폴백)."""
    return await _cache.get()


def cache_age_seconds() -> float | None:
    return _cache.age_seconds


def clear_cache() -> None:
    _cache.clear()
