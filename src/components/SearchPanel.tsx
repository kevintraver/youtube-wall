import { useDraggable } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import {
  chooseResult,
  closeSearch,
  fillEmptyTiles,
  nextEmptySlot,
  placeAt,
  placeInNewTile,
  quickAdd,
  removeVideo,
  slotLabel,
} from '../lib/actions'
import { ApiError, searchLive, type SearchOrder } from '../lib/dataApi'
import { formatViewers } from '../lib/format'
import { sourceKey, type VideoInfo } from '../lib/types'
import { useResolved } from '../state/resolved'
import { useSettings, useUsableKey } from '../state/settings'
import { useUi, type Placing } from '../state/ui'
import { useWall } from '../state/wall'
import { Check, Close, Plus, Search, Sparkle } from './icons'
import { ApiKeyForm, ApiKeySetup } from './SettingsDialog'

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; query: string; results: VideoInfo[] }
  | { kind: 'error'; message: string }

function useVideoIdsOnWall(): Set<string> {
  const slots = useWall((s) => s.slots)
  const visible = useWall((s) => s.rows * s.cols)
  const map = useResolved((s) => s.map)
  const ids = new Set<string>()
  for (const slot of slots.slice(0, visible)) {
    if (!slot.source) continue
    if (slot.source.kind === 'video') ids.add(slot.source.id)
    const res = map[sourceKey(slot.source)]
    if (res?.status === 'ok') ids.add(res.video.id)
  }
  return ids
}

function useEmptyCount(): number {
  return useWall((s) => s.slots.slice(0, s.rows * s.cols).filter((slot) => !slot.source).length)
}

const toPlacing = (r: VideoInfo): Placing => ({ source: { kind: 'video', id: r.id }, title: r.title, thumb: r.thumb })

function ResultRow({ result, onWall, picked }: { result: VideoInfo; onWall: boolean; picked: boolean }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `result:${result.id}`,
    data: { type: 'result', videoId: result.id },
    disabled: onWall,
  })

  return (
    <li className={`result${onWall ? ' on-wall' : ''}${picked ? ' picked' : ''}${isDragging ? ' dragging' : ''}`}>
      <button
        ref={setNodeRef}
        className="result-main"
        title={onWall ? 'Already on the wall' : 'Click, then pick a tile. Or drag onto a tile.'}
        disabled={onWall}
        onClick={() => chooseResult(toPlacing(result))}
        {...listeners}
        {...attributes}
      >
        <span className="thumb">
          {result.thumb && <img src={result.thumb} alt="" width={128} height={72} loading="lazy" draggable={false} />}
          <span className="badge live">LIVE</span>
          {onWall && (
            <span className="added-mark">
              <Check size={18} />
            </span>
          )}
        </span>
        <span className="result-text">
          <span className="result-title">{result.title}</span>
          <span className="result-channel">{result.channelTitle}</span>
          {result.viewers !== undefined && (
            <span className="result-viewers">{formatViewers(result.viewers)} watching</span>
          )}
        </span>
      </button>
      {onWall ? (
        <button className="result-action remove" title="Remove from the wall" onClick={() => removeVideo(result.id)}>
          <Close size={14} />
          <span>Remove</span>
        </button>
      ) : (
        <button className="result-action" title="Add to the next empty tile" onClick={() => quickAdd(toPlacing(result))}>
          <Plus size={14} />
          <span>Add</span>
        </button>
      )}
    </li>
  )
}

// Shown while a picked stream is waiting for a tile.
function PlacingBar({ placing }: { placing: Placing }) {
  const setUi = useUi((s) => s.set)
  const hasEmpty = useEmptyCount() > 0
  const canGrow = useWall((s) => s.rows * s.cols < 16)

  return (
    <div className="placing-bar" role="status">
      <div className="placing-head">
        {placing.thumb && <img src={placing.thumb} alt="" width={72} height={40} />}
        <div>
          <strong>Click a tile to put this stream there</strong>
          <span>{placing.title}</span>
        </div>
      </div>
      <div className="placing-actions">
        {hasEmpty && (
          <button
            onClick={() => {
              const empty = nextEmptySlot()
              if (empty) placeAt(empty)
            }}
          >
            Next empty tile
          </button>
        )}
        {canGrow && <button onClick={placeInNewTile}>+ Add a tile</button>}
        <button className="ghost" onClick={() => setUi({ placing: null })}>
          Cancel <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  )
}

