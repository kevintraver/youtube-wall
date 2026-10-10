import { shortcutHint } from '../commands/hint'
import { clearAll, closeSearch, copyShareLink, openSearch, toggleFullscreen } from '../lib/actions'
import { LAYOUT_LABELS } from '../lib/layouts'
import type { LayoutKind } from '../lib/types'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { MAX_SIDE, useWall } from '../state/wall'
import { Close, Expand, Gear, LayoutGlyph, LinkIcon, Search, SoundOn, Trash } from './icons'

const LAYOUTS = Object.keys(LAYOUT_LABELS) as LayoutKind[]
const SIDES = Array.from({ length: MAX_SIDE }, (_, i) => i + 1)

function ApiStatus() {
  const apiKey = useSettings((s) => s.apiKey)
  const keyStatus = useSettings((s) => s.keyStatus)
  const quotaUsedUp = useSettings((s) => s.quotaExhaustedUntil > 0)
  const setUi = useUi((s) => s.set)

  let label: string | null = null
  let tone = 'muted'
  if (!apiKey) label = 'No API key'
  else if (keyStatus === 'bad') [label, tone] = ['API key rejected', 'warn']
  else if (quotaUsedUp) [label, tone] = ['API quota used up', 'warn']
  if (!label) return null

  return (
    <button className={`status-chip ${tone}`} onClick={() => setUi({ settingsOpen: true })}>
      {label}
    </button>
  )
}

// Which tile is making sound, visible at a glance; click to find it, ✕ to mute everything.
function SoundStatus() {
  const audioSlotId = useWall((s) => (s.slots.some((slot) => slot.id === s.audioSlotId && slot.source) ? s.audioSlotId : null))
  const muteAll = useWall((s) => s.muteAll)
  const flash = useUi((s) => s.flash)
  if (!audioSlotId) return null

  return (
    <div className="sound-chip">
      <button title="Show which tile is playing sound" onClick={() => flash(audioSlotId)}>
        <SoundOn size={14} />
        <span>Sound on</span>
      </button>
      <button title={`Mute all${shortcutHint('audio.muteAll')}`} aria-label="Mute all" onClick={muteAll}>
        <Close size={12} />
      </button>
    </div>
  )
}

export function Toolbar({ visible }: { visible: boolean }) {
  const layout = useWall((s) => s.layout)
  const rows = useWall((s) => s.rows)
  const cols = useWall((s) => s.cols)
  const setLayout = useWall((s) => s.setLayout)
  const setSize = useWall((s) => s.setSize)
  const setUi = useUi((s) => s.set)
  const searchOpen = useUi((s) => s.searchOpen)
  const wallEmpty = useWall((s) => s.slots.every((slot) => !slot.source))

  return (
    <header className={`toolbar${visible ? '' : ' hidden'}`}>
      <div className="segmented" role="radiogroup" aria-label="Layout">
        {LAYOUTS.map((kind) => (
          <button
            key={kind}
            role="radio"
            aria-checked={layout === kind}
            className={layout === kind ? 'active' : ''}
            title={`${LAYOUT_LABELS[kind]}${shortcutHint(`layout.${kind}`)}`}
            onClick={() => setLayout(kind)}
          >
            <LayoutGlyph kind={kind} />
          </button>
        ))}
      </div>

      <label className="size-picker" title="Number of tiles (rows × columns)">
        <select value={rows} onChange={(e) => setSize(Number(e.target.value), cols)} aria-label="Rows">
          {SIDES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <span>×</span>
        <select value={cols} onChange={(e) => setSize(rows, Number(e.target.value))} aria-label="Columns">
          {SIDES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>

      <div className="spacer" />

      <SoundStatus />
      <ApiStatus />

      <button
        className={`tool${searchOpen ? ' active' : ''}`}
        title={`Search live streams${shortcutHint('search.open')}`}
        onClick={() => (searchOpen ? closeSearch() : openSearch())}
      >
        <Search />
        <span>Search</span>
      </button>
      <button className="tool" title="Remove every stream and start over (Undo available)" disabled={wallEmpty} onClick={clearAll}>
        <Trash />
        <span>Clear all</span>
      </button>
      <button className="tool" title="Copy a link to this wall" onClick={() => void copyShareLink()}>
        <LinkIcon />
        <span>Share</span>
      </button>
      <button className="tool icon-only" title={`Fullscreen${shortcutHint('view.fullscreen')}`} onClick={toggleFullscreen}>
        <Expand />
      </button>
      <button className="tool icon-only" title="Settings" onClick={() => setUi({ settingsOpen: true })}>
        <Gear />
      </button>
    </header>
  )
}
