import type { Board } from '../types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2,500 형태의 천단위 콤마 */
export const comma = (n: number) => n.toLocaleString('ko-KR')

/** "8.10" */
export const shortDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

/** "8.10 (월) 18:32" */
export const dateTimeLabel = (iso: string) => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]}) ${hh}:${mm}`
}

/** DB 의 게시판 값(공백 없음) -> 화면 표기(공백 있음) */
const BOARD_LABELS: Record<Board, string> = {
  코스공유: '코스 공유',
  거점정보: '거점 정보',
  모범라이더: '모범 라이더',
  자유: '자유',
}

export const boardLabel = (board: Board) => BOARD_LABELS[board] ?? board
export const BOARDS = Object.keys(BOARD_LABELS) as Board[]

/** 거점 편의시설을 "화장실 · 음수대" 형태로 */
export const amenityLabel = (s: {
  has_toilet: boolean
  has_water: boolean
  has_pump: boolean
}) => {
  const list: string[] = []
  if (s.has_toilet) list.push('화장실')
  if (s.has_water) list.push('음수대')
  if (s.has_pump) list.push('바람주입')
  return list
}
