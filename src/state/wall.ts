import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { decodeWall, encodeWall } from '../lib/hash'
import { isMainLayout } from '../lib/layouts'
import type { LayoutKind, Slot, Source } from '../lib/types'

export const MAX_SIDE = 4
export const DEFAULT_SIDE = 3 // a fresh wall is 3×3
export const MAX_SLOTS = MAX_SIDE * MAX_SIDE

// The wall always holds MAX_SLOTS slots; only the first rows×cols are visible.
// Shrinking the grid hides links instead of deleting them, and growing it brings them back.
type WallState = {
  slots: Slot[]
  layout: LayoutKind
  rows: number
  cols: number
  audioSlotId: string | null
  // The last promote, so it can be swapped back: `promoted` became main, `demoted` (the old main)
  // took its place. Not persisted.
  lastPromote: { promoted: string; demoted: string } | null

  setSource: (slotId: string, source: Source | null) => void
  growForEmptySlot: () => string | null
  setLayout: (layout: LayoutKind) => void
  setSize: (rows: number, cols: number) => void
  swap: (fromId: string, toId: string) => void
  activate: (slotId: string) => void
  toggleSound: (slotId: string) => void
  promote: (slotId: string) => void
  canSwapBack: () => boolean
  swapBack: () => void
  muteAll: () => void
  importShared: (hash: string) => boolean
  shareUrl: () => string
}

const emptySlots = (): Slot[] => Array.from({ length: MAX_SLOTS }, (_, i) => ({ id: `s${i}`, source: null }))

const clampSide = (n: number) => Math.max(1, Math.min(MAX_SIDE, n))

export const useWall = create<WallState>()(
  persist(
    (set, get) => ({
      slots: emptySlots(),
      layout: 'grid',
      rows: DEFAULT_SIDE,
      cols: DEFAULT_SIDE,
      audioSlotId: null,
      lastPromote: null,

      setSource: (slotId, source) =>
        set((s) => ({ slots: s.slots.map((slot) => (slot.id === slotId ? { ...slot, source } : slot)) })),

      // The first empty visible slot, growing the grid a row or column at a time until there is one.
      growForEmptySlot: () => {
        let { rows, cols } = get()
        const { slots } = get()
        let target = slots.slice(0, rows * cols).find((slot) => !slot.source)
        while (!target && (rows < MAX_SIDE || cols < MAX_SIDE)) {
          if (cols <= rows && cols < MAX_SIDE) cols++
          else rows++
          target = slots.slice(0, rows * cols).find((slot) => !slot.source)
        }
        if (!target) return null
        set({ rows, cols })
        return target.id
      },


      setLayout: (layout) =>
        set((s) => ({ layout, audioSlotId: isMainLayout(layout) ? s.slots[0].id : s.audioSlotId })),

      setSize: (rows, cols) => set({ rows: clampSide(rows), cols: clampSide(cols) }),

      swap: (fromId, toId) =>
        set((s) => {
          const slots = [...s.slots]
          const a = slots.findIndex((slot) => slot.id === fromId)
          const b = slots.findIndex((slot) => slot.id === toId)
          ;[slots[a], slots[b]] = [slots[b], slots[a]]
          return { slots, audioSlotId: isMainLayout(s.layout) ? slots[0].id : s.audioSlotId }
        }),

      // Click on a tile: in Grid it toggles solo audio; in Main layouts it swaps the tile into main.
      activate: (slotId) => {
        const { layout, slots, audioSlotId } = get()
        if (!isMainLayout(layout)) {
          set({ audioSlotId: audioSlotId === slotId ? null : slotId })
        } else if (slots[0].id === slotId) {
          set({ audioSlotId: audioSlotId === slotId ? null : slotId })
        } else {
          get().promote(slotId)
        }
      },

      // The big center button: sound on/off for exactly this tile, in any layout.
      toggleSound: (slotId) => set((s) => ({ audioSlotId: s.audioSlotId === slotId ? null : slotId })),

      // Make this tile the main one (main layouts); the main tile takes the sound.
      promote: (slotId) => {
        const { slots, swap } = get()
        if (slots[0].id === slotId) return
        const demoted = slots[0].id
        swap(slotId, demoted)
        set({ lastPromote: { promoted: slotId, demoted } })
      },

      // Valid while the promoted tile is still main (a drag elsewhere can change that).
      canSwapBack: () => {
        const { lastPromote, slots, layout } = get()
        return isMainLayout(layout) && lastPromote !== null && slots[0].id === lastPromote.promoted
      },

      // Undo the last promote. It's a toggle: doing it again re-promotes ("previous channel").
      swapBack: () => {
        const { lastPromote, canSwapBack, promote } = get()
        if (lastPromote && canSwapBack()) promote(lastPromote.demoted)
      },

      muteAll: () => set({ audioSlotId: null }),

      importShared: (hash) => {
        const shared = decodeWall(hash)
        if (!shared) return false
        const slots = emptySlots().map((slot, i) => ({ ...slot, source: shared.sources[i] ?? null }))
        set({
          slots,
          layout: shared.layout,
          rows: shared.rows,
          cols: shared.cols,
          // Start muted: browsers pause a video that unmutes before the user has clicked anything.
          audioSlotId: null,
          lastPromote: null,
        })
        return true
      },

      shareUrl: () => {
        const { slots, layout, rows, cols } = get()
        const sources = slots.slice(0, rows * cols).map((slot) => slot.source)
        const url = new URL(window.location.href)
        url.hash = encodeWall({ layout, rows, cols, sources })
        return url.toString()
      },
    }),
    {
      name: 'youtube-wall',
      partialize: (s) => ({ slots: s.slots, layout: s.layout, rows: s.rows, cols: s.cols }),
    },
  ),
)
