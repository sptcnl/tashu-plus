import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Screen from '../components/Screen'
import { comma, shortDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, StatusBadge } from '../components/ui'

// PLACEHOLDER: 제보 1건당 적립 포인트는 실제 정책 확인 후 교체 예정
const POINTS_PER_REPORT = 100

export default function MyReports() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(() => api.myReports(), [])

  const reports = data ?? []
  const done = reports.filter((r) => r.status === '완료').length

  return (
    <Screen
      title="내 제보 현황"
      footer={
        <button type="button" onClick={() => navigate('/report')} className="cta">
          새 제보 작성
        </button>
      }
    >
      {/* 요약 카드 */}
      <div className="card p-4">
        <p className="text-[14px] font-bold">
          누적 제보 {reports.length}건 · 처리 완료 {done}건
        </p>
        <p className="mt-1.5 text-[12px] text-mint">
          제보 포인트 +{comma(reports.length * POINTS_PER_REPORT)}P 적립
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {(loading || error) && <AsyncState loading={loading} error={error} onRetry={reload} />}
        {!loading && !error && reports.length === 0 && (
          <AsyncState empty="아직 제보한 내역이 없어요." />
        )}

        {reports.map((r) => (
          <article key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-navy/45">{r.category}</p>
                <p className="mt-1.5 text-[14px] font-bold">
                  {r.description || '(설명 없음)'}
                </p>
                <p className="mt-2 text-[11px] text-navy/40">{shortDate(r.created_at)} 제보</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          </article>
        ))}
      </div>
    </Screen>
  )
}
