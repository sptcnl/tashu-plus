import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useLocation } from '../components/LocationProvider'
import StationMap from '../components/map/StationMap'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { CameraIcon } from '../components/icons'
import { useAsync } from '../lib/useAsync'
import { InfoBar } from '../components/ui'
import type { ReportCategory } from '../types'

const CATEGORIES: ReportCategory[] = ['공사구간', '불법주정차', '도로파손', '조명없음']

export default function ReportCreate() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  // 앱 진입 시 받아둔 내 위치 — 지도 첫 렌더링 중심으로 쓴다
  const { coord } = useLocation()

  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [description, setDescription] = useState('')
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 지도 배경으로 쓸 거점/기존 제보
  const { data: stations } = useAsync(() => api.stations(), [])
  const { data: reports } = useAsync(() => api.reports(), [])

  const canSubmit = !!point && !!category && !submitting

  const submit = async () => {
    if (!point || !category) return
    setSubmitting(true)
    try {
      await api.createReport({ category, description, lat: point.lat, lng: point.lng })
      showToast('제보가 접수되었습니다. 지도에 바로 반영됩니다.', 'success')
      // 홈 지도에서 새 빨간 핀을 확인할 수 있도록 이동한다.
      navigate('/')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '제보 등록에 실패했습니다.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen
      title="불편한 길 제보"
      tabBar
      footer={
        <button type="button" disabled={!canSubmit} onClick={submit} className="cta">
          {submitting ? '제보 중…' : '제보하기'}
        </button>
      }
    >
      {/* 위치 지정 지도 — 지도를 클릭하면 그 좌표가 POST /reports 에 실린다 */}
      <div className="overflow-hidden rounded-card shadow-card">
        <StationMap
          className="h-[220px]"
          stations={stations?.stations ?? []}
          reports={reports ?? []}
          marker={point}
          onMapClick={setPoint}
          // 첫 렌더링을 내 위치 중심으로 (제보할 곳은 보통 지금 있는 곳 근처)
          center={coord}
          level={5}
        />
      </div>
      <p className="mt-3 text-center text-[13px] font-medium text-navy/55">
        {point
          ? `위치 지정됨 · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
          : '지도를 눌러 위치를 지정하세요'}
      </p>

      {/* 유형 선택 */}
      <h2 className="mb-2.5 mt-6 text-[13px] font-bold">유형 선택</h2>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-chip px-3.5 py-2 text-[13px] font-medium transition-colors ${
              category === c
                ? 'bg-warn text-white'
                : 'border border-black/5 bg-white text-navy/70 shadow-card'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 상세 설명 */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="상세 설명을 입력하세요 (선택)"
        aria-label="상세 설명"
        className="mt-5 h-[90px] w-full resize-none rounded-card bg-white p-4 text-[14px] shadow-card outline-none placeholder:text-navy/35"
      />

      {/* 사진 첨부 UI */}
      <div className="mt-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex h-[90px] w-[110px] flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-navy/20 bg-white text-navy/45"
        >
          <CameraIcon />
          <span className="text-[12px] font-medium">+ 사진</span>
        </button>
        {photoName && (
          // PLACEHOLDER: 이미지 업로드 엔드포인트가 없어 파일명만 표시한다 (첨부 UI 데모).
          <p className="mt-2 text-[11px] text-navy/45">첨부됨: {photoName}</p>
        )}
      </div>

      <div className="mt-5">
        <InfoBar>제보 즉시 다른 사용자 지도에 실시간 반영됩니다</InfoBar>
      </div>
    </Screen>
  )
}
