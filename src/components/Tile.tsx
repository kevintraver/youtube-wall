import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useEffect, useState, type CSSProperties } from 'react'
import { recheckChannel } from '../hooks/useResolver'
import { openSearch, placeAt, placeSource, removeFromSlot, undoRemoval } from '../lib/actions'
import { formatViewers } from '../lib/format'
import { tileNumber } from '../commands/tileKeys'
import { isMainLayout, type Cell } from '../lib/layouts'
import { sourceKey, sourceUrl, type Slot, type Source } from '../lib/types'
import { describePlayerError, type EmbedTarget } from '../lib/ytApi'
import { useResolved, type Resolution } from '../state/resolved'
import { useSettings, useUsableKey } from '../state/settings'
import { useUi } from '../state/ui'
import { useWall } from '../state/wall'
import { Close, External, Pencil, Retry, Search, SoundOff, SoundOn, Undo } from './icons'
import { LinkInput } from './LinkInput'
import { Player } from './Player'

const LIVE_RETRY_MS = 60_000

type Props = { slot: Slot; index: number; cell: Cell; isMain: boolean }

type Plan =
  | { kind: 'play'; target: EmbedTarget; live: boolean }
  | { kind: 'message'; title: string; detail?: string; busy?: boolean }

// Decide what a slot shows. With a usable API key, channels play their resolved live video;
// without one, they fall back to YouTube's live_stream embed.
function planFor(source: Source, res: Resolution | undefined, apiOn: boolean, handleChannel: string | undefined): Plan {
  if (source.kind === 'video') {
    if (apiOn && res?.status === 'missing') return { kind: 'message', title: res.message }
    return { kind: 'play', target: { videoId: source.id }, live: res?.status === 'ok' && res.video.live !== 'none' }
  }
  if (!apiOn) {
    if (source.kind === 'channel') return { kind: 'play', target: { channelId: source.id }, live: true }
    if (handleChannel) return { kind: 'play', target: { channelId: handleChannel }, live: true }
    return {
      kind: 'message',
      title: `@${source.handle}`,
      detail: 'Add an API key in Settings to follow @handles, or paste the channel’s /channel/UC… link.',
    }
  }
  if (!res || res.status === 'loading') return { kind: 'message', title: 'Finding live stream…', busy: true }
  if (res.status === 'ok') return { kind: 'play', target: { videoId: res.video.id }, live: true }
  if (res.status === 'offline') {
    return { kind: 'message', title: 'Not live right now', detail: 'Checking again every 5 minutes.' }
  }
  return { kind: 'message', title: res.message }
}

