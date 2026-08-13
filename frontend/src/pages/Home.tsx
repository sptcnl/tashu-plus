import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import ChipScroller from '../components/ChipScroller'
import { useDrawer } from '../components/Drawer'
import { useLocation } from '../components/LocationProvider'
import StationMap from '../components/map/StationMap'
import { DAEJEON_CENTER } from '../components/map/constants'
import TabBar from '../components/TabBar'
import { useToast } from '../components/Toast'
import {
  BellIcon,
  CloudIcon,
  LocateIcon,
  MenuIcon,
  RefreshIcon,
  ReportIcon,
  SearchIcon,
} from '../components/icons'
import { AMENITY_META } from '../components/map/constants'
import { amenityLabel } from '../lib/format'
import { distanceM } from '../lib/geo'
import { useAsync } from '../lib/useAsync'
import type { Amenity, AmenityKind, LatLng, Station } from '../types'

type Filter = '전체' | '거점' | AmenityKind

const FILTERS: Filter[] = ['전체', '거점', '화장실', '음수대', '바람주입', '맛집']
const AMENITY_KINDS: AmenityKind[] = ['화장실', '음수대', '바람주입', '맛집']

/** 내 위치 주변 거점 검색 반경 (도보 10분 정도) */
const NEARBY_RADIUS_M = 800

/** 편의시설(화장실/음수대/맛집…) 검색 반경 — 거점보다 넓게 훑는다 */
const AMENITY_RADIUS_M = 3000

/** 이 거리 이상 지도를 옮기면 '이 지역 검색' 버튼을 띄운다 */
const AMENITY_RESEARCH_M = 1500

