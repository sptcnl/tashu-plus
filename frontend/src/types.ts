export type AmenityKind = '화장실' | '음수대' | '바람주입' | '맛집'
export type ReportCategory = '공사구간' | '불법주정차' | '도로파손' | '조명없음'
export type ReportStatus = '접수' | '처리중' | '완료'
export type MissionStatus = '대기' | '진행중' | '완료'
export type Board = '코스공유' | '거점정보' | '모범라이더' | '자유'

/** 거점 데이터 출처: live = 타슈 공공 API, seed = 데모 폴백 */
export type DataSource = 'live' | 'seed'

export interface LatLng {
  lat: number
  lng: number
}

export interface Station {
  id: number
  name: string
  lat: number
  lng: number
  available_bikes: number
  /** 거치대 총 개수. 공공 API 에 없어 우리 DB 에서 채운 값 (0 = 미등록) */
  rack_count: number
  has_toilet: boolean
  has_water: boolean
  has_pump: boolean
  nearby_spots: string[]
  address: string | null
  density: '과잉' | '적정' | '부족'
  /** 거치대 대비 잔여 비율 (거치대 미등록이면 null) */
  fill_ratio: number | null
}

export interface StationList {
  source: DataSource
  count: number
  cache_age_seconds: number | null
  stations: Station[]
}

export interface NearbyStation extends Station {
  distance_m: number
}

export interface NearbyList {
  source: DataSource
  count: number
  stations: NearbyStation[]
}

/** 대여소와 별개로 자체 좌표를 가진 편의시설 (지도의 독립 핀) */
export interface Amenity {
  id: number
  kind: AmenityKind
  name: string
  lat: number
  lng: number
  description: string | null
}

export interface AmenityList {
  count: number
  amenities: Amenity[]
}

export interface Geocode {
  source: 'kakao' | 'station'
  name: string
  address: string
  lat: number
  lng: number
}

export interface RouteSegment {
  mode: string // 도보 / 자전거 / 버스 / 지하철
  description: string
  duration_min: number
  distance_m: number
  path: LatLng[]
}

export interface StationBrief {
  id: number
  name: string
  lat: number
  lng: number
  available_bikes: number
  rack_count: number
}

export type RouteKey = 'tashu' | 'transit' | 'walk'

export interface RouteOption {
  key: RouteKey
  mode: string
  total_min: number
  distance_m: number
  cost: number
  recommended: boolean
  summary: string
  segments: RouteSegment[]
  polyline: LatLng[]
  transfers: number
  waypoints: string[]
  from_station: StationBrief | null
  to_station: StationBrief | null
  danger_count: number
}

export interface RouteCompare {
  origin: string
  destination: string
  origin_coord: LatLng
  destination_coord: LatLng
  source: 'kakao' | 'mock'
  options: RouteOption[]
}

export interface Report {
  id: number
  category: ReportCategory
  description: string
  lat: number
  lng: number
  status: ReportStatus
  created_at: string
}

export interface Mission {
  id: number
  from_station_id: number
  to_station_id: number
  from_station_name: string
  to_station_name: string
  distance_km: number
  reward_points: number
  status: MissionStatus
}

export interface MissionAction {
  mission: Mission
  user_points: number
  message: string
}

export interface Post {
  id: number
  board: Board
  title: string
  content: string
  author: string
  likes: number
  created_at: string
}

export interface User {
  id: number
  name: string
  level: number
  points: number
  level_title: string
  next_level_points: number
}

export interface RideHistory {
  id: number
  from_station: string
  to_station: string
  duration_min: number
  cost: number
  created_at: string
}

export interface Activity {
  posts: Post[]
  total_posts: number
  total_likes: number
  total_comments: number
  ranking: number
  posts_to_badge: number
}

export interface Notice {
  id: number
  title: string
  is_important: boolean
  created_at: string
}