export function SearchPanel() {
  const open = useUi((s) => s.searchOpen)
  const placing = useUi((s) => s.placing)
  const searchTarget = useUi((s) => s.searchTarget)
  const setUi = useUi((s) => s.set)
  const key = useUsableKey()
  const hasKey = useSettings((s) => s.apiKey !== '')
  const quotaUsedUp = useSettings((s) => s.quotaExhaustedUntil > 0)
  const onWall = useVideoIdsOnWall()
  const emptyCount = useEmptyCount()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ kind: 'idle' })
  const [filling, setFilling] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open, key, searchTarget])

  const handleError = (e: unknown) => {
    if (!(e instanceof ApiError)) throw e
    if (e.reason === 'quota') useSettings.getState().markQuotaExhausted()
    if (e.reason === 'badKey') useSettings.getState().markBadKey()
    setState({ kind: 'error', message: e.message })
  }

  const run = async (q: string, order: SearchOrder = 'relevance') => {
    if (!key) return null
    setState({ kind: 'loading' })
    try {
      const results = await searchLive(q, key, order)
      setState({ kind: 'done', query: q || 'Top live now', results })
      return results
    } catch (e) {
      handleError(e)
      return null
    }
  }

  // With results on screen, fill from those; otherwise fetch the most-watched live streams.
  const fill = async () => {
    if (state.kind === 'done' && state.results.length > 0) {
      fillEmptyTiles(state.results)
      return
    }
    setFilling(true)
    const results = await run(query.trim(), 'viewCount')
    setFilling(false)
    if (results) fillEmptyTiles(results)
  }

  const hasResults = state.kind === 'done' && state.results.length > 0
  const fillLabel = hasResults
    ? `Fill ${emptyCount} empty tile${emptyCount === 1 ? '' : 's'} with the top results`
    : `Fill ${emptyCount} empty tile${emptyCount === 1 ? '' : 's'} with top live streams`

  // Fixed top section (title, close, search, actions) with only the results scrolling below it,
  // so the close button and search box never scroll out of reach. The panel sits beside the wall
  // (the wall shrinks to make room), so every tile stays visible and clickable.
  return (
    <>
      <aside className={`search-panel${open ? ' open' : ''}`} inert={!open} aria-label="Live search">
        <div className="panel-top">
          <div className="panel-head">
            <h2>Live search</h2>
            <button className="tool icon-only" title="Close (Esc)" aria-label="Close search" onClick={closeSearch}>
              <Close />
            </button>
          </div>

          {key && (
            <>
              {searchTarget && !placing && (
                <div className="target-chip">
                  Adding to <strong>{slotLabel(searchTarget)}</strong>
                  <button
                    title="Pick the tile later instead"
                    aria-label="Stop targeting this tile"
                    onClick={() => setUi({ searchTarget: null })}
                  >
                    <Close size={12} />
                  </button>
                </div>
              )}

              <form
                className="search-form"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (query.trim()) void run(query.trim())
                }}
              >
                <Search />
                <input
                  ref={inputRef}
                  type="search"
                  name="q"
                  aria-label="Search live streams"
                  autoComplete="off"
                  enterKeyHint="search"
                  value={query}
                  placeholder="news, launches, lofi, cams…"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>

              {emptyCount > 0 && (
                <button className="fill-button" disabled={filling || state.kind === 'loading'} onClick={() => void fill()}>
                  <Sparkle size={16} />
                  <span>{filling ? 'Finding the top live streams…' : fillLabel}</span>
                </button>
              )}

              {placing && <PlacingBar placing={placing} />}
            </>
          )}
        </div>

        <div className="panel-body" aria-live="polite" aria-busy={state.kind === 'loading'}>
          {key ? (
            <>
              {state.kind === 'idle' && (
                <p className="panel-message muted">
                  Search for something live, or fill the wall with the most-watched streams right now.
                </p>
              )}
              {state.kind === 'loading' && (
                <div className="panel-message">
                  <span className="spinner" aria-label="Searching" />
                </div>
              )}
              {state.kind === 'error' && <p className="form-error">{state.message}</p>}
              {state.kind === 'done' && state.results.length === 0 && (
                <p className="panel-message muted">Nothing live for “{state.query}”. Try a broader search.</p>
              )}
              {hasResults && (
                <>
                  <p className="muted small results-hint">
                    {searchTarget
                      ? `Click a stream to put it in ${slotLabel(searchTarget)}.`
                      : 'Click a stream, then click the tile it should go in. Add drops it in the next empty tile.'}
                  </p>
                  <ul className="results">
                    {state.results.map((r) => (
                      <ResultRow
                        key={r.id}
                        result={r}
                        onWall={onWall.has(r.id)}
                        picked={placing?.source.kind === 'video' && placing.source.id === r.id}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : hasKey && quotaUsedUp ? (
            <p className="panel-message">Your API quota is used up for today. It resets at midnight Pacific time.</p>
          ) : (
            <div className="panel-setup">
              <p>Searching YouTube for live streams needs a free YouTube Data API key.</p>
              <ApiKeySetup />
              <ApiKeyForm />
            </div>
          )}
        </div>

        {key && <p className="panel-foot muted small">Each search uses about 100 of your 10,000 daily API units.</p>}
      </aside>
    </>
  )
}
