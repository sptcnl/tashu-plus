"""DB 엔진 / 세션 설정.

개발 기본값은 SQLite 파일이고, docker-compose 에서는 DATABASE_URL 환경변수로
PostgreSQL 16 으로 교체된다. (예: postgresql+psycopg://tashu:tashu@db:5432/tashu)
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tashu.db")

# SQLite 는 기본적으로 스레드 간 커넥션 공유를 막기 때문에 옵션을 풀어준다.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
