# 타슈+ (Tashu Plus)

대전 공영자전거 **타슈**의 확장 서비스 풀스택 프로토타입입니다.
시민 리빙랩 발표용 데모이므로 인증 없이 데모 유저 1명(김나희 / Lv.3 / 2,500P)을 고정으로 사용합니다.

- **거점 지도**: 카카오맵 + 타슈 실시간 잔여 대수 + 화장실·음수대·바람주입기·주변 맛집 정보
- **이동수단 비교**: 카카오 경로 API로 타슈 / 버스 / 도보를 비교 (거점 경유지 + 위험구간 표시)
- **불편한 길 제보**: 공사구간·불법주정차·도로파손·조명없음을 지도에 실시간 반영
- **타슈 옮기기(=배달)**: 자전거 과잉 거점 → 부족 거점 재배치 미션과 포인트 보상
- **커뮤니티**: 코스 공유 / 거점 정보 / 모범 라이더 게시판

레이아웃은 [Figma 와이어프레임](https://www.figma.com/design/VgtVgvPy7Jm6lokA3LTk2p)의 14개 프레임을 기준으로 구현했습니다.

> **키 없이도 전체 데모가 동작합니다.**
> 타슈/카카오 키가 없으면 거점은 seed 데이터(`source: "seed"`), 경로는 직선거리 기반
> 추정치(`source: "mock"`), 지도는 CSS 폴백(`MapFallback`)으로 자동 전환됩니다.
> 화면에도 `데모 데이터` / `추정 경로` 뱃지가 떠서 실데이터와 구분됩니다.

---

## 레포 구조

```
tashu-plus/
├── frontend/            # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api.ts           # fetch 래퍼 (VITE_API_URL)
│   │   ├── types.ts         # 백엔드 스키마와 1:1 대응 타입
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── StationMap.tsx   # 카카오맵 거점/제보 마커
│   │   │   │   ├── RouteMap.tsx     # 경로 polyline 미니 지도
│   │   │   │   ├── DensityMap.tsx   # 집중도 원형 오버레이
│   │   │   │   └── MapFallback.tsx  # SDK 실패 시 CSS placeholder
│   │   │   └── ...          # Screen, TabBar, Drawer, ChipScroller, Toast, ui
│   │   ├── lib/             # 포맷 헬퍼, useAsync, useKakaoLoader
│   │   └── pages/           # 화면 14개
│   ├── Dockerfile           # 빌드 후 nginx serve
│   └── nginx.conf           # SPA 폴백 + /api 프록시
├── backend/             # FastAPI + SQLAlchemy 2.0 + Pydantic v2
│   ├── app/
│   │   ├── main.py          # 앱 생성, CORS, 라우터 등록, 시작 시 seed
│   │   ├── config.py        # 외부 API 키/URL (없으면 폴백)
│   │   ├── database.py      # 엔진/세션 (DATABASE_URL)
│   │   ├── models.py        # ORM 모델 8개
│   │   ├── schemas.py       # 요청/응답 스키마
│   │   ├── seed.py          # 시드 데이터
│   │   ├── services/
│   │   │   ├── tashu.py     # 타슈 실시간 프록시 + TTL 60초 캐시
│   │   │   ├── kakao.py     # 카카오 도보/자전거/대중교통 경로 + 키워드 검색
│   │   │   ├── stations.py  # 실시간(또는 seed) + 편의시설 병합
│   │   │   └── geo.py       # haversine, 점-폴리라인 최단거리
│   │   └── routers/         # 도메인별 라우터
│   └── Dockerfile
├── docker-compose.yml   # postgres + backend + frontend
└── README.md
```

---

## 환경변수 / API 키 발급

키는 전부 **선택**입니다. 없으면 해당 기능만 폴백으로 내려가고 나머지는 그대로 동작합니다.

| 변수 | 위치 | 없을 때 동작 |
| --- | --- | --- |
| `VITE_KAKAO_JS_KEY` | `frontend/.env` | 지도가 CSS 폴백(`MapFallback`)으로 렌더 |
| `TASHU_API_KEY` | `backend/.env` | `/api/stations` 가 seed 반환, `source: "seed"` |
| `KAKAO_REST_KEY` | `backend/.env` | `/api/routes/compare` 가 직선거리 mock (`source: "mock"`) + **`/api/geocode` 가 거점 이름만 검색** |

템플릿을 복사해서 채우세요. `backend/.env` 는 앱이 시작할 때 자동으로 읽습니다
(셸에 이미 설정된 환경변수가 있으면 그 값이 우선).

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

> **JS 키와 REST 키는 서로 다릅니다.** 같은 카카오 앱에서 두 개를 각각 복사해야 합니다.
> JS 키만 넣으면 지도는 뜨지만, 경로 화면에서 일반 장소명을 검색할 수 없습니다
> (지오코딩은 백엔드에서 REST 키로 처리하기 때문입니다).
> 이때는 경로 화면의 **거점 자동완성 목록**으로 출발/도착을 고를 수 있습니다.

### 1) 카카오 키 (`VITE_KAKAO_JS_KEY`, `KAKAO_REST_KEY`)

1. <https://developers.kakao.com> 로그인 → **내 애플리케이션** → 애플리케이션 추가
2. **앱 설정 > 앱 키** 에서 두 개를 복사
   - **JavaScript 키** → `frontend/.env` 의 `VITE_KAKAO_JS_KEY` (지도 렌더링)
   - **REST API 키** → backend 의 `KAKAO_REST_KEY` (경로/키워드 검색)
3. ⚠️ **플랫폼 도메인 등록이 필수입니다.** 등록하지 않으면 지도가 뜨지 않습니다.
   **앱 설정 > 플랫폼 > Web > 사이트 도메인** 에 아래를 추가하세요.
   - 로컬 개발: `http://localhost:5173`
   - docker compose: `http://localhost`
   - **배포할 때는 실제 배포 도메인도 같은 화면에 반드시 추가 등록해야 합니다.**
     (라즈베리파이에 올려 외부에서 접속한다면 그 주소/도메인도 등록 대상입니다.)

2026-07-21부터 카카오맵 API는 별도 신청·심사 없이 바로 사용할 수 있습니다.
경로 API 3종은 이때 새로 추가된 것들입니다.

- 도보 `GET https://dapi.kakao.com/v2/routing/walk`
- 자전거 `GET https://dapi.kakao.com/v2/routing/bicycle`
- 대중교통 `GET https://dapi.kakao.com/v2/routing/publictraffic`
- 인증 `Authorization: KakaoAK <REST_API_KEY>`
- 좌표는 **x = 경도, y = 위도**, `totalTime` 은 초, `totalDistance` 는 미터, 성공은 `status: "OK"`

> `status: "SAME_POINT"` 는 오류가 아니라 "출발지 = 도착지" 입니다. 도착지를 거점으로 고르면
> 거점→목적지 도보 구간이 0m 가 되어 실제로 자주 발생합니다. 백엔드는 이 응답을
> **0분 구간**으로 처리하고, 25m 이내 구간은 API 를 아예 호출하지 않습니다.
> (이걸 실패로 취급하면 타슈 카드 전체가 mock 으로 떨어집니다.)

### 2) 타슈 실시간 대여소 키 (`TASHU_API_KEY`)

공공데이터포털의 [대전교통공사_공영자전거타슈대여소현황](https://www.data.go.kr/data/15119663/openapi.do)
페이지는 **LINK 형 안내 페이지**라서 거기서는 키가 발급되지 않습니다.

1. **타슈 앱**을 실행합니다.
2. **자전거정보 > Open API** 메뉴에서 OpenAPI 사용을 신청합니다.
3. 발급받은 인증키를 backend 의 `TASHU_API_KEY` 에 넣습니다.

호출 규격 (백엔드가 이 형식으로 프록시합니다):

```
GET https://bikeapp.tashu.or.kr:50041/v1/openapi/station
헤더: api-token: <발급키>

{ "count": 12, "next": null, "previous": null,
  "results": [ { "id": 1, "name": "대여소명", "name_en": "...", "name_cn": "...",
                 "x_pos": "36.3504",   // 위도 (필드 이름과 축이 반대!)
                 "y_pos": "127.3845",  // 경도
                 "address": "...", "parking_count": 5 } ] }
```

> 일일 호출 한도가 있어서 백엔드가 **TTL 60초 인메모리 캐시**를 두고,
> 프론트는 절대 이 API를 직접 부르지 않습니다(키 노출 방지). 모든 호출은 백엔드 경유입니다.

**타슈 키가 없으면 경로 추천 품질이 낮습니다.** seed 거점이 7곳뿐이라 목적지 근처에
거점이 없을 수 있고, 그러면 "가장 가까운 거점" 이 멀리 잡혀 도보 구간이 길게 나옵니다
(예: 서대전역 목적지 → 신흥들삼거리 거점 반납 + 도보 65분). 실제 키를 넣으면 대전 전역
대여소에서 고르므로 자연스러운 경로가 나옵니다.

---

## 실행 방법 1 — 로컬 개발 (uvicorn + npm run dev)

터미널 두 개가 필요합니다.

### 백엔드 (http://localhost:8000)

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# 실시간 연동을 쓰려면 키를 먼저 넣어주세요 (없으면 그냥 seed/mock 으로 동작합니다)
#   PowerShell: $env:TASHU_API_KEY="..."; $env:KAKAO_REST_KEY="..."
#   bash:       export TASHU_API_KEY=... KAKAO_REST_KEY=...

uvicorn app.main:app --reload
```

기동 로그에 연동 상태가 찍힙니다.

```
INFO app.main: 타슈 실시간 API: 사용 / 카카오 경로 API: 사용
INFO app.main: 타슈 실시간 API: 키 없음 → seed 폴백 / 카카오 경로 API: 키 없음 → mock 폴백
```

`GET /api/health` 로도 확인할 수 있습니다 (키 값 자체는 내려보내지 않고 설정 여부만).

```json
{ "status": "ok", "integrations": { "tashu_live": true, "kakao_routes": true } }
```

- DB는 기본값으로 SQLite 파일(`backend/tashu.db`)을 씁니다. 별도 설치가 필요 없습니다.
- 서버가 처음 뜰 때 테이블을 만들고 시드 데이터를 자동으로 넣습니다 (이미 있으면 건너뜁니다).
- 시드를 처음부터 다시 넣으려면 서버를 끄고 `backend/tashu.db` 를 삭제한 뒤 다시 실행하세요.

**API 문서 (Swagger UI): http://localhost:8000/docs**
(ReDoc: http://localhost:8000/redoc · OpenAPI JSON: http://localhost:8000/openapi.json)

### 프론트엔드 (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

API 주소를 바꾸려면 `frontend/.env` 를 만들어 주세요 (기본값 `http://localhost:8000`):

```bash
cp .env.example .env
```

---

## 실행 방법 2 — Docker Compose

```bash
docker compose up --build
```

| 서비스 | 주소 | 설명 |
| --- | --- | --- |
| frontend | http://localhost | 빌드된 정적 파일을 nginx 가 serve |
| backend | http://localhost:8000 | FastAPI (`/docs` 로 API 문서) |
| db | (내부) | PostgreSQL 16 |

- 이 구성에서는 `DATABASE_URL=postgresql+psycopg://tashu:tashu@db:5432/tashu` 가 주입되어 **SQLite 대신 PostgreSQL 16** 을 사용합니다.
- 프론트는 `VITE_API_URL=""` 로 빌드되어 같은 오리진의 `/api` 로 요청하고, nginx 가 backend 컨테이너로 프록시합니다.
- 사용 이미지(`postgres:16-alpine`, `python:3.12-slim`, `node:22-alpine`, `nginx:1.27-alpine`)는 모두 **linux/arm64** 를 지원해 라즈베리파이에서도 그대로 빌드됩니다.
- 데이터를 초기화하려면: `docker compose down -v`

---

## API 요약

모든 엔드포인트는 `/api` 프리픽스를 사용합니다.

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/stations` | 거점 목록 (타슈 실시간, 실패 시 seed — `source` 로 구분) |
| GET | `/api/stations/nearby?lat=&lng=&radius=` | 주변 거점 (haversine 거리순, `distance_m` 포함) |
| GET | `/api/stations/{id}` | 거점 상세 |
| GET | `/api/routes/compare?from_lat=&from_lng=&to_lat=&to_lng=` | 타슈/버스/도보 비교 (polyline 포함) |
| GET | `/api/geocode?query=` | 장소명 → 좌표 (카카오 키워드 검색, 없으면 거점명 매칭) |
| POST | `/api/reports` | 제보 등록 |
| GET | `/api/reports` | 전체 제보 (지도 핀용, `?status=` 필터) |
| GET | `/api/reports/me` | 내 제보 현황 |
| GET | `/api/missions` | 타슈 옮기기 미션 목록 |
| POST | `/api/missions/{id}/accept` | 미션 수락 (대기 → 진행중) |
| POST | `/api/missions/{id}/complete` | 미션 완료 (진행중 → 완료, 포인트 적립) |
| GET | `/api/posts?board=` | 게시글 목록 (board 미지정 시 좋아요순 = 인기) |
| POST | `/api/posts` | 글쓰기 |
| POST | `/api/posts/{id}/like` | 좋아요 |
| GET | `/api/me` | 내 정보 (데모 유저 고정) |
| GET | `/api/me/rides` | 이용 내역 |
| GET | `/api/me/activity` | 커뮤니티 활동 |
| GET | `/api/notices` | 공지사항 |
| GET | `/api/health` | 헬스체크 |

### 데모에서 데이터가 실제로 이어지는 지점

- **제보 → 홈 지도**: `POST /api/reports` 후 홈의 `GET /api/reports` 가 새 빨간 마커를 그립니다.
- **제보 → 경로 비교 위험구간**: 미처리(접수·처리중) 제보가 타슈 **polyline 에서 200m 이내**에
  있을 때만 `danger_count` 로 집계됩니다 (`DANGER_RADIUS_M` 으로 조절). 경로에서 먼 제보는
  세지 않습니다.
- **실시간 잔여 대수 → 경로 카드**: 타슈 카드의 대여 거점은 `available_bikes >= 1` 인 곳,
  반납 거점은 `available_bikes < rack_count` 인 곳 중 각각 가장 가까운 거점을 고릅니다.
  카드에 "○○ 대여 가능 N대 · △△ 거치 여유 N칸" 이 실시간 값으로 표시됩니다.
- **실시간 잔여 대수 → 집중도 지도**: 거치대 대비 잔여 비율로 과잉(70% 이상, 빨강) /
  부족(20% 이하, 파랑) / 적정(초록)을 계산합니다.
- **미션 완료 → 포인트**: 완료 시 유저 포인트가 올라가고, 미션 화면 카드와 사이드 드로어 포인트가 함께 갱신됩니다.
- **글쓰기 → 커뮤니티 목록 / 내 활동**: 새 글이 목록과 `내 활동`의 글 수·배지 진행도에 반영됩니다.

### 좌표 축 주의사항

두 외부 API가 축 이름을 **반대로** 씁니다. 실수하기 쉬운 지점이라 코드에도 주석을 달아두었습니다.

| API | x | y |
| --- | --- | --- |
| 타슈 (`x_pos` / `y_pos`) | **위도(lat)** | **경도(lng)** |
| 카카오 (`start_x` / `path.points`) | **경도(lng)** | **위도(lat)** |

내부 스키마와 API 응답은 혼동을 막기 위해 전부 `{ "lat": .., "lng": .. }` 형태로 정규화합니다.
타슈 응답이 대전 좌표 범위를 벗어나면 축이 뒤집힌 것으로 보고 자동 보정합니다.

---

## 화면 (라우트)

| 경로 | 화면 | 하단 탭바 |
| --- | --- | --- |
| `/` | 홈 — 카카오맵, 거점 마커, 검색바, 필터 칩, 플로팅 버튼, 거점 카드 | ✅ |
| `/route` | 경로 비교 — 타슈+도보 / 버스 / 도보 (+ polyline 미니 지도) | ✅ |
| `/report` | 불편한 길 제보 (지도 클릭으로 위치 지정) | ✅ |
| `/mission` | 타슈 옮기기 — 포인트, 미션, 집중도 지도 (`배달` 탭이 여기로 연결) | ✅ |
| `/community` | 커뮤니티 — 인기 / 코스 공유 / 모범 라이더 | ✅ |
| `/write` | 글쓰기 | — |
| `/pass` | 이용권 구매·조회 | — |
| `/history` | 이용 내역 | — |
| `/my-reports` | 내 제보 현황 | — |
| `/my-activity` | 커뮤니티 활동 | — |
| `/notice` | 공지사항 | — |
| `/support` | 고객센터 · 민원 | — |
| `/settings` | 설정 | — |

사이드 드로어는 홈 좌상단 햄버거 버튼으로 열립니다 (프로필 + 포인트 카드 + 메뉴 8개 + 로그아웃).

하단 탭바의 **`배달` 은 `타슈 옮기기` 와 같은 기능**이라 `/mission` 으로 연결됩니다.
예전 `/delivery` 링크는 `/mission` 으로 리다이렉트됩니다.

---

## 디자인 시스템

Figma `00 스타일 가이드` 프레임의 실제 타슈 앱 팔레트를 `tailwind.config.js` 에 토큰으로 정의했습니다.

| 토큰 | 색상 | 용도 |
| --- | --- | --- |
| `cream` | `#F5F3EF` | 화면 배경 |
| `orange` | `#E8940A` | CTA, 활성 탭, 포인트 |
| `brand` | `#2B7EC1` | 브랜드 블루, 거점 핀 |
| `navy` | `#3D4A6B` | 텍스트 |
| `mint` | `#00A870` | 성공, 적립 |
| `warn` | `#E0533D` | 경고, 제보 핀 |

- 카드: 흰색 / `radius 16px` / 은은한 그림자
- 폰트: Noto Sans KR (Google Fonts)
- 모바일 뷰포트 기준 **max-width 390px 중앙 정렬**

---

## 프로토타입 범위에서 비워둔 것

실제 값/연동이 필요한 자리는 코드에 `PLACEHOLDER` 주석으로 표시해 두었습니다.

- **이용권 가격** (`frontend/src/pages/Pass.tsx`) — 와이어프레임 값(500 / 1,000 / 5,000 / 15,000원)을 그대로 넣어둔 상태
- **고객센터 전화번호·운영시간** (`frontend/src/pages/Support.tsx`) — `042-539-5000` / 평일 09~18시
- **타슈·버스 요금** (`backend/app/routers/routes.py`) — 경로 비교 카드의 500원 / 1,500원
- **제보 1건당 적립 포인트** (`frontend/src/pages/MyReports.tsx`)
- **앱 버전** (`frontend/src/components/Drawer.tsx`)
- **날씨 / 내 위치** — 홈 플로팅 버튼은 기상청·GPS 연동 대신 mock 안내 토스트
- **사진 첨부** — 업로드 엔드포인트가 없어 파일명/선택 상태만 보여주는 UI 데모
- **댓글** — 댓글 모델이 없어 `내 활동`의 댓글 수는 게시글 수 기반 mock 값
- **결제 / 로그인 / 인증** — 미구현 (구매·로그아웃은 토스트 안내)
- **거치대 수(`rack_count`) / 편의시설** — 타슈 공공 API가 주지 않는 값이라
  `StationFacility` 테이블에 우리가 직접 넣습니다. seed 에는 주요 거점 7곳만 있고,
  거기에 없는 대여소는 `rack_count: 0`, `fill_ratio: null` 로 내려갑니다.

### 거점 매칭 (실시간 ↔ 우리 데이터)

타슈 공공 API의 대여소 이름은 우리 seed 이름과 표기가 다릅니다
(예: `갈마역 1번출구` vs `갈마역`). 그래서 `StationFacility` 는 두 단계로 조인합니다.

1. `tashu_station_id` 가 채워져 있으면 그 id 로 **정확 매칭**
2. 없으면 이름 정규화(공백·`대여소`/`거점` 접미사 제거) 후 **부분 일치**

키를 발급받아 `GET /api/stations` 를 한 번 호출해 실제 대여소 id를 확인한 뒤,
`StationFacility.tashu_station_id` 를 채워 넣으면 이름 매칭에 의존하지 않게 됩니다.
(부분 일치는 편의를 위한 것이고, 이름이 많이 다른 대여소는 매칭되지 않습니다.)

### 기획서와 다르게 처리한 부분

- **`배달` 탭**: 타슈 옮기기와 같은 기능이라 `/mission` 으로 연결했습니다.
  (초기 구현에 있던 `준비 중` 안내 화면은 제거했습니다.)
- **`GET /api/geocode`**: `/routes/compare` 가 좌표를 받도록 바뀌면서, 경로 화면의 출발/도착
  텍스트 입력을 좌표로 바꿔줄 엔드포인트가 필요해 추가했습니다.
- **경로 화면 거점 자동완성**: 카카오 REST 키가 없으면 자유 텍스트 검색이 거점 이름으로
  제한되기 때문에, 항상 고를 수 있는 거점 목록을 입력창 아래에 붙였습니다. 고르면 즉시
  경로를 다시 계산합니다. 출발지에는 현재 위치(geolocation) 버튼도 있습니다.
- **한쪽 위치 검색이 실패해도 화면을 유지**: 출발/도착을 각각 독립적으로 해석해서, 한쪽을
  못 찾아도 나머지 좌표로 경로를 계속 보여주고 실패한 입력 아래에 사유를 표시합니다.
- **`GET /api/stations` 응답 형태**: `source` 를 담기 위해 배열이 아니라
  `{ source, count, cache_age_seconds, stations: [...] }` 객체로 감쌌습니다.
- **`Station` 모델 분리**: 편의시설 필드를 `Station` 에서 떼어내 `StationFacility` 로 옮겼습니다.
  `Station` 은 이제 seed 폴백 좌표 전용입니다. (기존 SQLite 파일이 있으면
  `backend/tashu.db` 를 삭제하고 다시 실행해야 합니다.)
- **`Report.user_id`**: 모델 정의에는 없지만 `GET /reports/me` 를 구분하려면 작성자 키가
  필요해 nullable 컬럼 하나를 추가했습니다.
- **`POST /missions/{id}/complete`**: "완료 처리 시 포인트 적립" 요구사항을 만족시키기 위해
  수락과 별도로 완료 엔드포인트를 추가했습니다.
- **커뮤니티 탭**: 기획대로 `인기 / 코스 공유 / 모범 라이더` 3개만 두었습니다. 글쓰기에서
  선택할 수 있는 `거점 정보`·`자유` 게시판 글은 `인기` 탭에서 확인할 수 있습니다.
- **응답 시각**: SQLite 는 타임존을 버리기 때문에, 브라우저가 UTC 를 로컬 시각으로 잘못 읽지
  않도록 응답 datetime 을 `+09:00` 오프셋이 붙은 KST 문자열로 직렬화합니다.
