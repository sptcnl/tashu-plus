import { api } from '../api'
import Screen from '../components/Screen'
import { shortDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, Badge } from '../components/ui'

export default function NoticeList() {
  const { data, loading, error, reload } = useAsync(() => api.notices(), [])

  return (
    <Screen title="공지사항">
      {(loading || error) && <AsyncState loading={loading} error={error} onRetry={reload} />}
      {!loading && !error && data?.length === 0 && <AsyncState empty="등록된 공지가 없습니다." />}

      <div className="space-y-3">
        {(data ?? []).map((n) => (
          <article key={n.id} className="card p-4">
            <div className="flex items-start gap-2">
              {n.is_important && <Badge tone="red">중요</Badge>}
              <h3 className="flex-1 text-[14px] font-bold leading-snug">{n.title}</h3>
            </div>
            <p className="mt-2.5 text-[11px] text-navy/40">{shortDate(n.created_at)}</p>
          </article>
        ))}
      </div>
    </Screen>
  )
}
