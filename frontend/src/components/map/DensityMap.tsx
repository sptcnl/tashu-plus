/**
 * 타슈 옮기기 화면의 거점 집중도 지도.
 * 거치대 대비 잔여 비율(fill_ratio)로 과잉(빨강) / 부족(파랑) 을 원 크기와 색으로 표현한다.
 */

import { Circle, Map } from 'react-kakao-maps-sdk'
import { useKakaoLoader } from '../../lib/useKakaoLoader'
import type { Station } from '../../types'
import MapFallback from './MapFallback'
import { DAEJEON_CENTER, DENSITY_COLOR } from './constants'

/** 잔여 비율이 극단적일수록 원을 크게 그려 눈에 띄게 한다. */
function radiusFor(station: Station): number {
  const ratio = station.fill_ratio
  if (ratio === null) return 220
  const extremity = Math.max(ratio - 0.7, 0.2 - ratio, 0) // 과잉/부족에서 멀어진 정도
  return 200 + extremity * 900
}

export default function DensityMap({
  stations,
  className = 'h-[220px]',
}: {
  stations: Station[]
  className?: string
}) {
  const status = useKakaoLoader()

  if (status !== 'ready') {
    return <MapFallback className={className} mode="density" stations={stations} />
  }

  return (
    <div className={className}>
      <Map
        center={stations[0] ?? DAEJEON_CENTER}
        level={7}
        style={{ width: '100%', height: '100%' }}
      >
        {stations.map((station) => {
          const color = DENSITY_COLOR[station.density]
          return (
            <Circle
              key={`circle-${station.id}`}
              center={{ lat: station.lat, lng: station.lng }}
              radius={radiusFor(station)}
              strokeWeight={2}
              strokeColor={color}
              strokeOpacity={0.8}
              fillColor={color}
              fillOpacity={0.32}
            />
          )
        })}
      </Map>
    </div>
  )
}
