import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, CloseIcon } from './icons'
import TabBar from './TabBar'

interface ScreenProps {
  /** 헤더 제목. 생략하면 헤더를 그리지 않는다 (홈처럼 자체 헤더를 쓰는 화면). */
  title?: string
  /** 뒤로가기 버튼 모양. 'back' = '<', 'close' = 'X' */
  backIcon?: 'back' | 'close'
  /** 헤더 오른쪽 액션 (예: 글쓰기의 '등록') */
  action?: ReactNode
  /** 하단 탭바 표시 여부 */
  tabBar?: boolean
  /** 화면 하단에 고정되는 CTA 영역 */
  footer?: ReactNode
  /** 스크롤 영역에 기본 좌우 패딩을 적용할지 */
  padded?: boolean
  children: ReactNode
}

/**
 * 모바일 화면 한 장. 헤더 / 스크롤 본문 / (선택) 고정 푸터 / (선택) 탭바 구조.
 * 프레임 자체(390px 중앙 정렬)는 App 의 PhoneFrame 이 담당한다.
 */
export default function Screen({
  title,
  backIcon = 'back',
  action,
  tabBar = false,
  footer,
  padded = true,
  children,
}: ScreenProps) {
  const navigate = useNavigate()
  const Icon = backIcon === 'close' ? CloseIcon : ChevronLeftIcon

  return (
    <div className="flex h-full flex-col">
      {title && (
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-black/5 bg-white">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로 가기"
            className="absolute left-2 flex h-10 w-10 items-center justify-center text-navy"
          >
            <Icon />
          </button>
          <h1 className="text-[16px] font-bold">{title}</h1>
          {action && <div className="absolute right-4">{action}</div>}
        </header>
      )}

      <main
        className={`flex-1 overflow-y-auto ${padded ? 'px-5 py-5' : ''} ${
          // 푸터가 있으면 푸터가 탭바 위 공간을 이미 차지하므로 여백이 필요 없다.
          tabBar && !footer ? 'pb-[76px]' : ''
        }`}
      >
        {children}
      </main>

      {footer && (
        <div
          className={`shrink-0 border-t border-black/5 bg-white px-5 py-3 ${tabBar ? 'mb-[72px]' : ''}`}
        >
          {footer}
        </div>
      )}

      {tabBar && <TabBar />}
    </div>
  )
}
