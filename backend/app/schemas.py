"""Pydantic v2 스키마."""

from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

KST = timezone(timedelta(hours=9))


def _to_kst(value: datetime) -> str:
    """KST 오프셋이 붙은 ISO 문자열로 직렬화.

    SQLite 는 tz 정보를 버리고 naive 값을 돌려주므로, naive 는 UTC 로 간주한다.
    오프셋을 명시해야 브라우저가 로컬 타임존으로 잘못 해석하지 않는다.
    """
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(KST).isoformat()


# 응답에 쓰는 datetime 은 전부 이 타입을 통해 KST 로 내려간다.
KSTDateTime = Annotated[datetime, PlainSerializer(_to_kst, return_type=str)]

ReportCategory = Literal["공사구간", "불법주정차", "도로파손", "조명없음"]
ReportStatus = Literal["접수", "처리중", "완료"]
MissionStatus = Literal["대기", "진행중", "완료"]
Board = Literal["코스공유", "거점정보", "모범라이더", "자유"]
DataSource = Literal["live", "seed"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- 좌표 / 거점


class LatLng(BaseModel):
    lat: float
    lng: float


class StationOut(ORMModel):
    id: int
    name: str
    lat: float
    lng: float
    available_bikes: int
    rack_count: int  # 공공 API 에 없어 우리 DB(StationFacility)에서 채운 값 (0 = 미등록)
    has_toilet: bool
    has_water: bool
    has_pump: bool
    nearby_spots: list[str] = []
    address: str | None = None
    density: str  # 과잉 / 적정 / 부족
    fill_ratio: float | None = None  # 거치대 대비 잔여 비율 (거치대 미등록이면 None)


class StationListOut(BaseModel):
    """source 로 실시간/데모 데이터를 구분해 프론트가 뱃지를 띄울 수 있게 한다."""

    source: DataSource
    count: int
    cache_age_seconds: float | None = None
    stations: list[StationOut]


class NearbyStationOut(StationOut):
    distance_m: float


class NearbyListOut(BaseModel):
    source: DataSource
    count: int
    stations: list[NearbyStationOut]


class GeocodeOut(BaseModel):
    """경로 화면의 출발/도착 텍스트를 좌표로 바꾼 결과."""

    source: Literal["kakao", "station"]
    name: str
    address: str = ""
    lat: float
    lng: float


# ---------------------------------------------------------------- 경로 비교


class RouteSegment(BaseModel):
    mode: str  # 도보 / 자전거 / 버스 / 지하철
    description: str
    duration_min: int
    distance_m: int = 0
    path: list[LatLng] = []


class StationBrief(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    available_bikes: int
    rack_count: int


class RouteOption(BaseModel):
    key: Literal["tashu", "transit", "walk"]
    mode: str  # "타슈 + 도보" / "버스" / "도보"
    total_min: int
    distance_m: int = 0
    cost: int
    recommended: bool = False
    summary: str
    segments: list[RouteSegment] = []
    polyline: list[LatLng] = []
    transfers: int = 0
    # 타슈 카드 전용
    waypoints: list[str] = []
    from_station: StationBrief | None = None
    to_station: StationBrief | None = None
    danger_count: int = 0


class RouteCompareOut(BaseModel):
    origin: str
    destination: str
    origin_coord: LatLng
    destination_coord: LatLng
    source: Literal["kakao", "mock"]
    options: list[RouteOption]


# ---------------------------------------------------------------- Report


class ReportCreate(BaseModel):
    category: ReportCategory
    description: str = ""
    lat: float
    lng: float


class ReportOut(ORMModel):
    id: int
    category: str
    description: str
    lat: float
    lng: float
    status: str
    created_at: KSTDateTime


# ---------------------------------------------------------------- Mission


class MissionOut(ORMModel):
    id: int
    from_station_id: int
    to_station_id: int
    from_station_name: str
    to_station_name: str
    distance_km: float
    reward_points: int
    status: str


class MissionActionOut(ORMModel):
    mission: MissionOut
    user_points: int
    message: str


# ---------------------------------------------------------------- Post


class PostCreate(BaseModel):
    board: Board
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=1000)
    author: str | None = None  # 미지정 시 데모 유저 이름으로 채운다


class PostOut(ORMModel):
    id: int
    board: str
    title: str
    content: str
    author: str
    likes: int
    created_at: KSTDateTime


# ---------------------------------------------------------------- User / me


class UserOut(ORMModel):
    id: int
    name: str
    level: int
    points: int
    level_title: str
    next_level_points: int


class RideHistoryOut(ORMModel):
    id: int
    from_station: str
    to_station: str
    duration_min: int
    cost: int
    created_at: KSTDateTime


class ActivityOut(ORMModel):
    posts: list[PostOut]
    total_posts: int
    total_likes: int
    total_comments: int
    ranking: int
    posts_to_badge: int


# ---------------------------------------------------------------- Notice


class NoticeOut(ORMModel):
    id: int
    title: str
    is_important: bool
    created_at: KSTDateTime
