import { useState } from 'react'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { ChevronRightIcon } from '../components/icons'

const NOTIFICATIONS = [
  { key: 'push', label: '푸시 알림', initial: true },
  { key: 'danger', label: '위험구간 진입 경고', initial: true },
  { key: 'mission', label: '미션 추천 알림', initial: true },
  { key: 'comment', label: '커뮤니티 댓글 알림', initial: false },
]

const USAGE_ROWS = [
  { label: '기본 이동수단 설정', value: '타슈' },
  { label: '자주 가는 거점 관리', value: '3곳' },
  { label: '언어', value: '한국어' },
]

export default function Settings() {
  const { showToast } = useToast()
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.key, n.initial])),
  )

  const toggle = (key: string, label: string) => {
    const next = !toggles[key]
    setToggles((prev) => ({ ...prev, [key]: next }))
    showToast(`${label} ${next ? '켜짐' : '꺼짐'}`)
  }

  return (
    <Screen title="설정">
      <h2 className="section-label">알림</h2>
      <div className="space-y-2.5">
        {NOTIFICATIONS.map((n) => (
          <div key={n.key} className="row">
            <span className="font-medium">{n.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={toggles[n.key]}
              aria-label={n.label}
              onClick={() => toggle(n.key, n.label)}
              className={`relative h-[26px] w-11 rounded-full transition-colors ${
                toggles[n.key] ? 'bg-orange' : 'bg-navy/20'
              }`}
            >
              <span
                className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${
                  toggles[n.key] ? 'left-[22px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <h2 className="section-label mt-7">이용</h2>
      <div className="space-y-2.5">
        {USAGE_ROWS.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => showToast(`${row.label} 화면은 준비 중입니다. (데모)`)}
            className="row"
          >
            <span className="font-medium">{row.label}</span>
            <span className="flex items-center gap-1.5 text-[13px] text-navy/45">
              {row.value}
              <ChevronRightIcon className="h-4 w-4 text-navy/30" />
            </span>
          </button>
        ))}
      </div>

      <h2 className="section-label mt-7">계정</h2>
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => showToast('개인정보 처리방침 문서를 준비 중입니다. (데모)')}
          className="row"
        >
          <span className="font-medium">개인정보 처리방침</span>
          <ChevronRightIcon className="h-4 w-4 text-navy/30" />
        </button>
        <button
          type="button"
          onClick={() => showToast('데모 계정은 탈퇴할 수 없습니다.', 'error')}
          className="row text-warn"
        >
          <span className="font-medium">회원 탈퇴</span>
          <ChevronRightIcon className="h-4 w-4 text-warn/50" />
        </button>
      </div>
    </Screen>
  )
}
