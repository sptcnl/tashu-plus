import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { comma } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { ChevronRightIcon, CloseIcon } from './icons'
import { useToast } from './Toast'

const MENU = [
  { label: '이용권 구매·조회', to: '/pass' },
  { label: '이용 내역', to: '/history' },
  { label: '타슈 옮기기 미션', to: '/mission' },
  { label: '내 제보 현황', to: '/my-reports' },
  { label: '커뮤니티 활동', to: '/my-activity' },
  { label: '공지사항', to: '/notice' },
  { label: '고객센터 · 민원', to: '/support' },
  { label: '설정', to: '/settings' },
]

// PLACEHOLDER: 실제 앱 버전 확인 후 교체 예정
const APP_VERSION = '2.4.1'

const DrawerContext = createContext<{ openDrawer: () => void } | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openDrawer = useCallback(() => setOpen(true), [])
  const value = useMemo(() => ({ openDrawer }), [openDrawer])

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Drawer open={open} onClose={() => setOpen(false)} />
    </DrawerContext.Provider>
  )
}

export function useDrawer() {
  const ctx = useContext(DrawerContext)
  if (!ctx) throw new Error('useDrawer 는 DrawerProvider 안에서만 사용할 수 있습니다.')
  return ctx
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: user } = useAsync(() => api.me(), [open])

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <>
      {/* 딤 배경 */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`absolute inset-0 z-40 bg-navy/45 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`absolute inset-y-0 left-0 z-40 flex w-[300px] flex-col bg-white transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 닫기 버튼은 드로어 밖(오른쪽)에 떠 있으므로 닫힌 상태에서는 감춰야 한다. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          tabIndex={open ? 0 : -1}
          className={`absolute right-[-56px] top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-navy shadow-float transition-opacity ${
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <CloseIcon />
        </button>

        <div className="flex-1 overflow-y-auto px-6 pt-14">
          {/* 프로필 */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-[20px] font-bold text-brand">
              {user ? user.name.slice(-2, -1) : '나'}
            </div>
            <div>
              <p className="text-[16px] font-bold">{user?.name ?? '김나희'}</p>
              <p className="text-[12px] text-navy/50">
                Lv.{user?.level ?? 3} {user?.level_title ?? '타슈 지킴이'}
              </p>
            </div>
          </div>

          {/* 포인트 카드 */}
          <button
            type="button"
            onClick={() => go('/pass')}
            className="mt-6 flex w-full items-center justify-between rounded-card bg-cream px-4 py-3.5 text-left"
          >
            <div>
              <p className="text-[11px] font-medium text-navy/50">내 포인트</p>
              <p className="mt-0.5 text-[17px] font-bold text-orange">
                {comma(user?.points ?? 2500)}P
              </p>
            </div>
            <span className="text-[12px] font-medium text-navy/50">사용하기 &gt;</span>
          </button>

          {/* 메뉴 */}
          <ul className="mt-7">
            {MENU.map((item, i) => (
              <li key={item.to} className={i > 0 ? 'border-t border-black/5' : ''}>
                <button
                  type="button"
                  onClick={() => go(item.to)}
                  className="flex w-full items-center justify-between py-4 text-left text-[14px] font-medium"
                >
                  {item.label}
                  <ChevronRightIcon className="h-4 w-4 text-navy/30" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-black/5 px-6 py-5">
          <button
            type="button"
            onClick={() => {
              onClose()
              // 인증이 없는 데모라 실제 세션 종료 없이 안내만 띄운다.
              showToast('로그아웃되었습니다. (데모)')
            }}
            className="text-[13px] font-medium text-navy/60"
          >
            로그아웃
          </button>
          <p className="mt-2 text-[11px] text-navy/35">앱 버전 {APP_VERSION}</p>
        </div>
      </aside>
    </>
  )
}
