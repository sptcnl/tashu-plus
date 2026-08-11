"""시드 데이터. 앱 시작 시 테이블이 비어 있을 때만 삽입한다 (idempotent).

거점명/좌표는 대전 실제 지명 기준이고, 잔여 대수는 미션 화면의
'과잉 -> 부족' 서사가 성립하도록 맞춰둔 데모용 값이다.
"""

from datetime import timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Amenity,
    Mission,
    Notice,
    Post,
    Report,
    RideHistory,
    Station,
    StationFacility,
    User,
    _now,
)

DEMO_USER_ID = 1
KST = timezone(timedelta(hours=9))

# 거점 seed 폴백 (타슈 공공 API 키가 없을 때 지도에 그려지는 값)
# (name, lat, lng, bikes)
STATIONS = [
    ("갈마역", 36.3547, 127.3663, 9),
    ("시청", 36.3504, 127.3845, 1),
    ("탄방역", 36.3499, 127.3776, 7),
    ("둔산", 36.3540, 127.3785, 0),
    ("갑천", 36.3670, 127.3880, 8),
    ("월평", 36.3585, 127.3650, 2),
    ("신흥들삼거리", 36.3255, 127.4405, 7),
]

# 공공 API 가 주지 않는 우리 자체 데이터. 실시간 응답과 이름으로 조인된다.
# 실제 타슈 대여소 id 를 알게 되면 tashu_station_id 를 채워 정확 매칭으로 바꾸면 된다.
# (name, rack_count, toilet, water, pump, nearby_spots)
FACILITIES = [
    ("갈마역", 12, True, True, True, ["갈마시장 칼국수", "갈마동 카페거리"]),
    ("시청", 20, True, True, False, ["시청 앞 분식", "보라매공원"]),
    ("탄방역", 10, False, True, True, ["탄방동 곱창골목"]),
    ("둔산", 15, True, False, True, ["둔산동 맛집거리", "한밭수목원"]),
    ("갑천", 10, False, True, False, ["갑천 야경 포토존"]),
    ("월평", 14, True, True, False, ["월평동 국수집", "월평공원"]),
    ("신흥들삼거리", 8, True, True, False, ["신흥동 빵집"]),
]

# 지도에 독립 위치 핀으로 찍는 편의시설. 대여소와 별개 좌표를 가진다.
# (kind, name, lat, lng, description)
AMENITIES = [
    # 화장실
    ("화장실", "시청역 공중화장실", 36.3511, 127.3838, "1번 출구 앞, 24시간 개방"),
    ("화장실", "한밭수목원 화장실", 36.3668, 127.3881, "동원 입구 옆"),
    ("화장실", "갈마역 공중화장실", 36.3551, 127.3658, "2번 출구 지하"),
    # 음수대
    ("음수대", "보라매공원 음수대", 36.3496, 127.3861, "공원 중앙 광장"),
    ("음수대", "갑천 자전거길 음수대", 36.3656, 127.3866, "엑스포교 아래 쉼터"),
    ("음수대", "월평공원 음수대", 36.3601, 127.3621, "진입로 정자 옆"),
    # 바람주입
    ("바람주입", "둔산 자전거 공기주입기", 36.3538, 127.3792, "거점 옆 무료 셀프"),
    ("바람주입", "탄방역 공기주입기", 36.3502, 127.3773, "3번 출구 자전거보관소"),
    ("바람주입", "갈마역 공기주입기", 36.3545, 127.3669, "거치대 옆 기둥"),
    # 맛집
    ("맛집", "갈마시장 칼국수", 36.3540, 127.3651, "현지인 웨이팅 맛집"),
    ("맛집", "둔산동 맛집거리", 36.3561, 127.3806, "저녁 회식 상권"),
    ("맛집", "탄방동 곱창골목", 36.3493, 127.3761, "탄방역 도보 5분"),
]

# (from_name, to_name, distance_km, reward_points)
MISSIONS = [
    ("갈마역", "둔산", 1.2, 300),
    ("갑천", "월평", 0.8, 200),
    ("탄방역", "시청", 1.5, 350),
]

# (board, title, content, author, likes, days_ago)
POSTS = [
    (
        "코스공유",
        "갑천 야간 라이딩 코스 공유합니다",
        "갑천 거점에서 출발해 엑스포교까지 왕복 8km 코스예요. "
        "야간 조명이 잘 되어 있어서 초보도 부담 없습니다. 중간에 음수대 두 곳 있어요.",
        "김나희",
        24,
        2,
    ),
    (
        "거점정보",
        "둔산동 거점 근처 화장실 꿀정보",
        "둔산 거점 바로 뒤 상가 1층 화장실이 24시간 개방입니다. 바람주입기도 거점 옆에 있어요.",
        "병기",
        18,
        3,
    ),
    (
        "모범라이더",
        "이번 주 타슈 옮기기 랭킹 1위 후기",
        "출퇴근 경로에 미션 거점을 끼워 넣으니 일주일에 2,400P 모았습니다. 요령 공유합니다.",
        "미순",
        31,
        4,
    ),
    (
        "모범라이더",
        "타슈 옮기기 미션 3주 후기",
        "과잉 거점에서 부족 거점으로 옮기는 미션만 골라서 3주 했더니 레벨이 두 단계 올랐어요.",
        "김나희",
        12,
        9,
    ),
    (
        "거점정보",
        "둔산동 바람주입기 위치 공유",
        "둔산 거점 왼쪽 기둥 옆에 있습니다. 게이지가 살짝 뻑뻑하니 천천히 눌러주세요.",
        "김나희",
        9,
        14,
    ),
    (
        "자유",
        "비 오는 날 타슈 타는 분 계신가요?",
        "우비 입고 타면 생각보다 괜찮던데 브레이크 밀림은 조심하셔야 합니다.",
        "정우",
        6,
        5,
    ),
]

