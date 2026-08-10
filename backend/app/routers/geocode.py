"""장소명 → 좌표 변환.

경로 비교(/routes/compare)가 좌표를 받도록 바뀌었으므로, 화면의 출발/도착 텍스트
입력을 좌표로 바꿔줄 곳이 필요하다. 카카오 키가 있으면 키워드 검색을 쓰고,
없으면 거점 이름 매칭으로 폴백해서 키 없이도 데모가 돌아가게 한다.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import has_kakao_key
from ..database import get_db
from ..schemas import GeocodeOut
from ..services.kakao import search_keyword
from ..services.stations import get_stations

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("", response_model=GeocodeOut, summary="장소명으로 좌표 찾기")
async def geocode(
    query: str = Query(..., min_length=1, description="장소명 또는 주소"),
    db: Session = Depends(get_db),
):
    hit = await search_keyword(query)
    if hit:
        return GeocodeOut(source="kakao", **hit)

    # 폴백: 거점 이름으로 매칭 (공백 제거 후 부분 일치)
    views, _ = await get_stations(db)
    needle = query.replace(" ", "")
    for view in views:
        name = view.name.replace(" ", "")
        if name == needle or needle in name or name in needle:
            return GeocodeOut(
                source="station",
                name=f"{view.name} 거점",
                address=view.address or "",
                lat=view.lat,
                lng=view.lng,
            )

    # 왜 못 찾았는지 구분해서 알려준다. 키가 없으면 거점 이름만 검색되기 때문에
    # 사용자가 "왜 일반 장소가 안 되는지" 알 수 있어야 한다.
    if not has_kakao_key():
        examples = ", ".join(v.name for v in views[:4])
        raise HTTPException(
            status_code=404,
            detail=(
                f"'{query}' 을(를) 찾을 수 없어요. 카카오 REST 키(KAKAO_REST_KEY)가 없어서 "
                f"거점 이름만 검색됩니다. 예: {examples}"
            ),
        )

    raise HTTPException(
        status_code=404, detail=f"'{query}' 검색 결과가 없어요. 다른 이름으로 시도해보세요."
    )
