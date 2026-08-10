"""SQLAlchemy 2.0 ORM 모델."""

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Station(Base):
    """거점 seed 폴백 테이블.

    타슈 공공 API 키가 없거나 호출이 실패했을 때 이 값으로 지도를 그린다.
    실시간 모드에서는 공공 API 응답이 이 테이블을 대체한다.
    편의시설/거치대 수는 공공 API 에 없으므로 StationFacility 에서 조인한다.
    """

    __tablename__ = "stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    available_bikes: Mapped[int] = mapped_column(Integer, default=0)


class StationFacility(Base):
    """공공 API 가 주지 않는 우리 자체 데이터 (거치대 수 + 편의시설 + 주변 스팟).

    실시간 응답과 붙이는 키:
      1) tashu_station_id 가 채워져 있으면 그 id 로 정확히 매칭
      2) 없으면 이름 정규화 매칭 (공공 API 의 대여소명과 표기가 다를 수 있어 부분 일치 허용)
    실제 타슈 대여소 id 는 키를 발급받아 한 번 조회한 뒤 채워 넣으면 된다.
    """

    __tablename__ = "station_facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tashu_station_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    rack_count: Mapped[int] = mapped_column(Integer, default=0)
    has_toilet: Mapped[bool] = mapped_column(Boolean, default=False)
    has_water: Mapped[bool] = mapped_column(Boolean, default=False)
    has_pump: Mapped[bool] = mapped_column(Boolean, default=False)
    nearby_spots: Mapped[list] = mapped_column(JSON, default=list)


class Report(Base):
    """불편한 길 제보. category: 공사구간/불법주정차/도로파손/조명없음."""

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(10), default="접수")  # 접수/처리중/완료
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    # 인증이 없는 데모지만 GET /reports/me 를 구분하려면 작성자 키가 필요해서 추가.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class Mission(Base):
    """자전거 재배치(타슈 옮기기) 미션. status: 대기/진행중/완료."""

    __tablename__ = "missions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    from_station_id: Mapped[int] = mapped_column(ForeignKey("stations.id"), nullable=False)
    to_station_id: Mapped[int] = mapped_column(ForeignKey("stations.id"), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    reward_points: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(10), default="대기")

    from_station: Mapped["Station"] = relationship(foreign_keys=[from_station_id], lazy="joined")
    to_station: Mapped["Station"] = relationship(foreign_keys=[to_station_id], lazy="joined")


class Post(Base):
    """커뮤니티 게시글. board: 코스공유/거점정보/모범라이더/자유."""

    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    board: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(40), default="익명")
    likes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class User(Base):
    """데모 유저 1명 고정 (김나희 / Lv.3 / 2500P). 인증 없음."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1)
    points: Mapped[int] = mapped_column(Integer, default=0)


class RideHistory(Base):
    """이용 내역. 거점명을 문자열로 스냅샷 저장한다."""

    __tablename__ = "ride_histories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    from_station: Mapped[str] = mapped_column(String(80), nullable=False)
    to_station: Mapped[str] = mapped_column(String(80), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
