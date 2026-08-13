import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import RouteMap from '../components/map/RouteMap'
import PlaceInput from '../components/PlaceInput'
import type { Place } from '../components/PlaceInput'
import Screen from '../components/Screen'
import { useToast } from '../components/Toast'
import { BikeIcon } from '../components/icons'
import { comma } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { AsyncState, Badge } from '../components/ui'
import type { LatLng, RouteCompare as RouteCompareData, RouteKey, RouteOption } from '../types'

export default function RouteCompare() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  // 홈 거점/편의시설 카드의 '여기서 출발하기' 에서 좌표를 넘겨받은 경우에만 출발지를 채운다.
  // 그 외에는 비워 두고, 사용자가 직접 입력해 '경로 찾기' 를 눌러야 조회한다.
  const initialOrigin: Place | null = (() => {
    const lat = Number(params.get('from_lat'))
    const lng = Number(params.get('from_lng'))
    const name = params.get('from_name')
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && name) {
      return { name, coord: { lat, lng } }
    }
    return null
  })()

  const [origin, setOrigin] = useState<Place | null>(initialOrigin)
  const [destination, setDestination] = useState<Place | null>(null)
  const [originText, setOriginText] = useState(initialOrigin?.name ?? '')
  const [destinationText, setDestinationText] = useState('')

  const [data, setData] = useState<RouteCompareData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 기본적으로 세 경로의 지도를 모두 펼쳐 둔다 (각각 접기/펼치기 가능).
  const [openKeys, setOpenKeys] = useState<Set<RouteKey>>(
    () => new Set<RouteKey>(['tashu', 'transit', 'walk']),
  )
  const toggleOpen = (key: RouteKey) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  // 어느 입력이 실패했는지 따로 보여준다 (토스트는 금방 사라져서 이유를 놓치기 쉽다).
  const [originError, setOriginError] = useState<string | null>(null)
  const [destinationError, setDestinationError] = useState<string | null>(null)

  // 거점 자동완성 목록 — 카카오 REST 키가 없어도 목적지를 바꿀 수 있게 해준다.
  const stations = useAsync(() => api.stations(), [])

  const compare = useCallback(async (from: Place, to: Place) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.compareRoutes(from.coord, to.coord, from.name, to.name)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '경로를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  // 자동 조회 없음: 출발/도착을 입력하고 '경로 찾기' 를 눌러야 계산한다.

  /**
   * 텍스트 하나를 좌표로 변환. 비어 있거나 못 찾으면 place=null 과 사유를 반환한다.
   * 이미 고른(또는 넘겨받은) 위치의 이름 그대로면 재검색 없이 그 좌표를 재사용한다.
   */
  const resolvePlace = async (
    text: string,
    current: Place | null,
  ): Promise<{ place: Place | null; error: string | null }> => {
    const query = text.trim()
    if (!query) return { place: null, error: null }
    if (current && query === current.name) return { place: current, error: null }
    try {
      const hit = await api.geocode(query)
      return { place: { name: hit.name, coord: { lat: hit.lat, lng: hit.lng } }, error: null }
    } catch (err) {
      return {
        place: null,
        error: err instanceof Error ? err.message : '위치를 찾지 못했습니다.',
      }
    }
  }

  /** 입력된 텍스트를 좌표로 바꾼 뒤, 둘 다 확정되면 경로를 조회한다. */
  const search = async () => {
    const [from, to] = await Promise.all([
      resolvePlace(originText, origin),
      resolvePlace(destinationText, destination),
    ])

    setOriginError(from.error)
    setDestinationError(to.error)
    if (from.place) {
      setOrigin(from.place)
      setOriginText(from.place.name)
    }
    if (to.place) {
      setDestination(to.place)
      setDestinationText(to.place.name)
    }

    // 출발지/도착지가 모두 확정돼야 조회한다.
    if (!from.place || !to.place) {
      const message =
        from.error ??
        to.error ??
        (!from.place ? '출발지를 입력해주세요.' : '도착지를 입력해주세요.')
      showToast(message, 'error')
      return
    }

    await compare(from.place, to.place)
  }

  /** 자동완성에서 거점을 고르면, 반대쪽도 이미 있으면 바로 경로를 계산한다. */
  const pickOrigin = (place: Place) => {
    setOrigin(place)
    setOriginText(place.name)
    setOriginError(null)
    if (destination) void compare(place, destination)
  }

  const pickDestination = (place: Place) => {
    setDestination(place)
    setDestinationText(place.name)
    setDestinationError(null)
    if (origin) void compare(origin, place)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('이 브라우저에서는 위치 정보를 쓸 수 없어요.', 'error')
      return
    }
    showToast('현재 위치를 확인하는 중…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pickOrigin({
          name: '현재 위치',
          coord: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        })
      },
      () => showToast('위치 권한이 없어 현재 위치를 쓸 수 없어요.', 'error'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const recommended = data?.options.find((o) => o.recommended) ?? data?.options[0]
  const stationList = stations.data?.stations ?? []

  return (
    <Screen
      title="경로 비교"
      tabBar
      footer={
        <button
          type="button"
          disabled={!recommended}
          onClick={() => showToast('타슈 경로 안내를 시작합니다. (데모)', 'success')}
          className="cta"
        >
          타슈 경로로 안내 시작
        </button>
      }
    >
      {/* 출발 / 도착 입력 (거점 자동완성 포함) */}
      <div className="card relative z-10 p-4">
        <PlaceInput
          dotColor="bg-brand"
          placeholder="출발지"
          text={originText}
          onTextChange={setOriginText}
          stations={stationList}
          onPick={pickOrigin}
          onSubmit={() => void search()}
          onUseCurrentLocation={useCurrentLocation}
          error={originError}
        />
        <div className="my-3 h-px bg-black/5" />
        <PlaceInput
          dotColor="bg-orange"
          placeholder="도착지"
          text={destinationText}
          onTextChange={setDestinationText}
          stations={stationList}
          onPick={pickDestination}
          onSubmit={() => void search()}
          error={destinationError}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading}
          className="h-10 flex-1 rounded-xl bg-brand text-[13px] font-bold text-white active:opacity-80 disabled:opacity-50"
        >
          {loading ? '경로 찾는 중…' : data ? '경로 다시 찾기' : '경로 찾기'}
        </button>
        {/*
          편의시설(맛집/화장실…)은 카카오가 기준점에서 가까운 순으로만 주기 때문에
          도착지 주변을 보려면 기준점을 옮겨야 한다. 그 좌표로 홈 지도를 열어준다.
          도착지가 정해지기 전에는 누를 게 없으니 숨긴다.
        */}
        {destination && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/?lat=${destination.coord.lat}&lng=${destination.coord.lng}` +
                  `&label=${encodeURIComponent(destination.name)}`,
              )
            }
            className="h-10 shrink-0 rounded-xl bg-white px-3 text-[12px] font-bold text-brand shadow-card active:opacity-80"
          >
            도착지 주변 보기
          </button>
        )}
      </div>

      <div className="mb-3 mt-6 flex items-end justify-between">
        <p className="text-[13px] font-medium text-navy/55">추천 경로 3가지를 비교해보세요</p>
        {data && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
              data.source === 'kakao' ? 'bg-mint/15 text-mint' : 'bg-navy/10 text-navy/55'
            }`}
          >
            {data.source === 'kakao' ? '카카오 경로' : '추정 경로'}
          </span>
        )}
      </div>

      {!loading && !error && !data && (
        <p className="mt-10 text-center text-[13px] text-navy/40">
          출발지와 도착지를 입력하고 경로를 찾아보세요.
        </p>
      )}

      {(loading || error) && (
        <AsyncState
          loading={loading}
          error={error}
          onRetry={() => {
            if (origin && destination) void compare(origin, destination)
          }}
        />
      )}

      {!loading && !error && data && (
        <div className="space-y-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-3 lg:space-y-0">
          {data.options.map((option) => (
            <RouteCard
              key={option.key}
              option={option}
              open={openKeys.has(option.key)}
              onToggle={() => toggleOpen(option.key)}
              origin={data.origin_coord}
              destination={data.destination_coord}
            />
          ))}
        </div>
      )}
    </Screen>
  )
}

