import { NavLink } from 'react-router-dom'
import { CommunityIcon, DeliveryIcon, HomeIcon, ReportIcon, RouteIcon } from './icons'

// '배달' 탭은 타슈 옮기기(재배치 미션)와 같은 기능이므로 /mission 으로 연결한다.
const TABS = [
  { to: '/', label: '홈', Icon: HomeIcon },
  { to: '/route', label: '경로', Icon: RouteIcon },
  { to: '/report', label: '제보', Icon: ReportIcon },
  { to: '/mission', label: '배달', Icon: DeliveryIcon },
  { to: '/community', label: '커뮤니티', Icon: CommunityIcon },
]

export default function TabBar() {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 flex h-[72px] items-start border-t border-black/5 bg-white pt-2.5">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="flex-1">
          {({ isActive }) => (
            <div
              className={`flex flex-col items-center gap-1 ${isActive ? 'text-orange' : 'text-navy/40'}`}
            >
              <Icon className="h-[22px] w-[22px]" />
              <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
