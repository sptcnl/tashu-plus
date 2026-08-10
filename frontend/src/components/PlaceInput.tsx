import { useState } from 'react'
import { LocateIcon, PinIcon } from './icons'
import type { LatLng, Station } from '../types'

export interface Place {
  name: string
  coord: LatLng
}

/**
 * 출발/도착 입력 한 줄.
 *
 * 자유 텍스트는 백엔드 /geocode 로 좌표를 찾지만, 카카오 REST 키가 없으면 거점 이름만
 * 검색된다. 그래서 항상 고를 수 있는 거점 자동완성 목록을 함께 띄워서
 * 키가 없어도 아무 거점으로나 경로를 바꿀 수 있게 한다.
 */
export default function PlaceInput({
  dotColor,
  placeholder,
  text,
  onTextChange,
  stations,
  onPick,
  onSubmit,
  onUseCurrentLocation,
  error,
}: {
  dotColor: string
  placeholder: string
  text: string
  onTextChange: (value: string) => void
  stations: Station[]
  onPick: (place: Place) => void
  onSubmit: () => void
  onUseCurrentLocation?: () => void
  error?: string | null
}) {
  const [open, setOpen] = useState(false)

  const needle = text.trim().replace(/\s/g, '')
  const matches = stations
    .filter((s) => !needle || s.name.replace(/\s/g, '').includes(needle))
    .slice(0, 6)

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        <input
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // 목록 항목 클릭이 먼저 처리되도록 blur 를 살짝 늦춘다.
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setOpen(false)
              onSubmit()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-navy/35"
        />
        {onUseCurrentLocation && (
          <button
            type="button"
            onClick={onUseCurrentLocation}
            aria-label="현재 위치로 설정"
            className="shrink-0 text-navy/35 active:text-brand"
          >
            <LocateIcon className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 pl-[22px] text-[11px] leading-snug text-warn">{error}</p>}

      {/* 거점 자동완성 */}
      {open && matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-2 max-h-[212px] overflow-y-auto rounded-xl border border-black/5 bg-white py-1 shadow-float">
          {matches.map((station) => (
            <li key={station.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  onPick({
                    name: `${station.name} 거점`,
                    coord: { lat: station.lat, lng: station.lng },
                  })
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-cream"
              >
                <PinIcon className="h-4 w-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {station.name} 거점
                </span>
                <span className="shrink-0 text-[11px] text-navy/40">
                  {station.available_bikes}대
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
