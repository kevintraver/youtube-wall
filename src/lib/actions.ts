import { useHistory } from '../state/history'
import { useResolved } from '../state/resolved'
import { useUi, type Placing } from '../state/ui'
import { DEFAULT_SIDE, useWall } from '../state/wall'
import { tileNumber } from '../commands/tileKeys'
import { sourceKey, type Source, type VideoInfo } from './types'

export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen()
}

export async function copyShareLink(): Promise<void> {
  await navigator.clipboard.writeText(useWall.getState().shareUrl())
  useUi.getState().showToast('Wall link copied')
}

// The video a source is playing, when known: its own id, or a channel's resolved live stream.
function playingVideoId(source: Source): string | null {
  if (source.kind === 'video') return source.id
  const res = useResolved.getState().map[sourceKey(source)]
  return res?.status === 'ok' ? res.video.id : null
}

/** The visible slot already showing this stream, if any. */
export function findDuplicate(source: Source, exceptSlotId?: string): string | null {
  const { slots, rows, cols } = useWall.getState()
  const key = sourceKey(source)
  const videoId = playingVideoId(source)
  const match = slots
    .slice(0, rows * cols)
    .find(
      (slot) =>
        slot.id !== exceptSlotId &&
        slot.source !== null &&
        (sourceKey(slot.source) === key || (videoId !== null && playingVideoId(slot.source) === videoId)),
    )
  return match?.id ?? null
}

function rejectDuplicate(source: Source, exceptSlotId?: string): boolean {
  const existing = findDuplicate(source, exceptSlotId)
  if (!existing) return false
  useUi.getState().showToast('Already on the wall')
  useUi.getState().flash(existing)
  return true
}

// ---------- Undo ----------

const sameSource = (a: Source | null, b: Source | null) => (a && b ? sourceKey(a) === sourceKey(b) : a === b)

function slotSource(slotId: string): Source | null {
  return useWall.getState().slots.find((slot) => slot.id === slotId)?.source ?? null
}

/**
 * Put a stream back: into its old tile if that's still empty, otherwise the next empty tile
 * (growing the grid if needed). Skipped if it's already back on the wall.
 */
function restoreSource(slotId: string, source: Source): void {
  if (findDuplicate(source)) return
  const target = slotSource(slotId) === null ? slotId : useWall.getState().growForEmptySlot()
  if (!target) {
    useUi.getState().showToast('No room to restore: the wall is at 16 tiles')
    return
  }
  useWall.getState().setSource(target, source)
  useUi.getState().flash(target)
}

/** Record a change in the undo history; with a message, also show a toast with an Undo button. */
function record(label: string, undo: () => void, toast?: string): number {
  const id = useHistory.getState().push(label, undo)
  if (toast) {
    useUi.getState().showToast(toast, { label: 'Undo', run: () => useHistory.getState().undoEntry(id) })
  }
  return id
}

/** ⌘Z / Ctrl+Z and the toolbar Undo button. */
export function undoLast(): void {
  const entry = useHistory.getState().undoLast()
  useUi.getState().showToast(entry ? `Undid: ${entry.label}` : 'Nothing to undo')
}

/** Undo for "this tile now shows `next` instead of `previous`". */
function undoSet(slotId: string, next: Source, previous: Source | null): () => void {
  return () => {
    if (sameSource(slotSource(slotId), next)) useWall.getState().setSource(slotId, previous)
    else if (previous) restoreSource(slotId, previous)
  }
}

/** Put a stream in a specific tile (paste, edit, drag from search). */
export function placeSource(slotId: string, source: Source): boolean {
  if (rejectDuplicate(source, slotId)) return false
  const previous = slotSource(slotId)
  useWall.getState().setSource(slotId, source)
  record(`${previous ? 'Replaced' : 'Added to'} ${slotLabel(slotId)}`, undoSet(slotId, source, previous))
  return true
}


