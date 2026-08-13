/**
 * 타슈 옮기기 화면의 거점 집중도 지도.
 * 거치대 대비 잔여 비율(fill_ratio)로 과잉(빨강) / 부족(파랑) 을 색으로 표현하고,
 * 원을 누르면 거점 이름과 주소를 말풍선으로 보여준다.
 *
 * 원 크기를 미터로 고정하면 대여소가 1,300곳이 넘는 실데이터에서 서로 겹쳐
 * 거대한 덩어리가 되고 개별 클릭이 불가능해진다. 그래서 줌 배율(m/px)을 읽어
 * **화면상 픽셀 크기가 일정하게** 유지되도록 반지름을 계산한다.
 */

import { useCallback, useEffect, useState } from 'react'
import { Circle, Map, useMap } from 'react-kakao-maps-sdk'
import { useKakaoLoader } from '../../lib/useKakaoLoader'
import type { LatLng, Station } from '../../types'
import MapFallback from './MapFallback'
import { DAEJEON_CENTER, DENSITY_COLOR } from './constants'

/** 화면상 반지름(px). 기본 + 과잉/부족이 심한 정도만큼 조금 더 크게. */
const BASE_RADIUS_PX = 11
const EXTRA_RADIUS_PX = 10
const SELECTED_BONUS_PX = 4

/**
 * 픽셀 기준만 쓰면 확대해도 원이 계속 같은 크기라 답답하고, 미터 기준만 쓰면
 * 축소할 때 1,300개가 뭉쳐 덩어리가 된다. 그래서 픽셀 기준으로 계산한 뒤
 * 미터 상한/하한으로 잘라 두 문제를 모두 막는다.
 *   - 하한(60m): 확대할수록 원이 커져 누르기 쉬워진다.
 *   - 상한(220m): 축소해도 서로 뭉치지 않는다.
 */
const MIN_RADIUS_M = 60
const MAX_RADIUS_M = 220

/** 폴백용 기본 배율 (level 6 근처의 대략적인 m/px) */
const DEFAULT_METERS_PER_PX = 4

function extremityOf(station: Station): number {
  const ratio = station.fill_ratio
  if (ratio === null) return 0
  // 과잉(0.7↑) / 부족(0.2↓) 임계에서 벗어난 정도 (0~0.3)
  return Math.max(ratio - 0.7, 0.2 - ratio, 0)
}

/** 지도 줌이 바뀔 때 m/px 배율을 알려준다. */
function ScaleWatcher({ onScale }: { onScale: (metersPerPx: number) => void }) {
  const map = useMap()

  useEffect(() => {
    const compute = () => {
      const bounds = map.getBounds()
      if (!bounds) return
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      const node = map.getNode() as HTMLElement
      const widthPx = node?.clientWidth || 0
      if (widthPx <= 0) return

      // 같은 위도에서 동서 거리(m) / 화면 폭(px)
      const line = new kakao.maps.Polyline({
        path: [
          new kakao.maps.LatLng(sw.getLat(), sw.getLng()),
          new kakao.maps.LatLng(sw.getLat(), ne.getLng()),
        ],
      })
      const meters = line.getLength()
      if (meters > 0) onScale(meters / widthPx)
    }

    compute()
    // 팬(bounds_changed)마다 갱신하면 원 1,300개가 계속 리렌더되므로 줌에만 반응한다.
    kakao.maps.event.addListener(map, 'zoom_changed', compute)
    return () => {
      kakao.maps.event.removeListener(map, 'zoom_changed', compute)
    }
  }, [map, onScale])

  return null
}

export default function DensityMap({
  stations,
  center,
  className = 'h-[220px]',
}: {
  stations: Station[]
  /** 첫 렌더링 중심 (내 위치). 없으면 첫 거점 → 대전시청 순으로 폴백. */
  center?: LatLng | null
  className?: string
}) {
  const status = useKakaoLoader()
  const [selected, setSelected] = useState<Station | null>(null)
  const [metersPerPx, setMetersPerPx] = useState(DEFAULT_METERS_PER_PX)

  // 소수점까지 반영하면 줌마다 미세하게 흔들려 리렌더가 늘어나므로 살짝 뭉갠다.
  const handleScale = useCallback((next: number) => {
    setMetersPerPx((prev) => (Math.abs(prev - next) / next > 0.05 ? next : prev))
  }, [])

  if (status !== 'ready') {
    return <MapFallback className={className} mode="density" stations={stations} />
  }

  return (
    <div>
      <div className={className}>
      {/*
        지도 배경 클릭으로 선택을 해제하지 않는다. 원을 클릭하면 Circle 의 click 과
        Map 의 click 이 함께 발생해서, 선택 직후 바로 해제되어 버린다.
        해제는 정보 카드의 × 로만 처리한다.
      */}
      <Map
        center={center ?? stations[0] ?? DAEJEON_CENTER}
        level={6}
        style={{ width: '100%', height: '100%' }}
      >
        <ScaleWatcher onScale={handleScale} />

        {stations.map((station) => {
          const color = DENSITY_COLOR[station.density]
          const isSelected = selected?.id === station.id
          const px =
            BASE_RADIUS_PX +
            (extremityOf(station) / 0.3) * EXTRA_RADIUS_PX +
            (isSelected ? SELECTED_BONUS_PX : 0)
          const radius = Math.min(
            MAX_RADIUS_M,
            Math.max(MIN_RADIUS_M, px * metersPerPx),
          )
          return (
            <Circle
              key={`circle-${station.id}`}
              center={{ lat: station.lat, lng: station.lng }}
              radius={radius}
              strokeWeight={isSelected ? 3 : 1.5}
              strokeColor={isSelected ? '#3D4A6B' : color}
              strokeOpacity={isSelected ? 1 : 0.85}
              fillColor={color}
              fillOpacity={isSelected ? 0.85 : 0.55}
              onClick={() => setSelected(station)}
            />
          )
        })}

      </Map>
      </div>

      {/*
        선택한 거점 정보는 지도 위 말풍선이 아니라 지도 '아래' 카드로 보여준다.
        지도 높이가 240px 밖에 안 되고, 가장자리 거점을 누르면 말풍선이 잘려서
        주소가 안 보였다. 아래 카드는 폭을 그대로 쓰니 잘리지도, 겹치지도 않는다.
      */}
      {selected && <SelectedStation station={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/** 지도 아래에 붙는 선택 거점 정보 (폭을 그대로 쓰므로 어느 화면에서도 잘리지 않는다). */
function SelectedStation({ station, onClose }: { station: Station; onClose: () => void }) {
  const color = DENSITY_COLOR[station.density]
  return (
    <div className="flex items-start gap-3 border-t border-black/5 bg-cream/60 px-4 py-3">
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {/* 공백 없는 긴 이름(둔산동_한가람아파트(2동))도 줄바꿈되게 */}
        <p className="break-words text-[13px] font-bold leading-snug">{station.name}</p>
        <p className="mt-1 text-[11px]">
          <span className="font-bold" style={{ color }}>
            {station.density}
          </span>
          <span className="text-navy/55">
            {' · '}
            {station.available_bikes}대
            {station.rack_count > 0 && ` / 거치대 ${station.rack_count}`}
          </span>
        </p>
        <p className="mt-1 break-words text-[11px] leading-snug text-navy/50">
          {station.address || '주소 정보가 없어요'}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[18px] leading-none text-navy/35 active:bg-white"
      >
        ×
      </button>
    </div>
  )
}
