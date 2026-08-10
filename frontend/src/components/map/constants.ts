/** 지도 공용 상수. */

/** 지도 기본 중심 — 대전시청 인근 */
export const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 }

export const COLORS = {
  brand: '#2B7EC1', // 자전거 1대 이상
  empty: '#9CA3AF', // 0대
  selected: '#E8940A', // 선택된 거점
  danger: '#E0533D', // 제보 핀 / 과잉
  shortage: '#2B7EC1', // 부족
  ok: '#00A870', // 적정
} as const

/** 집중도 지도 범례 색 */
export const DENSITY_COLOR: Record<'과잉' | '적정' | '부족', string> = {
  과잉: COLORS.danger,
  적정: COLORS.ok,
  부족: COLORS.shortage,
}
