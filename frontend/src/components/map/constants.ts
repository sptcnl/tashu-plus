/** 지도 공용 상수. */

import type { AmenityKind } from '../../types'

/** 지도 기본 중심 — 대전시청 인근 */
export const DAEJEON_CENTER = { lat: 36.3504, lng: 127.3845 }

/** 편의시설 종류별 핀 스타일 (이모지 + 테두리 색 + 라벨). */
export const AMENITY_META: Record<AmenityKind, { emoji: string; color: string; label: string }> = {
  화장실: { emoji: '🚻', color: '#6366F1', label: '화장실' },
  음수대: { emoji: '🚰', color: '#0EA5E9', label: '음수대' },
  바람주입: { emoji: '🔧', color: '#8B5CF6', label: '바람주입' },
  맛집: { emoji: '🍜', color: '#F59E0B', label: '맛집' },
}

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
