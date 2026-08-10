import { Navigate, Route, Routes } from 'react-router-dom'
import { DrawerProvider } from './components/Drawer'
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
      {/* 모바일 뷰포트 기준 프레임 (max-width 390px 중앙 정렬) */}
      <div className="mx-auto h-dvh w-full max-w-phone overflow-hidden bg-cream shadow-xl">
        <div className="relative h-full overflow-hidden">
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
    </ToastProvider>
  )
}
