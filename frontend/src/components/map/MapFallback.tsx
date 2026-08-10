/**
 * 카카오맵 SDK 를 못 불러왔을 때(키 없음/스크립트 실패) 대신 그리는 CSS 지도 placeholder.
 * 실제 지도는 map/ 아래 Kakao* 컴포넌트가 담당한다.
 * 회색 배경 + 도로 형태 + 핀 마커로 구성되며, 좌표는 표시할 점들의 bounding box 를
 * 기준으로 정규화해서 배치한다 (데이터가 바뀌어도 핀이 프레임 안에 고르게 퍼진다).
 */

import type { MouseEvent } from 'react'
import type { Report, Station } from '../../types'

interface Point {
  lat: number
  lng: number
}

/** 핀이 놓일 수 있는 영역의 여백 (%). 플로팅 버튼/CTA 에 가리지 않게 화면별로 조절한다. */
export interface MapInsets {
  top: number
  right: number
  bottom: number
  left: number
}

const DEFAULT_INSETS: MapInsets = { top: 12, right: 12, bottom: 12, left: 12 }

interface Projection {
  toXY: (p: Point) => { x: number; y: number }
  toLatLng: (xPct: number, yPct: number) => Point
}

function makeProjection(points: Point[], insets: MapInsets): Projection {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  // 점이 하나뿐이거나 좌표가 겹치면 span 이 0 이 되므로 최소값을 준다.
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latSpan = maxLat - minLat || 0.01
  const lngSpan = maxLng - minLng || 0.01
  const innerW = 100 - insets.left - insets.right
  const innerH = 100 - insets.top - insets.bottom

  return {
    toXY: (p) => ({
      x: insets.left + ((p.lng - minLng) / lngSpan) * innerW,
      // 위도는 위로 갈수록 커지므로 y 축을 뒤집는다.
      y: insets.top + ((maxLat - p.lat) / latSpan) * innerH,
    }),
    toLatLng: (xPct, yPct) => ({
      lng: minLng + ((xPct - insets.left) / innerW) * lngSpan,
      lat: maxLat - ((yPct - insets.top) / innerH) * latSpan,
    }),
  }
}

/**
 * 실제 거점 좌표가 가까우면(둔산·탄방역·시청 등) 핀이 서로 완전히 겹쳐 가려진다.
 * placeholder 지도이므로 가독성을 위해 겹치는 핀만 결정적으로 살짝 밀어낸다.
 * (id 순으로 처리하므로 렌더마다 같은 결과가 나온다.)
 */
const NUDGES = [
  [0, 0],
  [10, 0],
  [-10, 0],
  [5, 8],
  [-5, 8],
  [5, -8],
  [-5, -8],
  [14, 8],
  [-14, -8],
]

function spread(
  placed: { x: number; y: number }[],
  xy: { x: number; y: number },
  insets: MapInsets,
) {
  for (const [dx, dy] of NUDGES) {
    const candidate = {
      x: Math.min(100 - insets.right, Math.max(insets.left, xy.x + dx)),
      y: Math.min(100 - insets.bottom, Math.max(insets.top, xy.y + dy)),
    }
    const collides = placed.some(
      (p) => Math.abs(p.x - candidate.x) < 9 && Math.abs(p.y - candidate.y) < 7,
    )
    if (!collides) return candidate
  }
  return xy
}

const DENSITY_COLOR: Record<Station['density'], string> = {
  과잉: '#E0533D', // 빨강 = 과잉
  적정: '#00A870',
  부족: '#2B7EC1', // 파랑 = 부족
}

interface Props {
  stations?: Station[]
  reports?: Report[]
  /** 'bikes' = 잔여 대수 표시, 'density' = 집중도(과잉/부족) 색상 */
  mode?: 'bikes' | 'density'
  selectedStationId?: number | null
  onStationClick?: (station: Station) => void
  /** 지도를 눌러 위치를 지정할 때 (제보 화면) */
  onMapClick?: (point: Point) => void
  /** 사용자가 지정한 위치 마커 */
  marker?: Point | null
  /** 핀 배치 영역 여백 (%) — 오버레이 UI 에 핀이 가리지 않게 조절 */
  insets?: Partial<MapInsets>
  className?: string
  children?: React.ReactNode
}

