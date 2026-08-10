import { useState } from 'react'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { comma } from '../lib/format'
import { Badge, InfoBar, SectionHeader } from '../components/ui'

// PLACEHOLDER: 이용권 가격/기간은 실제 타슈 요금제 확인 후 교체 예정
const PRODUCTS = [
  { id: 'hour1', name: '1시간권', price: 500, popular: false },
  { id: 'day1', name: '1일권', price: 1000, popular: false },
  { id: 'day30', name: '30일 정기권', price: 5000, popular: true },
  { id: 'day180', name: '180일 정기권', price: 15000, popular: false },
]

// PLACEHOLDER: 보유 이용권은 결제/이용권 API 연동 전 고정 값
const CURRENT_PASS = { name: '정기권 30일', expiresAt: '8월 24일까지' }

export default function Pass() {
  const { showToast } = useToast()
  const [selected, setSelected] = useState<string>('day30')
  const product = PRODUCTS.find((p) => p.id === selected)

  return (
    <Screen
      title="이용권"
      footer={
        <button
          type="button"
          onClick={() =>
            showToast(`${product?.name} 구매를 진행합니다. (데모 · 결제 미연동)`, 'success')
          }
          className="cta"
        >
          구매하기
        </button>
      }
    >
      {/* 보유 이용권 */}
      <div className="card p-4">
        <p className="text-[11px] font-medium text-navy/50">보유 이용권</p>
        <p className="mt-1.5 text-[15px] font-bold">
          {CURRENT_PASS.name} · <span className="text-brand">{CURRENT_PASS.expiresAt}</span>
        </p>
      </div>

      {/* 상품 목록 */}
      <div className="mt-6">
        <SectionHeader title="이용권 구매" />
        <div className="space-y-3">
          {PRODUCTS.map((p) => {
            const active = selected === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`card flex w-full items-center justify-between p-4 text-left transition-colors ${
                  active ? 'border-2 border-orange' : 'border border-transparent'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold">{p.name}</p>
                    {p.popular && <Badge tone="orange">인기</Badge>}
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium text-navy/60">
                    {comma(p.price)}원
                  </p>
                </div>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? 'border-orange' : 'border-navy/20'
                  }`}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-orange" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5">
        <InfoBar>기본 대여 시간 초과 시 추가 요금이 발생해요</InfoBar>
      </div>
    </Screen>
  )
}
