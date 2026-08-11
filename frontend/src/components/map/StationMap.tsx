/**
 * 카카오맵 기반 거점 지도.
 *
 * SDK 를 못 불러오면 기존 CSS placeholder(MapFallback)로 자동 전환한다.
 * 거점 마커는 CustomOverlayMap 으로 그린 원형 배지(잔여 대수 숫자)이고,
 * 제보는 같은 지도에 빨간 마커로 겹쳐 그린다.
 */

import { useEffect, useRef } from 'react'
import { CustomOverlayMap, Map, MapMarker, useMap } from 'react-kakao-maps-sdk'
import { useKakaoLoader } from '../../lib/useKakaoLoader'
import type { Amenity, LatLng, Report, Station } from '../../types'
import MapFallback from './MapFallback'
import { AMENITY_META, COLORS, DAEJEON_CENTER } from './constants'

interface Props {
  stations: Station[]
  reports?: Report[]
  /** 대여소와 별개로 지도에 뿌리는 편의시설 핀 */
  amenities?: Amenity[]
  selectedStationId?: number | null
  onStationClick?: (station: Station) => void
  onAmenityClick?: (amenity: Amenity) => void
  /** 지도를 눌러 위치를 지정 (제보 화면) */
  onMapClick?: (point: LatLng) => void
  /** 사용자가 지정한 위치 마커 (제보 화면) */
  marker?: LatLng | null
  /** 지도를 이 좌표로 이동시킨다 (내 위치 버튼 등) */
  center?: LatLng | null
  level?: number
  className?: string
  /** 폴백 화면에서 핀이 UI 에 가리지 않도록 하는 여백 (%) */
  fallbackInsets?: { top: number; right: number; bottom: number; left: number }
}

/** center prop 이 바뀔 때 지도를 부드럽게 이동시키는 헬퍼 (Map 의 자식으로만 동작). */
function Recenter({ center }: { center: LatLng | null | undefined }) {
  const map = useMap()
  const lastRef = useRef<string>('')

  useEffect(() => {
    if (!center) return
    const key = `${center.lat},${center.lng}`
    if (key === lastRef.current) return
    lastRef.current = key
    map.panTo(new kakao.maps.LatLng(center.lat, center.lng))
  }, [center, map])

  return null
}

function StationBadge({
  station,
  selected,
  onClick,
}: {
  station: Station
  selected: boolean
  onClick?: (station: Station) => void
}) {
  const empty = station.available_bikes === 0
  const background = selected ? COLORS.selected : empty ? COLORS.empty : COLORS.brand

  return (
    <button
      type="button"
      aria-label={`${station.name} 거점 이용 가능 ${station.available_bikes}대`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(station)
      }}
      style={{ backgroundColor: background }}
      className={`flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-bold text-white shadow-float ring-2 transition-transform ${
        selected ? 'scale-125 ring-orange' : 'ring-white'
      }`}
    >
      {station.available_bikes}
    </button>
  )
}

function AmenityBadge({
  amenity,
  onClick,
}: {
  amenity: Amenity
  onClick?: (amenity: Amenity) => void
}) {
  const meta = AMENITY_META[amenity.kind]
  return (
    <button
      type="button"
      aria-label={`${meta.label}: ${amenity.name}`}
      title={`${meta.label} · ${amenity.name}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(amenity)
      }}
      style={{ borderColor: meta.color }}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] bg-white text-[15px] leading-none shadow-float transition-transform active:scale-90"
    >
      {meta.emoji}
    </button>
  )
}

export default function StationMap({
  stations,
  reports = [],
  amenities = [],
  selectedStationId = null,
  onStationClick,
  onAmenityClick,
  onMapClick,
  marker = null,
  center = null,
  level = 6,
  className = 'h-full',
  fallbackInsets,
}: Props) {
  const status = useKakaoLoader()

  if (status !== 'ready') {
    // 로딩 중에도 폴백을 보여줘야 화면이 비어 보이지 않는다.
    return (
      <div className={`relative ${className}`}>
        <MapFallback
          className="h-full"
          stations={stations}
          reports={reports}
          amenities={amenities}
          selectedStationId={selectedStationId}
          onStationClick={onStationClick}
          onAmenityClick={onAmenityClick}
          onMapClick={onMapClick ? (p) => onMapClick(p) : undefined}
          marker={marker}
          insets={fallbackInsets}
        />
        {status === 'unavailable' && (
          <span className="absolute bottom-2 left-2 rounded-md bg-navy/70 px-2 py-1 text-[10px] font-medium text-white">
            카카오맵 키 없음 · 데모 지도
          </span>
        )}
      </div>
    )
  }

  const initialCenter = center ?? stations[0] ?? amenities[0] ?? DAEJEON_CENTER

  return (
    <div className={className}>
      <Map
        center={initialCenter}
        level={level}
        isPanto
        style={{ width: '100%', height: '100%' }}
        onClick={(_map, mouseEvent) => {
          if (!onMapClick) return
          const latlng = mouseEvent.latLng
          onMapClick({ lat: latlng.getLat(), lng: latlng.getLng() })
        }}
      >
        <Recenter center={center} />

        {/* 제보 핀 (빨간 마커) — 거점 배지보다 아래에 깔린다 */}
        {reports.map((report) => (
          <MapMarker
            key={`report-${report.id}`}
            position={{ lat: report.lat, lng: report.lng }}
            title={`${report.category} · ${report.status}`}
            image={{
              src: REPORT_PIN_SVG,
              size: { width: 26, height: 26 },
              options: { offset: { x: 13, y: 13 } },
            }}
          />
        ))}

        {/* 편의시설 핀 (화장실/음수대/바람주입/맛집) — 거점 배지보다 아래 */}
        {amenities.map((amenity) => (
          <CustomOverlayMap
            key={`amenity-${amenity.id}`}
            position={{ lat: amenity.lat, lng: amenity.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
            zIndex={8}
          >
            <AmenityBadge amenity={amenity} onClick={onAmenityClick} />
          </CustomOverlayMap>
        ))}

        {/* 거점 배지 */}
        {stations.map((station) => (
          <CustomOverlayMap
            key={`station-${station.id}`}
            position={{ lat: station.lat, lng: station.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
            zIndex={station.id === selectedStationId ? 20 : 5}
          >
            <StationBadge
              station={station}
              selected={station.id === selectedStationId}
              onClick={onStationClick}
            />
          </CustomOverlayMap>
        ))}

        {/* 사용자가 지정한 위치 (제보 화면) */}
        {marker && (
          <CustomOverlayMap position={marker} yAnchor={0.5} xAnchor={0.5} zIndex={30}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-[18px] font-bold text-white shadow-float ring-4 ring-orange/30">
              !
            </div>
          </CustomOverlayMap>
        )}
      </Map>
    </div>
  )
}

/** 제보 핀 마커 이미지 (외부 요청 없이 data URI 로 인라인). */
const REPORT_PIN_SVG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="${COLORS.danger}" stroke="#fff" stroke-width="2.5"/>
      <path d="M13 7v7.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="13" cy="18.6" r="1.4" fill="#fff"/>
    </svg>`,
  )