export function Tile({ slot, index, cell, isMain }: Props) {
  const source = slot.source
  const audible = useWall((s) => s.audioSlotId === slot.id)
  const activate = useWall((s) => s.activate)
  const toggleSound = useWall((s) => s.toggleSound)
  const layout = useWall((s) => s.layout)
  const mainLayout = isMainLayout(layout)
  const swapBack = useWall((s) => s.swapBack)
  // On the main tile after a promote: where the promoted tile came from (its old spot is now
  // held by the tile it replaced), shown as "Back to N" using the same numbers as the badges/keys.
  const backTo = useWall((s) => {
    if (!isMain || !s.canSwapBack() || !s.lastPromote) return null
    const { demoted } = s.lastPromote
    return tileNumber(s.slots.findIndex((slot) => slot.id === demoted), s.layout)
  })
  const editing = useUi((s) => s.editingSlotId === slot.id)
  const setUi = useUi((s) => s.set)
  const flashing = useUi((s) => s.flashSlotId === slot.id)
  const placing = useUi((s) => s.placing !== null)
  const removed = useUi((s) => (source ? undefined : s.removed[slot.id]))
  const isSearchTarget = useUi((s) => s.searchOpen && s.searchTarget === slot.id)
  const apiOn = useUsableKey() !== null
  const res = useResolved((s) => (source ? s.map[sourceKey(source)] : undefined))
  const handleChannel = useSettings((s) => (source?.kind === 'handle' ? s.handles[source.handle] : undefined))

  const [errorState, setErrorState] = useState<{ planKey: string; code: number } | null>(null)
  const [titleState, setTitleState] = useState<{ planKey: string; title: string } | null>(null)
  const [nonce, setNonce] = useState(0)

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: slot.id, data: { slotId: slot.id } })
  const { setNodeRef: setDragRef, listeners, attributes, isDragging } = useDraggable({
    id: `drag:${slot.id}`,
    data: { type: 'slot', slotId: slot.id },
    disabled: !source || editing,
  })

  const plan = source ? planFor(source, res, apiOn, handleChannel) : null
  const planKey = plan?.kind === 'play' ? JSON.stringify(plan.target) : null
  const isLiveLike = plan?.kind === 'play' && plan.live
  // Errors and titles belong to the target they came from; a new target starts clean.
  const playerError = errorState && errorState.planKey === planKey ? errorState.code : null
  const playerTitle = titleState && titleState.planKey === planKey ? titleState.title : ''

  // Live tiles that fail keep retrying; channels also look for a new stream.
  useEffect(() => {
    if (playerError === null || !isLiveLike) return
    const id = window.setTimeout(() => {
      setErrorState(null)
      setNonce((n) => n + 1)
    }, LIVE_RETRY_MS)
    return () => window.clearTimeout(id)
  }, [playerError, isLiveLike])

  const style: CSSProperties = {
    gridColumn: `${cell.col} / span ${cell.colSpan}`,
    gridRow: `${cell.row} / span ${cell.rowSpan}`,
  }

  const hoverHandlers = {
    onMouseEnter: () => setUi({ hoveredSlotId: slot.id }),
    onMouseLeave: () => setUi({ hoveredSlotId: null }),
  }

  const label = String(tileNumber(index, layout) ?? 'Main')

  // Placement mode: every tile becomes a big numbered target.
  const placeOverlay = placing && (
    <button className="place-overlay" onClick={() => placeAt(slot.id)}>
      <span className="place-number">{label}</span>
      <span className="place-action">{source ? 'Replace' : 'Put it here'}</span>
    </button>
  )

  if (!source) {
    return (
      <div
        ref={setDropRef}
        className={`tile tile-empty${isOver ? ' drop-over' : ''}${isSearchTarget ? ' search-target' : ''}${flashing ? ' flash' : ''}`}
        style={style}
        {...hoverHandlers}
      >
        <LinkInput onSubmit={(s) => placeSource(slot.id, s)} onSlash={() => openSearch(slot.id)} />
        <button className="tile-search" aria-label="Search live streams for this tile" onClick={() => openSearch(slot.id)}>
          <Search size={14} />
          <span>{isSearchTarget ? 'Searching for this tile…' : 'Search live streams'}</span>
        </button>
        {removed && !placing && (
          <div className="removed-bar">
            {removed.thumb && <img src={removed.thumb} alt="" width={56} height={32} />}
            <span className="removed-text">
              <span>Removed</span>
              <strong title={removed.title}>{removed.title}</strong>
            </span>
            <button className="undo-button" title="Put it back" aria-label={`Undo: put back ${removed.title}`} onClick={() => undoRemoval(slot.id)}>
              <Undo size={14} />
              Undo
            </button>
          </div>
        )}
        {placeOverlay}
      </div>
    )
  }

  const video = res?.status === 'ok' ? res.video : null
  const title = video?.title ?? playerTitle
  const channelTitle = video?.channelTitle ?? (source.kind === 'handle' ? `@${source.handle}` : '')

  return (
    <div
      ref={setDropRef}
      className={`tile${audible ? ' audible' : ''}${isMain ? ' main' : ''}${cell.row === 1 ? ' top-row' : ''}${isOver ? ' drop-over' : ''}${isDragging ? ' dragging' : ''}${flashing ? ' flash' : ''}`}
      style={style}
      {...hoverHandlers}
    >
      {plan?.kind === 'play' && playerError === null && (
        <Player
          key={`${planKey}#${nonce}`}
          target={plan.target}
          muted={!audible}
          onTitle={(title) => setTitleState({ planKey: planKey ?? '', title })}
          onError={(code) => {
            setErrorState({ planKey: planKey ?? '', code })
            recheckChannel(source)
          }}
          onEnded={() => recheckChannel(source)}
        />
      )}

      {plan?.kind === 'message' && (
        <div className="tile-message">
          {plan.busy && <span className="spinner" />}
          <strong>{plan.title}</strong>
          {plan.detail && <span>{plan.detail}</span>}
        </div>
      )}

      {playerError !== null && (
        <div className="tile-message">
          <strong>{isLiveLike ? 'Stream unavailable' : describePlayerError(playerError)}</strong>
          {isLiveLike && <span>Retrying every minute.</span>}
        </div>
      )}

      {/* Sits above the iframe so clicks and drags reach the app, not YouTube. */}
      <button
        ref={setDragRef}
        className="click-catcher"
        aria-label={mainLayout && !isMain ? 'Move to main' : 'Toggle sound'}
        onClick={() => activate(slot.id)}
        {...listeners}
        {...attributes}
      />

      <div className="tile-overlay">
        <div className="tile-meta">
          {video && video.live !== 'none' && (
            <span className={`badge ${video.live}`}>{video.live === 'live' ? 'LIVE' : 'UPCOMING'}</span>
          )}
          {video?.viewers !== undefined && <span className="viewers">{formatViewers(video.viewers)} watching</span>}
          <span className="tile-title" title={title}>
            {title}
          </span>
          {channelTitle && <span className="tile-channel">{channelTitle}</span>}
        </div>
        <div className="tile-actions">
          {playerError !== null && (
            <button
              title="Retry"
              aria-label="Retry"
              onClick={() => {
                setErrorState(null)
                setNonce((n) => n + 1)
              }}
            >
              <Retry />
            </button>
          )}
          <button title="Change link" aria-label="Change link" onClick={() => setUi({ editingSlotId: slot.id })}>
            <Pencil />
          </button>
          <a title="Open on YouTube" aria-label="Open on YouTube" href={video ? `https://www.youtube.com/watch?v=${video.id}` : sourceUrl(source)} target="_blank" rel="noreferrer">
            <External />
          </a>
          <button className="remove" title="Remove (Delete)" aria-label="Remove stream" onClick={() => removeFromSlot(slot.id)}>
            <Close />
          </button>
        </div>
      </div>

      {/* Big center sound button. In Main layouts sound belongs to the main tile; clicking a small
          tile promotes it (the click-catcher), so small tiles get no center button. */}
      <div className="center-controls">
        {plan?.kind === 'play' && playerError === null && (!mainLayout || isMain) && (
          <button
            className="round-button sound"
            aria-pressed={audible}
            aria-label={audible ? 'Mute' : 'Unmute'}
            title={audible ? 'Mute' : 'Unmute (mutes the others)'}
            onClick={() => toggleSound(slot.id)}
          >
            {audible ? <SoundOn size={24} /> : <SoundOff size={24} />}
          </button>
        )}
      </div>

      {/* The speaker badge marks the audible tile in Grid; in Main layouts the big tile obviously has it. */}
      {((audible && !isMain) || backTo) && (
        <div className="tile-corner">
          {backTo && (
            <button
              className="swap-back"
              title={`Send this tile back to spot ${backTo} and bring back the previous main`}
              onClick={swapBack}
            >
              <Undo size={13} />
              Back to {backTo}
            </button>
          )}
          {audible && !isMain && (
            <span className="audio-indicator" role="img" aria-label="Sound on">
              <SoundOn size={15} />
            </span>
          )}
        </div>
      )}

      {placeOverlay}

      {editing && (
        <div className="tile-edit">
          <LinkInput
            autoFocus
            initial={sourceUrl(source)}
            onSubmit={(s) => {
              if (placeSource(slot.id, s)) setUi({ editingSlotId: null })
            }}
            onCancel={() => setUi({ editingSlotId: null })}
          />
          <button className="text-button" onClick={() => setUi({ editingSlotId: null })}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