export default function Home() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { openDrawer } = useDrawer()
  const { showToast } = useToast()
  const [filter, setFilter] = useState<Filter>('전체')
  const [selected, setSelected] = useState<Station | null>(null)
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null)
  const [center, setCenter] = useState<LatLng | null>(null)
  const [showNearby, setShowNearby] = useState(false)
  /** 편의시설을 검색한 기준점 (null 이면 내 위치 기준) */
  const [amenitySearchAt, setAmenitySearchAt] = useState<LatLng | null>(null)
  /** 사용자가 지도를 옮긴 현재 중심 — '이 지역 검색' 버튼 표시 판단에 쓴다 */
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null)

  // 앱 진입 시 받아둔 위치 (LocationProvider)
  const { coord, status: locStatus, request: requestLocation } = useLocation()

  // 경로 화면에서 '도착지 주변 보기' 로 넘어온 좌표 (?lat=&lng=)
  const focusParam = (() => {
    const lat = Number(params.get('lat'))
    const lng = Number(params.get('lng'))
    return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0
      ? { lat, lng, label: params.get('label') ?? '' }
      : null
  })()

  // 위치를 처음 받으면 지도를 그쪽으로 한 번 옮긴다 (이후엔 사용자 조작 우선).
  // 단, ?lat/?lng 로 특정 지점을 지정해서 들어왔으면 그 지점이 우선이다.
  const centeredOnce = useRef(false)
  useEffect(() => {
    if (focusParam && !centeredOnce.current) {
      centeredOnce.current = true
      setCenter({ lat: focusParam.lat, lng: focusParam.lng })
      setAmenitySearchAt({ lat: focusParam.lat, lng: focusParam.lng })
      return
    }
    if (coord && !centeredOnce.current) {
      centeredOnce.current = true
      setCenter(coord)
    }
  }, [coord, focusParam])

  const stations = useAsync(() => api.stations(), [])
  // 내 위치 기반 주변 거점 검색 (좌표가 생기면 자동 조회)
  const nearby = useAsync(
    () => (coord ? api.nearbyStations(coord.lat, coord.lng, NEARBY_RADIUS_M) : Promise.resolve(null)),
    [coord?.lat, coord?.lng],
  )
  // 제보는 홈 지도에 빨간 핀으로 표시된다 (제보 화면에서 등록하면 여기 반영).
  const reports = useAsync(() => api.reports(), [])
  // 편의시설(화장실/음수대/바람주입/맛집)은 대여소와 별개 좌표의 독립 핀.
  // 카카오가 '가까운 순' 으로만 주기 때문에 기준점 주변만 나온다. 그래서 기준점을
  // 고정하지 않고, 처음엔 내 위치 → 이후엔 사용자가 '이 지역 검색' 한 지점으로 바꾼다.
  const amenityCenter = amenitySearchAt ?? coord
  const amenities = useAsync(
    () => api.amenities(undefined, amenityCenter ?? undefined, AMENITY_RADIUS_M),
    [amenityCenter?.lat, amenityCenter?.lng],
  )

  const source = stations.data?.source ?? 'seed'
  const isDemoData = source === 'seed'

  // 필터에 따라 지도에 뿌릴 거점/편의시설을 나눈다.
  // 전체 = 거점 + 모든 편의시설, 거점 = 거점만, 그 외 = 해당 종류 편의시설만.
  const amenityFilter = AMENITY_KINDS.includes(filter as AmenityKind)
    ? (filter as AmenityKind)
    : null
  const showStations = filter === '전체' || filter === '거점'
  const visible = showStations ? (stations.data?.stations ?? []) : []
  const allAmenities = amenities.data?.amenities ?? []
  const visibleAmenities =
    filter === '전체'
      ? allAmenities
      : amenityFilter
        ? allAmenities.filter((a) => a.kind === amenityFilter)
        : []

  const selectStation = (station: Station) => {
    setSelectedAmenity(null)
    setSelected(station)
  }
  const selectAmenity = (amenity: Amenity) => {
    setSelected(null)
    setSelectedAmenity(amenity)
  }

  const refresh = () => {
    stations.reload()
    reports.reload()
    amenities.reload()
    setSelected(null)
    setSelectedAmenity(null)
    showToast('거점 정보를 갱신했어요.')
  }

  /**
   * '내위치' 버튼: 지도를 내 위치로 옮기고 주변 정보를 다시 불러온다.
   * (편의시설 기준점도 내 위치로 되돌리므로 별도 '되돌리기' 버튼이 필요 없다)
   */
  const locateMe = async () => {
    if (locStatus === 'unsupported') {
      showToast('이 브라우저에서는 위치 정보를 쓸 수 없어요.', 'error')
      return
    }

    const target = coord ?? (showToast('현재 위치를 확인하는 중…'), await requestLocation())
    if (!target) {
      // 권한 거부/실패 시에도 데모가 끊기지 않게 대전시청으로 이동한다.
      setCenter({ ...DAEJEON_CENTER })
      showToast('위치 권한이 없어 대전시청 기준으로 이동했어요.', 'error')
      return
    }

    // 새 객체를 넘겨야 같은 좌표로도 다시 이동한다 (Recenter 주석 참고).
    setCenter({ ...target })
    setSelected(null)
    setSelectedAmenity(null)
    setShowNearby(true)

    // 편의시설 기준점을 내 위치로 되돌린다. 이미 내 위치 기준이면 값이 안 바뀌어
    // 자동 재조회가 안 되므로 그때만 강제로 다시 불러온다.
    if (amenitySearchAt) {
      setAmenitySearchAt(null)
    } else {
      amenities.reload()
    }
    // 잔여 대수는 계속 변하니 주변 목록도 새로 받는다.
    nearby.reload()
    showToast('내 위치와 주변 정보를 갱신했어요.', 'success')
  }

  const nearbyStations = nearby.data?.stations ?? []

  // 편의시설을 마지막으로 검색한 지점에서 충분히 멀어지면 '이 지역 검색' 을 띄운다.
  // (자동 재검색은 지도를 조금 움직일 때마다 카카오를 때려서 쓰지 않는다)
  const movedAway =
    !!mapCenter && !!amenityCenter && distanceM(mapCenter, amenityCenter) > AMENITY_RESEARCH_M
  const showAmenityPins = filter === '전체' || !!amenityFilter

  const searchThisArea = () => {
    if (!mapCenter) return
    setAmenitySearchAt(mapCenter)
    showToast('이 지역 편의시설을 검색했어요.', 'success')
  }

  return (
    <div className="flex h-full flex-col">
      {/* ---------------- 헤더 ---------------- */}
      <header className="relative z-20 shrink-0 bg-white pb-3 pt-3 shadow-card">
        <div className="relative flex h-11 items-center justify-center lg:hidden">
          <button
            type="button"
            onClick={openDrawer}
            aria-label="메뉴 열기"
            className="absolute left-3 flex h-10 w-10 items-center justify-center"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="text-[20px] font-bold tracking-tight">
            타슈<span className="text-orange">+</span>
          </h1>
          <button
            type="button"
            onClick={() => navigate('/notice')}
            aria-label="알림"
            className="absolute right-3 flex h-10 w-10 items-center justify-center"
          >
            <BellIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 검색바 */}
        <div className="px-5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/route')}
            className="flex h-12 w-full items-center gap-2.5 rounded-xl bg-cream px-4 text-left"
          >
            <SearchIcon className="h-[18px] w-[18px] text-navy/40" />
            <span className="text-[14px] text-navy/45">어디로 갈까요?</span>
          </button>
        </div>

        {/* 필터 칩 (가로 스크롤) */}
        <div className="mt-3">
          <ChipScroller>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`chip ${filter === f ? 'chip-active' : ''}`}
              >
                {f}
              </button>
            ))}
          </ChipScroller>
        </div>
      </header>

      {/* ---------------- 지도 ---------------- */}
      <div className="relative flex-1 overflow-hidden">
        <StationMap
          className="h-full"
          stations={visible}
          reports={reports.data ?? []}
          amenities={visibleAmenities}
          selectedStationId={selected?.id ?? null}
          onStationClick={selectStation}
          onAmenityClick={selectAmenity}
          center={center}
          onCenterChanged={setMapCenter}
          // 폴백(CSS 지도)에서 플로팅 버튼/CTA 를 피해 핀을 배치한다.
          fallbackInsets={{ top: 9, right: 23, bottom: 27, left: 10 }}
        />

        {/* 실시간/데모 데이터 표시 + 내 주변 검색 결과 */}
        <div className="absolute left-3.5 top-4 z-20 flex flex-col items-start gap-2">
          <span
            className={`rounded-md px-2 py-1 text-[10px] font-bold shadow-card ${
              isDemoData ? 'bg-navy/70 text-white' : 'bg-mint text-white'
            }`}
          >
            {isDemoData ? '데모 데이터' : '실시간'}
          </span>

          {locStatus === 'denied' && (
            <span className="rounded-md bg-warn/90 px-2 py-1 text-[10px] font-bold text-white shadow-card">
              위치 권한 없음
            </span>
          )}
          {amenitySearchAt && (
            // 어디 기준으로 보고 있는지만 알려준다. 되돌리기는 우측 '내위치' 버튼이 한다.
            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-navy/55 shadow-card">
              {focusParam?.label ? `${focusParam.label} 주변` : '지정한 지역 주변'}
            </span>
          )}
        </div>

        {/*
          편의시설은 카카오가 '기준점에서 가까운 순' 으로만 주기 때문에, 도착지 주변을
          보려면 기준점을 옮겨야 한다. 지도를 옮기면 이 버튼이 떠서 그 지역을 검색한다.
          (지도 이동마다 자동 재검색하면 카카오 호출이 과해진다)
        */}
        {showAmenityPins && movedAway && (
          <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2">
            <button
              type="button"
              onClick={searchThisArea}
              disabled={amenities.loading}
              className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[12px] font-bold text-white shadow-float active:scale-95 disabled:opacity-60"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              {amenities.loading ? '검색 중…' : '이 지역 편의시설 검색'}
            </button>
          </div>
        )}

        {/* 내 주변 거점 목록 (가까운 순) */}
        {showNearby && coord && (
          <div className="absolute inset-x-5 top-16 z-30 lg:left-auto lg:right-5 lg:w-[360px]">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
                <p className="text-[13px] font-bold">
                  내 주변 거점{' '}
                  <span className="font-medium text-navy/45">
                    {nearby.loading
                      ? '검색 중…'
                      : `${NEARBY_RADIUS_M}m · ${nearbyStations.length}곳`}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowNearby(false)}
                  aria-label="닫기"
                  className="px-1 text-[16px] leading-none text-navy/35"
                >
                  ×
                </button>
              </div>
              <ul className="max-h-[210px] overflow-y-auto">
                {nearbyStations.length === 0 && !nearby.loading && (
                  <li className="px-4 py-5 text-center text-[12px] text-navy/45">
                    반경 {NEARBY_RADIUS_M}m 안에 거점이 없어요.
                  </li>
                )}
                {nearbyStations.map((s) => (
                  <li key={s.id} className="border-b border-black/5 last:border-0">
                    <button
                      type="button"
                      onClick={() => {
                        selectStation(s)
                        setCenter({ lat: s.lat, lng: s.lng })
                        setShowNearby(false)
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-cream"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                          s.available_bikes === 0 ? 'bg-navy/35' : 'bg-brand'
                        }`}
                      >
                        {s.available_bikes}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {s.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-navy/45">
                        {Math.round(s.distance_m)}m
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 우측 플로팅 버튼 */}
        <div className="absolute right-3.5 top-4 z-20 flex flex-col gap-2.5">
          {[
            { label: '제보', Icon: ReportIcon, onClick: () => navigate('/report') },
            {
              label: '날씨',
              Icon: CloudIcon,
              // PLACEHOLDER: 기상청 API 연동 전 mock 안내
              onClick: () => showToast('맑음 27°C · 라이딩하기 좋아요!'),
            },
            { label: '갱신', Icon: RefreshIcon, onClick: refresh },
            { label: '내위치', Icon: LocateIcon, onClick: locateMe },
          ].map(({ label, Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex h-[54px] w-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-white text-navy shadow-float active:scale-95"
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* 로딩 / 에러 오버레이 */}
        {stations.loading && (
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white/90 px-4 py-2 text-[13px] font-medium shadow-card">
            거점 불러오는 중…
          </div>
        )}
        {stations.error && (
          <div className="absolute inset-x-5 top-14 z-20 rounded-xl bg-warn px-4 py-3 text-[12px] font-medium text-white shadow-float">
            {stations.error}
            <button type="button" onClick={stations.reload} className="ml-2 underline">
              다시 시도
            </button>
          </div>
        )}

        {/* 편의시설 핀 탭 시 하단 카드 */}
        {selectedAmenity && (
          <div className="absolute inset-x-5 bottom-[148px] z-20 lg:left-auto lg:right-5 lg:w-[380px]">
            {/* 닫기 버튼 절대배치 + pr-9 로 긴 이름과 겹치지 않게 */}
            <div className="card relative p-4 pr-9">
              <button
                type="button"
                onClick={() => setSelectedAmenity(null)}
                aria-label="닫기"
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none text-navy/30 active:bg-cream"
              >
                ×
              </button>
              <div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[18px] leading-none">
                      {AMENITY_META[selectedAmenity.kind].emoji}
                    </span>
                    <p className="min-w-0 break-words text-[15px] font-bold">
                      {selectedAmenity.name}
                    </p>
                    <span
                      style={{ color: AMENITY_META[selectedAmenity.kind].color }}
                      className="shrink-0 rounded bg-cream px-1.5 py-0.5 text-[10px] font-bold"
                    >
                      {AMENITY_META[selectedAmenity.kind].label}
                    </span>
                  </div>
                  {selectedAmenity.description && (
                    <p className="mt-1.5 break-words text-[12px] text-navy/55">
                      {selectedAmenity.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/route?from_lat=${selectedAmenity.lat}&from_lng=${selectedAmenity.lng}` +
                      `&from_name=${encodeURIComponent(selectedAmenity.name)}`,
                  )
                }
                className="mt-3 text-[13px] font-bold text-brand"
              >
                &gt; 여기로 길찾기
              </button>
            </div>
          </div>
        )}

        {/* 핀 탭 시 하단 거점 카드 (대여하기 CTA 바로 위) */}
        {selected && (
          <div className="absolute inset-x-5 bottom-[148px] z-20 lg:left-auto lg:right-5 lg:w-[380px]">
            {/* 닫기 버튼은 절대배치 + pr-9 로 자리를 비워, 긴 이름과 겹치지 않게 한다 */}
            <div className="card relative p-4 pr-9">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="닫기"
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[18px] leading-none text-navy/30 active:bg-cream"
              >
                ×
              </button>
              <div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 break-words text-[15px] font-bold">
                      {selected.name} 거점
                    </p>
                    {isDemoData && (
                      <span className="shrink-0 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy/60">
                        데모 데이터
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 break-words text-[12px] text-navy/55">
                    {selected.available_bikes === 0
                      ? '이용 가능한 자전거가 없어요'
                      : `이용 가능 ${selected.available_bikes}대`}
                    {selected.rack_count > 0 && ` / 거치대 ${selected.rack_count}`}
                    {amenityLabel(selected).length > 0 &&
                      ` · ${amenityLabel(selected).join(' · ')}`}
                  </p>
                  {selected.nearby_spots.length > 0 && (
                    <p className="mt-1 break-words text-[11px] text-navy/40">
                      주변: {selected.nearby_spots.join(', ')}
                    </p>
                  )}
                  {selected.address && (
                    <p className="mt-1 break-words text-[11px] text-navy/35">{selected.address}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/route?from_lat=${selected.lat}&from_lng=${selected.lng}` +
                      `&from_name=${encodeURIComponent(`${selected.name} 거점`)}`,
                  )
                }
                className="mt-3 text-[13px] font-bold text-brand"
              >
                &gt; 여기서 출발하기
              </button>
            </div>
          </div>
        )}

        {/* 대여하기 CTA */}
        <div className="absolute inset-x-5 bottom-[88px] z-10 lg:left-auto lg:right-5 lg:bottom-5 lg:w-[380px]">
          <button
            type="button"
            disabled={!!selected && selected.available_bikes === 0}
            onClick={() =>
              showToast(
                selected
                  ? `${selected.name} 거점에서 대여를 시작합니다. (데모)`
                  : '대여를 시작합니다. (데모)',
                'success',
              )
            }
            className="cta"
          >
            {selected && selected.available_bikes === 0 ? '대여 가능한 자전거 없음' : '대여하기'}
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
