/** 의존성 없이 쓰는 최소 인라인 SVG 아이콘 세트. currentColor 를 따른다. */

interface IconProps {
  className?: string
  filled?: boolean
}

const base = (className = 'h-5 w-5') => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const HomeIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
)

export const RouteIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8.5 18h5a4 4 0 0 0 0-8h-3a4 4 0 0 1 0-8" transform="translate(0 2)" />
  </svg>
)

export const ReportIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 4v10" />
    <circle cx="12" cy="18.5" r="1.2" fill="currentColor" stroke="none" />
    <path d="M12 3 2.5 20h19L12 3Z" />
  </svg>
)

export const DeliveryIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z" />
    <path d="M3 8.5 12 13l9-4.5M12 13v7" />
  </svg>
)

export const CommunityIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" />
  </svg>
)

export const BellIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </svg>
)

export const MenuIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

export const CloseIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M14.5 5 8 12l6.5 7" />
  </svg>
)

export const ChevronRightIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </svg>
)

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M5 9.5 12 16l7-6.5" />
  </svg>
)

export const SearchIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)

export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const HeartIcon = ({ className, filled }: IconProps) => (
  <svg {...base(className)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />
  </svg>
)

export const PinIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 21s6.5-6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.2" />
  </svg>
)

export const CloudIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M7 18h9.5a3.5 3.5 0 0 0 .2-7A5 5 0 0 0 7.3 11 3.5 3.5 0 0 0 7 18Z" />
  </svg>
)

export const RefreshIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M19 12a7 7 0 1 1-2.4-5.3" />
    <path d="M19.5 4v4h-4" />
  </svg>
)

export const LocateIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
  </svg>
)

export const PhoneIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M6 3.5h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5Z" />
  </svg>
)

export const CameraIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M4 8.5h3l1.5-2h7l1.5 2h3V19H4V8.5Z" />
    <circle cx="12" cy="13.5" r="3" />
  </svg>
)

export const BikeIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="6" cy="17" r="3.2" />
    <circle cx="18" cy="17" r="3.2" />
    <path d="M9 17l3.5-8H10m2.5 0 4 8M14 6h3" />
  </svg>
)

export const TrophyIcon = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5.5H5.5A2.5 2.5 0 0 0 8 9M16 5.5h2.5A2.5 2.5 0 0 1 16 9" />
    <path d="M12 12v3m-3 5h6l-.5-2h-5L9 20Z" />
  </svg>
)
