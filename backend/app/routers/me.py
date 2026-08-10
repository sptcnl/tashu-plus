from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Post, RideHistory, User
from ..schemas import ActivityOut, PostOut, RideHistoryOut, UserOut
from ..seed import DEMO_USER_ID

router = APIRouter(prefix="/me", tags=["me"])

LEVEL_TITLES = {1: "타슈 새싹", 2: "타슈 라이더", 3: "타슈 지킴이", 4: "타슈 마스터"}
POINTS_PER_LEVEL = 4000  # 레벨 진행바 기준 (데모용)
BADGE_POST_TARGET = 6  # 모범 라이더 배지 획득 기준 글 수


def _demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user is None:
        raise HTTPException(status_code=404, detail="데모 유저가 없습니다.")
    return user


@router.get("", response_model=UserOut, summary="내 정보 (데모 유저 고정)")
def get_me(db: Session = Depends(get_db)):
    user = _demo_user(db)
    return UserOut(
        id=user.id,
        name=user.name,
        level=user.level,
        points=user.points,
        level_title=LEVEL_TITLES.get(user.level, "타슈 라이더"),
        next_level_points=POINTS_PER_LEVEL,
    )


@router.get("/rides", response_model=list[RideHistoryOut], summary="이용 내역")
def get_rides(db: Session = Depends(get_db)):
    stmt = select(RideHistory).order_by(RideHistory.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/activity", response_model=ActivityOut, summary="커뮤니티 활동")
def get_activity(db: Session = Depends(get_db)):
    user = _demo_user(db)
    posts = db.scalars(
        select(Post).where(Post.author == user.name).order_by(Post.created_at.desc())
    ).all()
    total_likes = sum(p.likes for p in posts)
    return ActivityOut(
        posts=[PostOut.model_validate(p) for p in posts],
        total_posts=len(posts),
        total_likes=total_likes,
        # PLACEHOLDER: 댓글 모델이 아직 없어서 게시글 수 기반 mock 값
        total_comments=len(posts) * 2,
        ranking=12,
        posts_to_badge=max(0, BADGE_POST_TARGET - len(posts)),
    )
