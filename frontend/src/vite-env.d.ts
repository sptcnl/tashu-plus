/// <reference types="vite/client" />
/// <reference types="kakao.maps.d.ts" />

interface ImportMetaEnv {
  /** 백엔드 API 베이스 URL. 비우면 same-origin(/api) 으로 요청한다. */
  readonly VITE_API_URL?: string
  /** 카카오 JavaScript 키. 없으면 지도는 CSS 폴백(MapFallback)으로 그려진다. */
  readonly VITE_KAKAO_JS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