function RouteCard({
  option,
  open,
  onToggle,
  origin,
  destination,
}: {
  option: RouteOption
  open: boolean
  onToggle: () => void
  origin: LatLng
  destination: LatLng
}) {
  const isTashu = option.key === 'tashu'

  return (
    <article
      className={`card overflow-hidden ${
        option.recommended ? 'border-2 border-orange' : 'border border-transparent'
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isTashu && <BikeIcon className="h-[18px] w-[18px] text-orange" />}
            <h3 className="text-[15px] font-bold">{option.mode}</h3>
          </div>
          {option.recommended && <Badge tone="orange">추천</Badge>}
        </div>

        <p className="mt-2.5 text-[14px] font-bold">
          {option.total_min}분 · {option.cost === 0 ? '0원' : `${comma(option.cost)}원`}
          {option.transfers > 0 && (
            <span className="font-medium text-navy/55"> · 환승 {option.transfers}회</span>
          )}
        </p>

        {isTashu ? (
          <>
            <p className="mt-2.5 text-[12px] text-navy/55">{option.summary}</p>
            <p className="mt-1.5 text-[12px] text-navy/45">
              {option.segments.map((s) => `${s.mode} ${s.duration_min}분`).join(' - ')}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-navy/50">{option.summary}</p>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          {/* 구간별 분해 */}
          {isTashu && option.segments.length > 0 && (
            <ul className="space-y-1.5 border-t border-black/5 pt-3">
              {option.segments.map((step, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px]">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      step.mode === '자전거'
                        ? 'bg-orange/15 text-orange'
                        : 'bg-navy/8 text-navy/60'
                    }`}
                  >
                    {step.mode}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-navy/65">
                    {step.description}
                  </span>
                  <span className="shrink-0 text-navy/40">{step.duration_min}분</span>
                </li>
              ))}
            </ul>
          )}

          {/* 경유 거점 실시간 상태 */}
          {isTashu && option.from_station && option.to_station && (
            <p className="mt-2.5 text-[11px] text-navy/45">
              {option.from_station.name} 대여 가능 {option.from_station.available_bikes}대 ·{' '}
              {option.to_station.name} 거치 여유{' '}
              {option.to_station.rack_count > 0
                ? `${Math.max(0, option.to_station.rack_count - option.to_station.available_bikes)}칸`
                : '확인 필요'}
            </p>
          )}

          {isTashu && option.danger_count > 0 && (
            <div className="mt-3">
              <Badge tone="red">⚠ 위험구간 {option.danger_count}곳</Badge>
            </div>
          )}

          {/* 미니 지도 */}
          <div className="mt-3">
            <RouteMap option={option} origin={origin} destination={destination} />
            {isTashu && (
              <p className="mt-2 text-[10px] text-navy/40">
                점선 = 도보 구간 · 오렌지 실선 = 타슈 주행 구간
              </p>
            )}
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full border-t border-black/5 py-2.5 text-[12px] font-medium text-brand"
        >
          지도로 보기
        </button>
      )}
    </article>
  )
}
