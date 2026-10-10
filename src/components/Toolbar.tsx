import { shortcutHint } from '../commands/hint'
import { clearAll, closeSearch, copyShareLink, openSearch, toggleFullscreen } from '../lib/actions'
import { LAYOUT_LABELS } from '../lib/layouts'
import type { LayoutKind } from '../lib/types'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { MAX_SIDE, useWall } from '../state/wall'
import { Expand, Gear, LayoutGlyph, LinkIcon, Search, SoundOff, SoundOn, Trash } from './icons'

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

// One-click sound toggle. Hidden until the wall has a stream to hear.
function SoundToggle() {
  const on = useWall((s) => s.slots.slice(0, s.rows * s.cols).some((slot) => slot.id === s.audioSlotId && slot.source))
  const anyStream = useWall((s) => s.slots.slice(0, s.rows * s.cols).some((slot) => slot.source))
  const toggleMute = useWall((s) => s.toggleMute)
  if (!anyStream) return null

  return (
    <button
      className={`sound-chip${on ? ' on' : ''}`}
      aria-pressed={on}
      title={`${on ? 'Mute' : 'Unmute'}${shortcutHint('audio.muteAll')}`}
      onClick={toggleMute}
    >
      {on ? <SoundOn size={14} /> : <SoundOff size={14} />}
      <span>{on ? 'Sound on' : 'Sound off'}</span>
    </button>
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
            <LayoutGlyph kind={kind} rows={rows} cols={cols} />
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

      <SoundToggle />

      <div className="spacer" />

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
