import { api } from '../api'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { comma, dateTimeLabel } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, SectionHeader } from '../components/ui'

export default function History() {
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync(() => api.rides(), [])

  const rides = data ?? []
  const totalHours = (rides.reduce((sum, r) => sum + r.duration_min, 0) / 60).toFixed(1)
  const month = new Date().getMonth() + 1

  return (
    <Screen title="이용 내역">
      <SectionHeader
        title={`${month}월`}
        right={rides.length > 0 ? `총 ${rides.length}회 · ${totalHours}시간` : undefined}
      />

      {(loading || error) && <AsyncState loading={loading} error={error} onRetry={reload} />}
      {!loading && !error && rides.length === 0 && <AsyncState empty="이용 내역이 없습니다." />}

      <div className="space-y-3">
        {rides.map((r) => (
          <article key={r.id} className="card p-4">
            <p className="text-[12px] text-navy/45">{dateTimeLabel(r.created_at)}</p>
            <p className="mt-1.5 text-[14px] font-bold">
              {r.from_station} &gt; {r.to_station}
            </p>
            <p className="mt-1.5 text-[12px] text-navy/55">
              {r.duration_min}분 · {r.cost === 0 ? '0원' : `${comma(r.cost)}원`}
            </p>
          </article>
        ))}
      </div>

      {rides.length > 0 && (
        <button
          type="button"
          onClick={() => showToast('데모에는 표시된 내역까지만 있습니다.')}
          className="mt-5 h-11 w-full rounded-xl bg-white text-[13px] font-medium text-navy/60 shadow-card"
        >
          지난 내역 더보기
        </button>
      )}
    </Screen>
  )
}
