import type { LayoutKind } from '../lib/types'

type IconProps = { size?: number }

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const SoundOn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 5a10 10 0 0 1 0 14" />
  </Svg>
)

export const SoundOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </Svg>
)

export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
  </Svg>
)

export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
)

export const External = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Svg>
)

export const Undo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
)

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const Sparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />
  </Svg>
)

export const Trash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
  </Svg>
)

export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
)

export const Gear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
)

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
)

export const Expand = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </Svg>
)

export const Retry = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Svg>
)

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)

// Tiny diagrams of each layout preset, for the layout switcher.
const LAYOUT_RECTS: Record<LayoutKind, [number, number, number, number][]> = {
  grid: [
    [1, 1, 6, 6], [8.5, 1, 6, 6], [16, 1, 6, 6],
    [1, 8.5, 6, 6], [8.5, 8.5, 6, 6], [16, 8.5, 6, 6],
    [1, 16, 6, 6], [8.5, 16, 6, 6], [16, 16, 6, 6],
  ],
  'main-strip': [
    [1, 1, 15, 15], [17.5, 1, 4.5, 4.5], [17.5, 6.25, 4.5, 4.5], [17.5, 11.5, 4.5, 4.5],
    [1, 17.5, 4.5, 4.5], [6.25, 17.5, 4.5, 4.5], [11.5, 17.5, 4.5, 4.5], [17.5, 17.5, 4.5, 4.5],
  ],
  'main-sidebar': [
    [1, 1, 15, 21], [17.5, 1, 4.5, 4.5], [17.5, 6.5, 4.5, 4.5], [17.5, 12, 4.5, 4.5], [17.5, 17.5, 4.5, 4.5],
  ],
  'main-2x2': [
    [1, 1, 13.5, 13.5], [16, 1, 6, 6], [16, 8.5, 6, 6],
    [1, 16, 6, 6], [8.5, 16, 6, 6], [16, 16, 6, 6],
  ],
}

export function LayoutGlyph({ kind, size = 18 }: { kind: LayoutKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" aria-hidden="true">
      {LAYOUT_RECTS[kind].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="1" fill="currentColor" opacity={i === 0 && kind !== 'grid' ? 1 : 0.55} />
      ))}
    </svg>
  )
}
