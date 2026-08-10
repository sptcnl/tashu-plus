/**
 * 경로 비교 화면의 미니 지도.
 * 타슈 경로는 도보 구간을 점선, 자전거 구간을 오렌지 실선으로 그린다.
 */

import { useEffect } from 'react'
import { CustomOverlayMap, Map, Polyline, useMap } from 'react-kakao-maps-sdk'
import { useKakaoLoader } from '../../lib/useKakaoLoader'
import type { LatLng, RouteOption } from '../../types'
import { COLORS, DAEJEON_CENTER } from './constants'

/** 경로 전체가 화면에 들어오도록 bounds 를 맞춘다. */
function FitBounds({ path }: { path: LatLng[] }) {
  const map = useMap()

  useEffect(() => {
    if (path.length === 0) return
    if (path.length === 1) {
      map.setCenter(new kakao.maps.LatLng(path[0].lat, path[0].lng))
      return
    }
    const bounds = new kakao.maps.LatLngBounds()
    for (const p of path) bounds.extend(new kakao.maps.LatLng(p.lat, p.lng))
    map.setBounds(bounds, 16, 16, 16, 16)
  }, [map, path])

  return null
}

const WALK_STYLE = {
  strokeColor: '#3D4A6B',
  strokeOpacity: 0.75,
  strokeStyle: 'shortdash' as const,
  strokeWeight: 4,
}

const RIDE_STYLE = {
  strokeColor: COLORS.selected,
  strokeOpacity: 0.95,
  strokeStyle: 'solid' as const,
  strokeWeight: 6,
}

const TRANSIT_STYLE = {
  strokeColor: COLORS.brand,
  strokeOpacity: 0.9,
  strokeStyle: 'solid' as const,
  strokeWeight: 5,
}

export default function RouteMap({
  option,
  origin,
  destination,
  className = 'h-[200px]',
}: {
  option: RouteOption
  origin: LatLng
  destination: LatLng
  className?: string
}) {
  const status = useKakaoLoader()

  const fullPath = option.polyline.length > 0 ? option.polyline : [origin, destination]

  if (status !== 'ready') {
    return (
      <div
        className={`flex items-center justify-center rounded-card bg-[#DEDBD4] text-[12px] text-navy/50 ${className}`}
      >
        {status === 'loading' ? '지도 불러오는 중…' : '카카오맵 키가 없어 경로 지도를 표시할 수 없어요'}
      </div>
    )
  }

  // 구간별로 나눠 그린다 (도보=점선 / 자전거=오렌지 실선).
  const segments = option.segments.filter((s) => s.path.length >= 2)

  return (
    <div className={`overflow-hidden rounded-card ${className}`}>
      <Map
        center={fullPath[0] ?? DAEJEON_CENTER}
        level={5}
        style={{ width: '100%', height: '100%' }}
        draggable
      >
        <FitBounds path={fullPath} />

        {segments.length > 0 ? (
          segments.map((segment, i) => (
            <Polyline
              key={i}
              path={segment.path}
              {...(segment.mode === '자전거'
                ? RIDE_STYLE
                : segment.mode === '도보'
                  ? WALK_STYLE
                  : TRANSIT_STYLE)}
            />
          ))
        ) : (
          <Polyline
            path={fullPath}
            {...(option.key === 'walk' ? WALK_STYLE : TRANSIT_STYLE)}
          />
        )}

        {/* 출발 / 도착 / 경유 거점 표시 */}
        <CustomOverlayMap position={origin} yAnchor={0.5} xAnchor={0.5} zIndex={10}>
          <Dot color={COLORS.brand} label="출발" />
        </CustomOverlayMap>
        <CustomOverlayMap position={destination} yAnchor={0.5} xAnchor={0.5} zIndex={10}>
          <Dot color={COLORS.selected} label="도착" />
        </CustomOverlayMap>

        {option.from_station && (
          <CustomOverlayMap
            position={{ lat: option.from_station.lat, lng: option.from_station.lng }}
            yAnchor={1.35}
            xAnchor={0.5}
          >
            <StationTag text={`${option.from_station.name} 대여`} />
          </CustomOverlayMap>
        )}
        {option.to_station && (
          <CustomOverlayMap
            position={{ lat: option.to_station.lat, lng: option.to_station.lng }}
            yAnchor={1.35}
            xAnchor={0.5}
          >
            <StationTag text={`${option.to_station.name} 반납`} />
          </CustomOverlayMap>
        )}
      </Map>
    </div>
  )
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <div
      title={label}
      style={{ backgroundColor: color }}
      className="h-3.5 w-3.5 rounded-full ring-[3px] ring-white"
    />
  )
}

function StationTag({ text }: { text: string }) {
  return (
    <span className="whitespace-nowrap rounded-md bg-white px-2 py-1 text-[10px] font-bold text-navy shadow-float">
      {text}
    </span>
  )
}
