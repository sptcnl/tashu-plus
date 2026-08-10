"""타슈+ (Tashu Plus) 백엔드.

대전 공영자전거 타슈의 확장 서비스 프로토타입. 시민 리빙랩 발표용 데모이므로
인증 없이 데모 유저 1명(김나희)을 고정으로 사용한다.

외부 연동:
  - 타슈 실시간 대여소 현황 (TASHU_API_KEY)
  - 카카오맵 REST 경로 API (KAKAO_REST_KEY)
두 키 모두 없어도 seed/mock 으로 전체 화면이 동작한다.

문서: http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import has_kakao_key, has_tashu_key
from .database import Base, SessionLocal, engine
from .routers import geocode, me, missions, notices, posts, reports, routes, stations
from .seed import seed

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",  # vite preview
    "http://localhost",  # docker-compose 의 nginx
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)

    logger.info(
        "타슈 실시간 API: %s / 카카오 경로 API: %s",
        "사용" if has_tashu_key() else "키 없음 → seed 폴백",
        "사용" if has_kakao_key() else "키 없음 → mock 폴백",
    )
    yield


app = FastAPI(
    title="타슈+ API",
    description=(
        "대전 공영자전거 타슈 확장 서비스 프로토타입 (시민 리빙랩 데모)\n\n"
        "타슈 실시간 대여소 현황과 카카오맵 경로 API를 백엔드에서 프록시한다. "
        "키가 없으면 seed/mock 으로 폴백한다."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (stations, routes, geocode, reports, missions, posts, me, notices):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health", tags=["health"], summary="헬스체크 / 외부 연동 상태")
def health():
    return {
        "status": "ok",
        "service": "tashu-plus",
        "integrations": {
            # 키 값 자체는 절대 내려보내지 않고 설정 여부만 알려준다.
            "tashu_live": has_tashu_key(),
            "kakao_routes": has_kakao_key(),
        },
    }
