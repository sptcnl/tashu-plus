import type { ReactNode } from 'react'
import type { ReportStatus } from '../types'

/** 가로 스크롤 칩 목록 */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">{children}</div>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={`chip ${active ? 'chip-active' : ''}`}>
      {children}
    </button>
  )
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  접수: 'bg-navy/10 text-navy/70',
  처리중: 'bg-orange/15 text-orange',
  완료: 'bg-mint/15 text-mint',
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

export function Badge({
  tone = 'orange',
  children,
}: {
  tone?: 'orange' | 'red' | 'blue' | 'green'
  children: ReactNode
}) {
  const tones = {
    orange: 'bg-orange text-white',
    red: 'bg-warn/12 text-warn',
    blue: 'bg-brand/12 text-brand',
    green: 'bg-mint/12 text-mint',
  }
  return (
    <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>
  )
}

/** 로딩 / 에러 / 빈 상태를 한 곳에서 처리 */
export function AsyncState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean
  error?: string | null
  empty?: string
  onRetry?: () => void
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-card bg-white/70" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="card p-5 text-center">
        <p className="text-[13px] font-medium text-warn">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-navy/5 px-4 py-2 text-[13px] font-medium"
          >
            다시 시도
          </button>
        )}
      </div>
    )
  }
  if (empty) {
    return (
      <div className="card p-8 text-center text-[13px] text-navy/45">{empty}</div>
    )
  }
  return null
}

/** 정보 안내 배너 (Figma 의 얇은 회색 바) */
export function InfoBar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-navy/5 px-4 py-2.5 text-center text-[12px] text-navy/55">
      {children}
    </div>
  )
}

/** 섹션 제목 + 우측 보조 텍스트 */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-[14px] font-bold">{title}</h2>
      {right && <span className="text-[12px] text-navy/50">{right}</span>}
    </div>
  )
}

/** 밑줄 탭 (커뮤니티 / 커뮤니티 활동) */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-6 border-b border-black/5">
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative pb-2.5 text-[14px] ${
              active ? 'font-bold text-navy' : 'font-medium text-navy/40'
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-orange" />
            )}
          </button>
        )
      })}
    </div>
  )
}
