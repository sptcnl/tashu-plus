/**
 * 데스크톱(lg 이상) 좌측 네비게이션 사이드바.
 * 모바일에서는 숨기고(App 에서 hidden lg:flex), 하단 TabBar 가 그 역할을 한다.
 * 와이어프레임 D1~D6 의 공통 좌측 레일을 구현한다.
 */

import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from './Toast'
import { useAsync } from '../lib/useAsync'
import { CommunityIcon, DeliveryIcon, HomeIcon, ReportIcon, RouteIcon } from './icons'

const NAV = [
  { to: '/', label: '홈 · 지도', Icon: HomeIcon },
  { to: '/route', label: '경로 비교', Icon: RouteIcon },
  { to: '/report', label: '불편한 길 제보', Icon: ReportIcon },
  { to: '/mission', label: '타슈 옮기기', Icon: DeliveryIcon },
  { to: '/community', label: '커뮤니티', Icon: CommunityIcon },
]

export default function DesktopSidebar({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: user } = useAsync(() => api.me(), [])

  return (
    <aside
      className={`w-[220px] shrink-0 flex-col border-r border-black/5 bg-white ${className}`}
    >
      {/* 로고 */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="px-6 pb-6 pt-7 text-left"
      >
        <p className="text-[22px] font-bold tracking-tight">
          타슈<span className="text-orange">+</span>
        </p>
        <p className="mt-0.5 text-[11px] text-navy/45">대전 공영자전거 확장 서비스</p>
      </button>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] transition-colors ${
                isActive
                  ? 'bg-cream font-bold text-navy'
                  : 'font-medium text-navy/60 hover:bg-cream/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-orange' : 'text-navy/40'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 하단 유저 카드 */}
      <div className="mt-auto px-4 pb-4">
        <button
          type="button"
          onClick={() => navigate('/pass')}
          className="flex w-full items-center gap-3 rounded-card bg-cream px-3.5 py-3 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-[15px] font-bold text-brand">
            {user ? user.name.slice(-2, -1) : '나'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{user?.name ?? '김나희'}</p>
            <p className="text-[11px] text-navy/50">
              Lv.{user?.level ?? 3} · {(user?.points ?? 2500).toLocaleString()}P
            </p>
          </div>
        </button>
        <div className="mt-3 flex gap-3 px-1 text-[12px] text-navy/45">
          <button type="button" onClick={() => navigate('/settings')} className="hover:text-navy">
            설정
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => showToast('로그아웃되었습니다. (데모)')}
            className="hover:text-navy"
          >
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  )
}
