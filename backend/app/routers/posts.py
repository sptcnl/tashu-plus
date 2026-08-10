from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Post, User
from ..schemas import PostCreate, PostOut
from ..seed import DEMO_USER_ID

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=list[PostOut], summary="게시글 목록 (board 미지정 시 인기순)")
def list_posts(
    board: str | None = Query(None, description="코스공유/거점정보/모범라이더/자유"),
    db: Session = Depends(get_db),
):
    stmt = select(Post)
    if board:
        stmt = stmt.where(Post.board == board).order_by(Post.created_at.desc())
    else:
        # 게시판 미지정 = 커뮤니티 '인기' 탭
        stmt = stmt.order_by(Post.likes.desc(), Post.created_at.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=PostOut, status_code=201, summary="글쓰기")
def create_post(payload: PostCreate, db: Session = Depends(get_db)):
    author = payload.author
    if not author:
        user = db.get(User, DEMO_USER_ID)
        author = user.name if user else "익명"

    post = Post(
        board=payload.board,
        title=payload.title,
        content=payload.content,
        author=author,
        likes=0,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.post("/{post_id}/like", response_model=PostOut, summary="좋아요")
def like_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    post.likes += 1
    db.commit()
    db.refresh(post)
    return post
