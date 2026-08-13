import { Navigate, Route, Routes } from 'react-router-dom'
import DesktopSidebar from './components/DesktopSidebar'
import { DrawerProvider } from './components/Drawer'
import { LocationProvider } from './components/LocationProvider'
import { ToastProvider } from './components/Toast'
import Community from './pages/Community'
import History from './pages/History'
import Home from './pages/Home'
import MissionPage from './pages/Mission'
import MyActivity from './pages/MyActivity'
import MyReports from './pages/MyReports'
import NoticeList from './pages/NoticeList'
import Pass from './pages/Pass'
import PostWrite from './pages/PostWrite'
import ReportCreate from './pages/ReportCreate'
import RouteCompare from './pages/RouteCompare'
import Settings from './pages/Settings'
import Support from './pages/Support'

export default function App() {
  return (
    <ToastProvider>
      {/* 진입 즉시 위치 권한을 요청해서 홈 지도 중심 / 주변 거점 검색에 쓴다 */}
      <LocationProvider>
      {/* 반응형 셸: 모바일은 390px 폰 프레임, lg 이상은 좌측 사이드바 + 넓은 본문 */}
      <div className="flex min-h-dvh justify-center bg-[#E7E4DE] lg:justify-start">
        <DesktopSidebar className="hidden lg:flex" />
        <div className="relative h-dvh w-full max-w-phone overflow-hidden bg-cream shadow-xl lg:max-w-none lg:flex-1 lg:shadow-none">
          <DrawerProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/route" element={<RouteCompare />} />
              <Route path="/report" element={<ReportCreate />} />
              <Route path="/community" element={<Community />} />
              <Route path="/mission" element={<MissionPage />} />
              {/* 배달 == 타슈 옮기기. 예전 /delivery 링크는 미션 화면으로 넘긴다. */}
              <Route path="/delivery" element={<Navigate to="/mission" replace />} />
              <Route path="/write" element={<PostWrite />} />
              <Route path="/pass" element={<Pass />} />
              <Route path="/history" element={<History />} />
              <Route path="/my-reports" element={<MyReports />} />
              <Route path="/my-activity" element={<MyActivity />} />
              <Route path="/notice" element={<NoticeList />} />
              <Route path="/support" element={<Support />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DrawerProvider>
        </div>
      </div>
      </LocationProvider>
    </ToastProvider>
  )
}