export default function MapFallback({
  stations = [],
  reports = [],
  mode = 'bikes',
  selectedStationId = null,
  onStationClick,
  onMapClick,
  marker = null,
  insets,
  className = 'h-[420px]',
  children,
}: Props) {
  // 투영 기준점: 거점 + 제보. 둘 다 없으면 대전 시내 대략 범위로 폴백한다.
  const basis: Point[] = [...stations, ...reports]
  const points = basis.length
    ? basis
    : [
        { lat: 36.325, lng: 127.335 },
        { lat: 36.367, lng: 127.441 },
      ]
  const resolvedInsets = { ...DEFAULT_INSETS, ...insets }
  const proj = makeProjection(points, resolvedInsets)

  // 제보 -> 거점 순으로 자리를 잡아 겹침을 푼다 (거점 핀이 더 크므로 나중에 배치).
  const taken: { x: number; y: number }[] = []
  const reportXY = new Map<number, { x: number; y: number }>()
  for (const r of reports) {
    const xy = spread(taken, proj.toXY(r), resolvedInsets)
    taken.push(xy)
    reportXY.set(r.id, xy)
  }
  const stationXY = new Map<number, { x: number; y: number }>()
  for (const s of stations) {
    const xy = spread(taken, proj.toXY(s), resolvedInsets)
    taken.push(xy)
    stationXY.set(s.id, xy)
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onMapClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = ((e.clientX - rect.left) / rect.width) * 100
    const yPct = ((e.clientY - rect.top) / rect.height) * 100
    onMapClick(proj.toLatLng(xPct, yPct))
  }

  return (
    <div
      onClick={handleClick}
      className={`relative w-full overflow-hidden bg-[#DEDBD4] ${onMapClick ? 'cursor-crosshair' : ''} ${className}`}
    >
      {/* ---- 도로 / 하천 형태 (장식) ---- */}
      <div className="absolute inset-x-0 top-[38%] h-11 bg-[#EFEDE8]" />
      <div className="absolute inset-y-0 left-[45%] w-11 bg-[#EFEDE8]" />
      <div className="absolute inset-x-0 top-[72%] h-6 bg-[#EFEDE8]" />
      <div className="absolute inset-y-0 left-[16%] w-6 bg-[#EFEDE8]" />
      {/* 갑천 느낌의 하천 */}
      <div className="absolute -left-10 top-0 h-[130%] w-12 rotate-[18deg] bg-brand/15" />
      {/* 도로 중앙선 */}
      <div className="absolute inset-x-0 top-[38%] mt-[21px] h-px bg-white/70" />
      <div className="absolute inset-y-0 left-[45%] ml-[21px] w-px bg-white/70" />

      {/* ---- 제보 핀 (빨강) ---- */}
      {reports.map((r) => {
        const { x, y } = reportXY.get(r.id) ?? proj.toXY(r)
        const resolved = r.status === '완료'
        return (
          <div
            key={`report-${r.id}`}
            title={`${r.category} · ${r.status}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-float ring-2 ring-white ${
                resolved ? 'bg-navy/35' : 'bg-warn'
              }`}
            >
              !
            </div>
          </div>
        )
      })}

      {/* ---- 거점 핀 ---- */}
      {stations.map((s) => {
        const { x, y } = stationXY.get(s.id) ?? proj.toXY(s)
        const empty = s.available_bikes === 0
        const selected = selectedStationId === s.id
        const background =
          mode === 'density' ? DENSITY_COLOR[s.density] : empty ? '#9CA3AF' : '#2B7EC1'
        return (
          <button
            key={`station-${s.id}`}
            type="button"
            aria-label={`${s.name} 거점 이용 가능 ${s.available_bikes}대`}
            onClick={(e) => {
              e.stopPropagation()
              onStationClick?.(s)
            }}
            style={{ left: `${x}%`, top: `${y}%`, backgroundColor: background }}
            className={`absolute flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[13px] font-bold text-white shadow-float ring-2 transition-transform ${
              selected ? 'z-20 scale-125 ring-orange' : 'ring-white'
            }`}
          >
            {s.available_bikes}
          </button>
        )
      })}

      {/* ---- 사용자가 지정한 위치 마커 ---- */}
      {marker && (
        <div
          style={{ left: `${proj.toXY(marker).x}%`, top: `${proj.toXY(marker).y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-[18px] font-bold text-white shadow-float ring-4 ring-orange/25">
            !
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
