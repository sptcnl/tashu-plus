from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Notice
from ..schemas import NoticeOut

router = APIRouter(prefix="/notices", tags=["notices"])


@router.get("", response_model=list[NoticeOut], summary="공지사항")
def list_notices(db: Session = Depends(get_db)):
    stmt = select(Notice).order_by(Notice.is_important.desc(), Notice.created_at.desc())
    return db.scalars(stmt).all()
