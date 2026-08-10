import { useState } from 'react'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { ChevronDownIcon, PhoneIcon, SearchIcon } from '../components/icons'
import { InfoBar, SectionHeader } from '../components/ui'

// PLACEHOLDER: 고객센터 전화번호 / 운영시간은 실제 값 확인 후 교체 예정
const SUPPORT_PHONE = '042-539-5000'
const SUPPORT_HOURS = '평일 09~18시'

const FAQS = [
  {
    q: '자전거가 반납이 안 돼요',
    a: '거치대에 완전히 밀어 넣은 뒤 잠금 레버를 끝까지 내려주세요. 그래도 반납 처리가 되지 않으면 앱의 A/S 접수를 이용하시면 원격으로 반납 처리해 드립니다.',
  },
  {
    q: '결제 수단은 어떻게 바꾸나요?',
    a: '설정 > 계정에서 결제 수단을 변경할 수 있어요. 정기권이 남아 있는 경우 다음 결제일부터 새 수단이 적용됩니다.',
  },
  {
    q: '고장 자전거는 어디에 신고하나요?',
    a: '홈 화면 우측 제보 버튼 또는 하단 제보 탭에서 위치와 유형을 선택해 신고해주세요. 접수 즉시 다른 이용자 지도에도 표시됩니다.',
  },
  {
    q: '타슈 옮기기 보상은 언제 지급되나요?',
    a: '미션을 완료 처리하면 포인트가 즉시 적립됩니다. 적립 내역은 타슈 옮기기 화면의 포인트 카드에서 확인할 수 있어요.',
  },
  {
    q: '정기권 환불이 가능한가요?',
    a: '사용 이력이 없는 정기권은 구매 후 7일 내 전액 환불됩니다. 사용 이력이 있으면 일할 계산 후 잔액이 환불돼요.',
  },
]

export default function Support() {
  const { showToast } = useToast()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')

  const filtered = keyword.trim()
    ? FAQS.filter((f) => f.q.includes(keyword.trim()) || f.a.includes(keyword.trim()))
    : FAQS

  return (
    <Screen title="고객센터 · 민원">
      {/* 전화 / 1:1 문의 */}
      <div className="flex gap-3">
        <a
          href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
          className="card flex-1 p-4 no-underline"
        >
          <div className="flex items-center gap-1.5 text-navy/50">
            <PhoneIcon className="h-3.5 w-3.5" />
            <p className="text-[11px] font-medium">전화 상담</p>
          </div>
          <p className="mt-2 text-[14px] font-bold text-brand">{SUPPORT_PHONE}</p>
          <p className="mt-1 text-[11px] text-navy/40">{SUPPORT_HOURS}</p>
        </a>

        <button
          type="button"
          onClick={() => showToast('1:1 문의 작성 화면은 준비 중입니다. (데모)')}
          className="card flex-1 p-4 text-left"
        >
          <p className="text-[11px] font-medium text-navy/50">1:1 문의</p>
          <p className="mt-2 text-[14px] font-bold">문의 작성하기</p>
          <p className="mt-1 text-[11px] text-navy/40">평균 답변 4시간</p>
        </button>
      </div>

      {/* 검색 */}
      <div className="mt-5 flex h-[52px] items-center gap-2.5 rounded-card bg-white px-4 shadow-card">
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-navy/40" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="무엇이 궁금하세요?"
          aria-label="FAQ 검색"
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-navy/40"
        />
      </div>

      {/* FAQ 아코디언 */}
      <div className="mt-6">
        <SectionHeader title="자주 묻는 질문" />
        <div className="space-y-2.5">
          {filtered.length === 0 && (
            <p className="card p-6 text-center text-[13px] text-navy/45">
              검색 결과가 없어요.
            </p>
          )}
          {filtered.map((faq) => {
            const index = FAQS.indexOf(faq)
            const open = openIndex === index
            return (
              <div key={faq.q} className="card overflow-hidden">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <span className="text-[13px] font-medium">Q. {faq.q}</span>
                  <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 text-navy/35 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <p className="border-t border-black/5 px-4 py-4 text-[13px] leading-relaxed text-navy/65">
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5">
        <InfoBar>심야 고장 신고는 앱 내 A/S 접수로 24시간 가능해요</InfoBar>
      </div>
    </Screen>
  )
}