// Title and thumbnail for a stream, from what the API resolved (or YouTube's thumbnail URL scheme).
function describe(source: Source): { title: string; thumb: string } {
  const res = useResolved.getState().map[sourceKey(source)]
  const video = res?.status === 'ok' ? res.video : null
  const videoId = video?.id ?? (source.kind === 'video' ? source.id : null)
  const fallback = source.kind === 'handle' ? `@${source.handle}` : source.kind === 'channel' ? 'Channel live stream' : 'YouTube video'
  return { title: video?.title ?? fallback, thumb: videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '' }
}

/** Empty a tile. The tile then offers its own Undo (and ⌘Z works too). */
export function removeFromSlot(slotId: string): void {
  const wall = useWall.getState()
  const removed = slotSource(slotId)
  if (!removed) return
  wall.setSource(slotId, null)
  if (wall.audioSlotId === slotId) wall.muteAll()
  const entryId = record(`Removed ${slotLabel(slotId)}`, () => restoreSource(slotId, removed))
  const ui = useUi.getState()
  ui.set({ removed: { ...ui.removed, [slotId]: { source: removed, ...describe(removed), entryId } } })
}

/** The Undo button inside a tile: put back what was removed from it. */
export function undoRemoval(slotId: string): void {
  const marker = useUi.getState().removed[slotId]
  if (!marker) return
  const inHistory = useHistory.getState().entries.some((e) => e.id === marker.entryId)
  if (inHistory) useHistory.getState().undoEntry(marker.entryId)
  else restoreSource(slotId, marker.source)
}

// A tile's Undo only makes sense while it's still empty: drop it once anything goes in.
useWall.subscribe((state) => {
  const { removed, set } = useUi.getState()
  const stale = Object.keys(removed).filter((id) => state.slots.find((slot) => slot.id === id)?.source)
  if (stale.length === 0) return
  const next = { ...removed }
  for (const id of stale) delete next[id]
  set({ removed: next })
})

/** "Main" for the main tile, otherwise "Tile N" with the same numbers as the corner badges and keys. */
export function slotLabel(slotId: string): string {
  const { slots, layout } = useWall.getState()
  const index = slots.findIndex((slot) => slot.id === slotId)
  const n = tileNumber(index, layout)
  return n === null ? 'Main' : `Tile ${n}`
}

export function nextEmptySlot(): string | null {
  const { slots, rows, cols } = useWall.getState()
  return slots.slice(0, rows * cols).find((slot) => !slot.source)?.id ?? null
}

/** Put a stream in a tile, flash it, and offer Undo (which restores whatever was there). */
export function placeWithUndo(slotId: string, source: Source): boolean {
  if (rejectDuplicate(source, slotId)) return false
  const previous = slotSource(slotId)
  const label = `${previous ? 'Replaced' : 'Added to'} ${slotLabel(slotId)}`
  useWall.getState().setSource(slotId, source)
  useUi.getState().flash(slotId)
  record(label, undoSet(slotId, source, previous), label)
  return true
}

// ---------- Adding from search ----------

export function openSearch(targetSlotId: string | null = null): void {
  useUi.getState().set({ searchOpen: true, searchTarget: targetSlotId, placing: null })
}

export function closeSearch(): void {
  useUi.getState().set({ searchOpen: false, searchTarget: null, placing: null })
}

/** Clicking a result: straight into the tile search was opened from, else let the user pick a tile. */
export function chooseResult(item: Placing): void {
  if (rejectDuplicate(item.source)) return
  const { searchTarget, set } = useUi.getState()
  const target = searchTarget && !useWall.getState().slots.find((s) => s.id === searchTarget)?.source ? searchTarget : null
  if (target) {
    placeWithUndo(target, item.source)
    set({ searchTarget: null })
  } else {
    startPlacing(item)
  }
}

function startPlacing(item: Placing): void {
  useUi.getState().set({ placing: item, searchTarget: null })
}