# (category, description, lat, lng, status, days_ago)
REPORTS = [
    ("공사구간", "도안동로 트램 공사 구간", 36.3452, 127.3402, "처리중", 3),
    ("불법주정차", "원신흥북로 자전거도로 점거", 36.3401, 127.3345, "완료", 6),
    ("도로파손", "갑천변 자전거길 포트홀", 36.3661, 127.3872, "완료", 12),
    ("조명없음", "월평공원 진입로 가로등", 36.3590, 127.3611, "접수", 20),
]

# (from, to, duration_min, cost, days_ago, hour, minute)
RIDES = [
    ("갈마역 거점", "시청 거점", 24, 0, 1, 18, 32),
    ("둔산 거점", "갑천 거점", 41, 500, 2, 9, 15),
    ("시청 거점", "탄방역 거점", 18, 0, 4, 20, 4),
    ("월평 거점", "갈마역 거점", 15, 0, 6, 8, 50),
    ("갑천 거점", "둔산 거점", 33, 0, 8, 19, 12),
]

# (title, is_important, days_ago)
NOTICES = [
    ("트램 2호선 공사구간 우회 안내", True, 1),
    ("갑천 거점 임시 이전 안내 (8/15~8/20)", False, 3),
    ("타슈 옮기기 미션 보상 정책 변경", False, 10),
    ("여름철 자전거 안전 점검 캠페인", False, 17),
    ("앱 v2.4.1 업데이트 안내", False, 24),
]


def seed(db: Session) -> None:
    if db.scalar(select(User).limit(1)) is None:
        db.add(User(id=DEMO_USER_ID, name="김나희", level=3, points=2500))

    if db.scalar(select(Station).limit(1)) is None:
        for name, lat, lng, bikes in STATIONS:
            db.add(Station(name=name, lat=lat, lng=lng, available_bikes=bikes))
        db.flush()

    if db.scalar(select(StationFacility).limit(1)) is None:
        for name, racks, toilet, water, pump, spots in FACILITIES:
            db.add(
                StationFacility(
                    name=name,
                    rack_count=racks,
                    has_toilet=toilet,
                    has_water=water,
                    has_pump=pump,
                    nearby_spots=spots,
                )
            )

    if db.scalar(select(Amenity).limit(1)) is None:
        for kind, name, lat, lng, description in AMENITIES:
            db.add(Amenity(kind=kind, name=name, lat=lat, lng=lng, description=description))

    if db.scalar(select(Mission).limit(1)) is None:
        by_name = {s.name: s.id for s in db.scalars(select(Station)).all()}
        for from_name, to_name, km, points in MISSIONS:
            db.add(
                Mission(
                    from_station_id=by_name[from_name],
                    to_station_id=by_name[to_name],
                    distance_km=km,
                    reward_points=points,
                    status="대기",
                )
            )

    if db.scalar(select(Post).limit(1)) is None:
        for board, title, content, author, likes, days in POSTS:
            db.add(
                Post(
                    board=board,
                    title=title,
                    content=content,
                    author=author,
                    likes=likes,
                    created_at=_now() - timedelta(days=days),
                )
            )

    if db.scalar(select(Report).limit(1)) is None:
        for category, desc, lat, lng, status, days in REPORTS:
            db.add(
                Report(
                    category=category,
                    description=desc,
                    lat=lat,
                    lng=lng,
                    status=status,
                    created_at=_now() - timedelta(days=days),
                    user_id=DEMO_USER_ID,
                )
            )

    if db.scalar(select(RideHistory).limit(1)) is None:
        for from_s, to_s, duration, cost, days, hour, minute in RIDES:
            # hour/minute 은 KST 기준 벽시계 시각이므로 KST 로 만든 뒤 UTC 로 저장한다.
            created = (
                (_now().astimezone(KST) - timedelta(days=days))
                .replace(hour=hour, minute=minute, second=0, microsecond=0)
                .astimezone(timezone.utc)
            )
            db.add(
                RideHistory(
                    from_station=from_s,
                    to_station=to_s,
                    duration_min=duration,
                    cost=cost,
                    created_at=created,
                )
            )

    if db.scalar(select(Notice).limit(1)) is None:
        for title, important, days in NOTICES:
            db.add(
                Notice(
                    title=title,
                    is_important=important,
                    created_at=_now() - timedelta(days=days),
                )
            )

    db.commit()
