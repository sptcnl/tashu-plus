import { useState } from 'react'
import { api } from '../api'
import { useLocation } from '../components/LocationProvider'
import DensityMap from '../components/map/DensityMap'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { comma } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, SectionHeader } from '../components/ui'
import type { Mission } from '../types'

/** 미션 카드는 가로로 최대 3개까지만 노출한다. */
const MAX_MISSIONS = 3

export default function MissionPage() {
  const { showToast } = useToast()
  const [busyId, setBusyId] = useState<number | null>(null)
  // 집중도 지도를 내 위치 중심으로 띄운다 (앱 진입 시 받아둔 좌표)
  const { coord } = useLocation()

  const me = useAsync(() => api.me(), [])
  const missions = useAsync(() => api.missions(), [])
  const stations = useAsync(() => api.stations(), [])

  const act = async (mission: Mission) => {
    setBusyId(mission.id)
    try {
      const result =
        mission.status === '대기'
          ? await api.acceptMission(mission.id)
          : await api.completeMission(mission.id)

      // 목록의 해당 미션만 갈아끼워 상태 변경을 즉시 반영한다.
      missions.setData(
        (missions.data ?? []).map((m) => (m.id === result.mission.id ? result.mission : m)),
      )
      // 완료 시 적립된 포인트를 카드에 반영한다.
      if (me.data) me.setData({ ...me.data, points: result.user_points })
      showToast(result.message, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '요청에 실패했습니다.', 'error')
      missions.reload()
    } finally {
      setBusyId(null)
    }
  }

  const user = me.data
  const progress = user ? Math.min(100, (user.points / user.next_level_points) * 100) : 0

  // 완료된 미션은 뒤로 밀어서, 아직 할 수 있는 미션이 3칸을 차지하게 한다.
  const sortedMissions = [...(missions.data ?? [])].sort(
    (a, b) => Number(a.status === '완료') - Number(b.status === '완료'),
  )
  const totalMissions = sortedMissions.length
  const visibleMissions = sortedMissions.slice(0, MAX_MISSIONS)

  return (
    <Screen title="타슈 옮기기" tabBar>
      {/* 포인트 / 레벨 카드 */}
      <div className="card p-4">
        <p className="text-[11px] font-medium text-navy/50">내 포인트</p>
        <p className="mt-1 text-[18px] font-bold">
          <span className="text-orange">{comma(user?.points ?? 0)}P</span>
          <span className="ml-2 text-[14px] font-medium text-navy/60">
            Lv.{user?.level ?? '-'} {user?.level_title ?? ''}
          </span>
        </p>
        <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-navy/10">
          <div
            className="h-full rounded-full bg-orange transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-navy/45">
          다음 레벨까지 {comma(Math.max(0, (user?.next_level_points ?? 0) - (user?.points ?? 0)))}P
        </p>
      </div>

      {/* 미션 목록 — 최대 3개를 가로로 (데스크톱 3열 / 모바일 스냅 스크롤) */}
      <div className="mt-6">
        <SectionHeader
          title="지금 옮기면 보상받는 미션"
          right={
            totalMissions > MAX_MISSIONS ? `${MAX_MISSIONS}개 표시 · 총 ${totalMissions}개` : undefined
          }
        />
        {(missions.loading || missions.error) && (
          <AsyncState
            loading={missions.loading}
            error={missions.error}
            onRetry={missions.reload}
          />
        )}
        {!missions.loading && !missions.error && visibleMissions.length === 0 && (
          <AsyncState empty="지금은 옮길 미션이 없어요." />
        )}

        {/* 모바일: 세로 한 줄씩 / 데스크톱(lg): 3열 가로 */}
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
          {visibleMissions.map((m) => (
            <article
              key={m.id}
              className="card flex items-center justify-between gap-3 p-4 lg:flex-col lg:items-stretch"
            >
              {/* min-w-0 이 있어야 안쪽 truncate 가 동작한다 */}
              <div className="min-w-0">
                {/* 실데이터 거점명이 길어서 한 줄씩 잘라 보여준다 */}
                <p className="truncate text-[13px] font-bold" title={`${m.from_station_name} 거점`}>
                  {m.from_station_name} 거점
                </p>
                <p className="my-0.5 text-[11px] font-medium text-navy/40">↓ {m.distance_km}km</p>
                <p className="truncate text-[13px] font-bold" title={`${m.to_station_name} 거점`}>
                  {m.to_station_name} 거점
                </p>
                <p className="mt-2 text-[11px] text-navy/55">자전거 과잉 → 부족</p>
                <p className="mt-1 text-[13px] font-bold text-mint">+{comma(m.reward_points)}P</p>
              </div>

              {m.status === '완료' ? (
                <span className="shrink-0 rounded-lg bg-mint/12 px-3 py-2 text-center text-[13px] font-bold text-mint lg:mt-3">
                  완료
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busyId === m.id}
                  onClick={() => act(m)}
                  className={`h-9 shrink-0 rounded-lg px-4 text-[13px] font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50 lg:mt-3 lg:w-full ${
                    m.status === '대기' ? 'bg-orange' : 'bg-brand'
                  }`}
                >
                  {busyId === m.id ? '처리 중…' : m.status === '대기' ? '수락' : '완료 처리'}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* 집중도 지도 — 거치대 대비 잔여 비율 기준 */}
      <div className="mt-6">
        <SectionHeader
          title="거점별 집중도 지도"
          right={stations.data?.source === 'live' ? '실시간' : '데모 데이터'}
        />
        <div className="card overflow-hidden">
          <div className="flex items-center gap-5 px-4 py-3">
            <Legend color="#E0533D" label="과잉" />
            <Legend color="#2B7EC1" label="부족" />
            <Legend color="#00A870" label="적정" />
          </div>
          <DensityMap
            className="h-[240px]"
            stations={stations.data?.stations ?? []}
            center={coord}
          />
          <p className="px-4 py-2.5 text-[10px] text-navy/40">
            원 크기는 거치대 대비 잔여 비율이 치우친 정도예요 (과잉 70% 이상 / 부족 20% 이하).
          </p>
        </div>
      </div>
    </Screen>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[12px] text-navy/60">{label}</span>
    </div>
  )
}
