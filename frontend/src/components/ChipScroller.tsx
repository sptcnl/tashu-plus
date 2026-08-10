import { useRef, useState } from 'react'
import type { ReactNode, WheelEvent } from 'react'

/**
 * 가로 스크롤 칩 목록.
 *
 * 스크롤바를 숨겨두면(모바일 룩) 데스크톱에서는 스크롤할 방법이 없어지므로,
 * 세로 휠을 가로 스크롤로 변환하고 오른쪽에 그라데이션 힌트를 띄운다.
 * 드래그(마우스/터치)로도 밀 수 있다.
 */
export default function ChipScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)
  const drag = useRef<{ startX: number; startScroll: number } | null>(null)

  const syncEdge = () => {
    const el = ref.current
    if (!el) return
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    // 트랙패드 가로 스크롤은 그대로 두고, 세로 휠만 가로로 바꾼다.
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
    syncEdge()
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onWheel={handleWheel}
        onScroll={syncEdge}
        onPointerDown={(e) => {
          const el = ref.current
          if (!el) return
          drag.current = { startX: e.clientX, startScroll: el.scrollLeft }
        }}
        onPointerMove={(e) => {
          const el = ref.current
          if (!el || !drag.current) return
          const moved = e.clientX - drag.current.startX
          if (Math.abs(moved) > 3) el.scrollLeft = drag.current.startScroll - moved
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onPointerLeave={() => {
          drag.current = null
        }}
        className="no-scrollbar flex gap-2 overflow-x-auto px-5"
      >
        {children}
      </div>

      {/* 더 있다는 힌트 */}
      {!atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      )}
    </div>
  )
}
