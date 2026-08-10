import { useEffect, useState } from 'react'

export type KakaoStatus = 'loading' | 'ready' | 'unavailable'

const READY_TIMEOUT_MS = 6000
const POLL_INTERVAL_MS = 100

/** 모듈 레벨 상태 — 화면을 옮겨 다닐 때마다 다시 로드하지 않도록 결과를 캐시한다. */
let cached: KakaoStatus = 'loading'
let pending: Promise<KakaoStatus> | null = null

declare global {
  interface Window {
    __kakaoSdkFailed?: boolean
  }
}

function hasPlaceholderKey(): boolean {
  // VITE_KAKAO_JS_KEY 가 비어 있으면 Vite 가 index.html 의 %VITE_KAKAO_JS_KEY% 를
  // 치환하지 못해 스크립트 URL 에 그대로 남는다. 그 경우 키가 없는 것으로 본다.
  const key = import.meta.env.VITE_KAKAO_JS_KEY
  return !key || key.includes('%') || key === 'YOUR_KAKAO_JS_KEY'
}

function load(): Promise<KakaoStatus> {
  if (pending) return pending

  pending = new Promise<KakaoStatus>((resolve) => {
    if (hasPlaceholderKey()) {
      resolve('unavailable')
      return
    }

    const started = Date.now()
    const tick = () => {
      if (window.__kakaoSdkFailed) {
        resolve('unavailable')
        return
      }
      // autoload=false 이므로 스크립트가 붙은 뒤 load() 를 직접 불러야 한다.
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => resolve('ready'))
        return
      }
      if (Date.now() - started > READY_TIMEOUT_MS) {
        resolve('unavailable')
        return
      }
      window.setTimeout(tick, POLL_INTERVAL_MS)
    }
    tick()
  }).then((status) => {
    cached = status
    return status
  })

  return pending
}

/** 카카오맵 SDK 로드 상태. 'unavailable' 이면 호출부가 MapFallback 을 그린다. */
export function useKakaoLoader(): KakaoStatus {
  const [status, setStatus] = useState<KakaoStatus>(cached)

  useEffect(() => {
    if (cached !== 'loading') {
      setStatus(cached)
      return
    }
    let alive = true
    load().then((next) => {
      if (alive) setStatus(next)
    })
    return () => {
      alive = false
    }
  }, [])

  return status
}
