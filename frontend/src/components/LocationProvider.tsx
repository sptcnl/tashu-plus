import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DAEJEON_CENTER } from './map/constants'
import type { LatLng } from '../types'

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

interface LocationValue {
  /** 사용자 실제 위치 (권한 없으면 null) */
  coord: LatLng | null
  /** 지도/주변검색에 쓸 좌표 — 위치를 못 얻으면 대전시청으로 폴백 */
  effectiveCoord: LatLng
  status: LocationStatus
  /** 사용자 액션으로 다시 요청 (예: '내위치' 버튼) */
  request: () => Promise<LatLng | null>
}

const LocationContext = createContext<LocationValue | null>(null)

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60_000,
}

/**
 * 앱 진입 시 바로 위치 권한을 요청하고, 받은 좌표를 앱 전체에서 공유한다.
 * (홈 지도 중심 / 주변 거점 검색에 사용)
 *
 * 브라우저 geolocation 은 HTTPS 또는 localhost 에서만 동작한다.
 * 거부/실패해도 앱은 대전시청 기준으로 계속 동작한다.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [coord, setCoord] = useState<LatLng | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')

  const request = useCallback(async (): Promise<LatLng | null> => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return null
    }
    setStatus('requesting')
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setCoord(next)
          setStatus('granted')
          resolve(next)
        },
        () => {
          setStatus('denied')
          resolve(null)
        },
        GEO_OPTIONS,
      )
    })
  }, [])

  // 진입 즉시 1회 요청
  useEffect(() => {
    void request()
  }, [request])

  const value = useMemo<LocationValue>(
    () => ({ coord, effectiveCoord: coord ?? DAEJEON_CENTER, status, request }),
    [coord, status, request],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation 은 LocationProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
