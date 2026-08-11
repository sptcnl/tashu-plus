"""외부 API 설정. 키가 없으면 예외를 던지지 않고 seed/mock 으로 동작한다."""

import os
from pathlib import Path

# backend/.env 를 읽어 환경변수로 채운다 (이미 셸에 설정된 값이 우선).
# 별도 의존성 없이 KEY=VALUE / # 주석 만 다루는 최소 파서.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def _load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return

    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export ") :].lstrip()
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # 실제 환경변수가 있으면 덮어쓰지 않는다.
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file(ENV_FILE)


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


# 공공데이터포털 "대전교통공사_공영자전거타슈대여소현황" 인증키.
# 발급: 타슈 앱 > 자전거정보 > Open API (data.go.kr 15119663 은 LINK 형 안내 페이지)
TASHU_API_KEY = _env("TASHU_API_KEY")

# 타슈 실시간 대여소 현황 엔드포인트.
# GET, 헤더 `api-token: <key>` 로 인증한다.
TASHU_API_URL = _env("TASHU_API_URL", "https://bikeapp.tashu.or.kr:50041/v1/openapi/station")

# 카카오 REST API 키 (도보/자전거/대중교통 경로 + 키워드 검색)
KAKAO_REST_KEY = _env("KAKAO_REST_KEY")

# 카카오맵 REST API 호스트 (2026-07-21 신규 추가된 경로 API 4종)
KAKAO_API_BASE = _env("KAKAO_API_BASE", "https://dapi.kakao.com")

# 공공 API 를 매 요청마다 때리지 않기 위한 인메모리 캐시 TTL
TASHU_CACHE_TTL_SECONDS = int(_env("TASHU_CACHE_TTL_SECONDS", "60"))

# 편의시설(화장실/음수대/바람주입/맛집) 카카오 검색 결과 캐시 TTL.
# POI 는 자주 바뀌지 않으므로 넉넉히 잡아 카카오 호출 수를 줄인다.
AMENITY_CACHE_TTL_SECONDS = int(_env("AMENITY_CACHE_TTL_SECONDS", "600"))

# 외부 API 타임아웃 (초)
HTTP_TIMEOUT_SECONDS = float(_env("HTTP_TIMEOUT_SECONDS", "5"))

# 제보가 경로 위 '위험구간' 으로 집계되는 거리 임계값 (미터)
DANGER_RADIUS_M = float(_env("DANGER_RADIUS_M", "200"))


def has_tashu_key() -> bool:
    return bool(TASHU_API_KEY)


def has_kakao_key() -> bool:
    return bool(KAKAO_REST_KEY)
