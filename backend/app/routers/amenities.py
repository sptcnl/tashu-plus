"""편의시설 위치 핀 (화장실 / 음수대 / 바람주입 / 맛집).

카카오 로컬 검색으로 실제 POI 를 가져오고, 키가 없거나 실패하면 seed 로 폴백한다.
대여소와 별개로 자체 좌표를 가진 시설을 지도에 독립 핀으로 뿌리기 위한 엔드포인트.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import AmenityKind, AmenityListOut, AmenityOut
from ..services.amenities import get_amenities

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.get(
    "",
    response_model=AmenityListOut,
    summary="편의시설 위치 핀 (카카오 실시간, 실패 시 seed)",
)
async def list_amenities(
    kind: AmenityKind | None = Query(None, description="종류로 필터 (미지정 시 전체)"),
    db: Session = Depends(get_db),
):
    views, source = await get_amenities(db, kind)
    return AmenityListOut(
        source=source,
        count=len(views),
        # 카카오 결과에는 DB id 가 없으므로 응답 순번으로 안정적인 id 를 매긴다.
        amenities=[
            AmenityOut(
                id=index + 1,
                kind=view.kind,
                name=view.name,
                lat=view.lat,
                lng=view.lng,
                description=view.description,
            )
            for index, view in enumerate(views)
        ],
    )