/** The "+" on a result: next empty tile, or pick one to replace when the wall is full. */
export function quickAdd(item: Placing): void {
  if (rejectDuplicate(item.source)) return
  const empty = nextEmptySlot()
  if (empty) {
    placeWithUndo(empty, item.source)
  } else {
    startPlacing(item)
    useUi.getState().showToast('The wall is full. Pick a tile to replace, or add a tile.')
  }
}

/** Finish placement mode by putting the picked stream into this tile. */
export function placeAt(slotId: string): void {
  const { placing, set } = useUi.getState()
  if (!placing) return
  if (placeWithUndo(slotId, placing.source)) set({ placing: null })
}

/** Placement mode's "+ Add a tile": grow the grid and put the stream in the new tile. */
export function placeInNewTile(): void {
  const { placing, set } = useUi.getState()
  if (!placing) return
  const id = useWall.getState().growForEmptySlot()
  if (!id) {
    useUi.getState().showToast('The wall is at its maximum of 16 tiles')
    return
  }
  if (placeWithUndo(id, placing.source)) set({ placing: null })
}

/** Remove whichever tile is playing this video (search results toggle off). */
export function removeVideo(videoId: string): void {
  const { slots, rows, cols } = useWall.getState()
  const slot = slots.slice(0, rows * cols).find((s) => s.source && playingVideoId(s.source) === videoId)
  if (slot) removeFromSlot(slot.id)
}

/**
 * Fill every empty tile with the most-watched streams from `candidates` that aren't on the wall yet.
 * One Undo restores the wall as it was.
 */
export function fillEmptyTiles(candidates: VideoInfo[]): void {
  const ui = useUi.getState()
  const ranked = [...candidates].sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0))
  const filled: { slotId: string; source: Source }[] = []
  for (const video of ranked) {
    const empty = nextEmptySlot()
    if (!empty) break
    const source: Source = { kind: 'video', id: video.id }
    if (findDuplicate(source)) continue
    useWall.getState().setSource(empty, source)
    filled.push({ slotId: empty, source })
  }
  if (filled.length === 0) {
    ui.showToast(nextEmptySlot() ? 'Everything in these results is already on the wall' : 'No empty tiles to fill')
    return
  }
  ui.set({ placing: null, searchTarget: null })
  const label = `Filled ${filled.length} tile${filled.length === 1 ? '' : 's'}`
  // Undo empties only the tiles that still show what Fill put there.
  record(
    label,
    () => {
      for (const f of filled) if (sameSource(slotSource(f.slotId), f.source)) useWall.getState().setSource(f.slotId, null)
    },
    label,
  )
}

/**
 * Start over: empty every tile (including ones hidden by a smaller grid), go back to a 3×3 grid,
 * mute, and drop any in-progress placement or edit. One Undo brings back the streams and the size.
 */
export function clearAll(): void {
  const wall = useWall.getState()
  const before = wall.slots.flatMap((slot) => (slot.source ? [{ slotId: slot.id, source: slot.source }] : []))
  const sizeBefore = { rows: wall.rows, cols: wall.cols }
  if (before.length === 0 && sizeBefore.rows === DEFAULT_SIDE && sizeBefore.cols === DEFAULT_SIDE) return

  useWall.setState((s) => ({
    slots: s.slots.map((slot) => ({ ...slot, source: null })),
    rows: DEFAULT_SIDE,
    cols: DEFAULT_SIDE,
    audioSlotId: null,
    lastPromote: null,
  }))
  useUi.getState().set({ placing: null, searchTarget: null, editingSlotId: null, flashSlotId: null, removed: {} })

  // Undo: grow back to the old size (never shrink what the user has since built), then put
  // every stream back, in its old tile where that's still free.
  record(
    'Cleared the wall',
    () => {
      const now = useWall.getState()
      now.setSize(Math.max(now.rows, sizeBefore.rows), Math.max(now.cols, sizeBefore.cols))
      before.forEach((b) => restoreSource(b.slotId, b.source))
    },
    'Wall cleared',
  )
}
