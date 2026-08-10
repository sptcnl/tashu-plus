from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Report
from ..schemas import ReportCreate, ReportOut
from ..seed import DEMO_USER_ID

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=201, summary="불편한 길 제보 등록")
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    report = Report(**payload.model_dump(), status="접수", user_id=DEMO_USER_ID)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[ReportOut], summary="전체 제보 목록 (지도 핀 표시용)")
def list_reports(
    status: str | None = Query(None, description="접수/처리중/완료 필터"),
    db: Session = Depends(get_db),
):
    stmt = select(Report).order_by(Report.created_at.desc())
    if status:
        stmt = stmt.where(Report.status == status)
    return db.scalars(stmt).all()


@router.get("/me", response_model=list[ReportOut], summary="내 제보 현황")
def list_my_reports(db: Session = Depends(get_db)):
    stmt = (
        select(Report)
        .where(Report.user_id == DEMO_USER_ID)
        .order_by(Report.created_at.desc())
    )
    return db.scalars(stmt).all()
