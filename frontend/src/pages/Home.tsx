import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import ChipScroller from '../components/ChipScroller'
import { useDrawer } from '../components/Drawer'
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
import { useAsync } from '../lib/useAsync'
import type { Amenity, AmenityKind, LatLng, Station } from '../types'

type Filter = '전체' | '거점' | AmenityKind

const FILTERS: Filter[] = ['전체', '거점', '화장실', '음수대', '바람주입', '맛집']
const AMENITY_KINDS: AmenityKind[] = ['화장실', '음수대', '바람주입', '맛집']

export default function Home() {
  const navigate = useNavigate()
  const { openDrawer } = useDrawer()
  const { showToast } = useToast()
  const [filter, setFilter] = useState<Filter>('전체')
  const [selected, setSelected] = useState<Station | null>(null)
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null)
  const [center, setCenter] = useState<LatLng | null>(null)

  const stations = useAsync(() => api.stations(), [])
  // 제보는 홈 지도에 빨간 핀으로 표시된다 (제보 화면에서 등록하면 여기 반영).
  const reports = useAsync(() => api.reports(), [])
  // 편의시설(화장실/음수대/바람주입/맛집)은 대여소와 별개 좌표의 독립 핀.
  const amenities = useAsync(() => api.amenities(), [])

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

  const locateMe = () => {
    if (!navigator.geolocation) {
      showToast('이 브라우저에서는 위치 정보를 쓸 수 없어요.', 'error')
      return
    }
    showToast('현재 위치를 확인하는 중…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        showToast('현재 위치로 이동했어요.', 'success')
      },
      () => {
        // 권한 거부/실패 시에도 데모가 끊기지 않게 대전시청으로 이동한다.
        setCenter(DAEJEON_CENTER)
        showToast('위치 권한이 없어 대전시청 기준으로 이동했어요.', 'error')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
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
          // 폴백(CSS 지도)에서 플로팅 버튼/CTA 를 피해 핀을 배치한다.
          fallbackInsets={{ top: 9, right: 23, bottom: 27, left: 10 }}
        />

        {/* 실시간/데모 데이터 표시 */}
        <div className="absolute left-3.5 top-4 z-20">
          <span
            className={`rounded-md px-2 py-1 text-[10px] font-bold shadow-card ${
              isDemoData ? 'bg-navy/70 text-white' : 'bg-mint text-white'
            }`}
          >
            {isDemoData ? '데모 데이터' : '실시간'}
          </span>
        </div>

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
            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[18px] leading-none">
                      {AMENITY_META[selectedAmenity.kind].emoji}
                    </span>
                    <p className="text-[15px] font-bold">{selectedAmenity.name}</p>
                    <span
                      style={{ color: AMENITY_META[selectedAmenity.kind].color }}
                      className="rounded bg-cream px-1.5 py-0.5 text-[10px] font-bold"
                    >
                      {AMENITY_META[selectedAmenity.kind].label}
                    </span>
                  </div>
                  {selectedAmenity.description && (
                    <p className="mt-1.5 text-[12px] text-navy/55">
                      {selectedAmenity.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAmenity(null)}
                  aria-label="닫기"
                  className="-mr-1 -mt-1 px-2 text-[18px] leading-none text-navy/30"
                >
                  ×
                </button>
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
            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold">{selected.name} 거점</p>
                    {isDemoData && (
                      <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold text-navy/60">
                        데모 데이터
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[12px] text-navy/55">
                    {selected.available_bikes === 0
                      ? '이용 가능한 자전거가 없어요'
                      : `이용 가능 ${selected.available_bikes}대`}
                    {selected.rack_count > 0 && ` / 거치대 ${selected.rack_count}`}
                    {amenityLabel(selected).length > 0 &&
                      ` · ${amenityLabel(selected).join(' · ')}`}
                  </p>
                  {selected.nearby_spots.length > 0 && (
                    <p className="mt-1 text-[11px] text-navy/40">
                      주변: {selected.nearby_spots.join(', ')}
                    </p>
                  )}
                  {selected.address && (
                    <p className="mt-1 text-[11px] text-navy/35">{selected.address}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="닫기"
                  className="-mr-1 -mt-1 px-2 text-[18px] leading-none text-navy/30"
                >
                  ×
                </button>
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
