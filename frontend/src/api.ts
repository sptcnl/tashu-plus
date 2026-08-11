/** 백엔드 fetch 래퍼. 베이스 URL 은 VITE_API_URL 환경변수로 주입한다. */

import type {
  Activity,
  AmenityKind,
  AmenityList,
  Board,
  Geocode,
  LatLng,
  Mission,
  MissionAction,
  NearbyList,
  Notice,
  Post,
  Report,
  ReportCategory,
  RideHistory,
  RouteCompare,
  Station,
  StationList,
  User,
} from './types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000') + '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.', 0)
  }

  if (!res.ok) {
    // FastAPI 는 에러를 {detail: ...} 로 돌려준다.
    let detail = `요청이 실패했습니다. (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      /* 본문이 JSON 이 아니면 기본 메시지를 쓴다 */
    }
    throw new ApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  // 거점 (타슈 실시간, 실패 시 seed — 응답의 source 로 구분)
  stations: () => get<StationList>('/stations'),
  station: (id: number) => get<Station>(`/stations/${id}`),
  nearbyStations: (lat: number, lng: number, radius = 1500) =>
    get<NearbyList>(
      `/stations/nearby?${new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
      })}`,
    ),

  // 편의시설 위치 핀 (화장실/음수대/바람주입/맛집)
  amenities: (kind?: AmenityKind) =>
    get<AmenityList>(kind ? `/amenities?kind=${encodeURIComponent(kind)}` : '/amenities'),

  // 장소명 → 좌표 (경로 화면 입력용)
  geocode: (query: string) =>
    get<Geocode>(`/geocode?${new URLSearchParams({ query })}`),

  // 경로 비교 (카카오 경로 API, 실패 시 mock)
  compareRoutes: (
    from: LatLng,
    to: LatLng,
    fromName = '현재 위치',
    toName = '목적지',
  ) =>
    get<RouteCompare>(
      `/routes/compare?${new URLSearchParams({
        from_lat: String(from.lat),
        from_lng: String(from.lng),
        to_lat: String(to.lat),
        to_lng: String(to.lng),
        from_name: fromName,
        to_name: toName,
      })}`,
    ),

  // 제보
  reports: () => get<Report[]>('/reports'),
  myReports: () => get<Report[]>('/reports/me'),
  createReport: (payload: {
    category: ReportCategory
    description: string
    lat: number
    lng: number
  }) => post<Report>('/reports', payload),

  // 미션
  missions: () => get<Mission[]>('/missions'),
  acceptMission: (id: number) => post<MissionAction>(`/missions/${id}/accept`),
  completeMission: (id: number) => post<MissionAction>(`/missions/${id}/complete`),

  // 커뮤니티
  posts: (board?: Board) =>
    get<Post[]>(board ? `/posts?board=${encodeURIComponent(board)}` : '/posts'),
  createPost: (payload: { board: Board; title: string; content: string }) =>
    post<Post>('/posts', payload),
  likePost: (id: number) => post<Post>(`/posts/${id}/like`),

  // 내 정보
  me: () => get<User>('/me'),
  rides: () => get<RideHistory[]>('/me/rides'),
  activity: () => get<Activity>('/me/activity'),

  // 공지
  notices: () => get<Notice[]>('/notices'),
}
