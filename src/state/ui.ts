import { create } from 'zustand'
import type { Source } from '../lib/types'

export type Toast = { message: string; action?: { label: string; run: () => void } }

// A stream picked in search, waiting for the user to click the tile it should go in.
export type Placing = { source: Source; title: string; thumb: string }

// What was just removed from a tile, so that tile can offer its own Undo.
export type Removed = { source: Source; title: string; thumb: string; entryId: number }

type UiState = {
  hoveredSlotId: string | null
  editingSlotId: string | null
  flashSlotId: string | null
  searchOpen: boolean
  searchTarget: string | null // set when search was opened from a specific empty tile
  placing: Placing | null
  removed: Record<string, Removed> // by slot id
  settingsOpen: boolean
  toast: Toast | null

  set: (patch: Partial<Omit<UiState, 'set' | 'showToast' | 'flash'>>) => void
  showToast: (message: string, action?: Toast['action']) => void
  flash: (slotId: string) => void
}

let toastTimer = 0
let flashTimer = 0

export const useUi = create<UiState>()((set) => ({
  hoveredSlotId: null,
  editingSlotId: null,
  flashSlotId: null,
  searchOpen: false,
  searchTarget: null,
  placing: null,
  removed: {},
  settingsOpen: false,
  toast: null,

  set: (patch) => set(patch),
  showToast: (message, action) => {
    window.clearTimeout(toastTimer)
    set({ toast: { message, action } })
    toastTimer = window.setTimeout(() => set({ toast: null }), action ? 6000 : 2200)
  },
  flash: (slotId) => {
    window.clearTimeout(flashTimer)
    set({ flashSlotId: null })
    // Set it on the next tick (so re-flashing the same tile restarts the animation), and only then
    // schedule the end. Chained timers always run in order; requestAnimationFrame can be deferred
    // in background tabs until after the end timer, leaving the highlight stuck on.
    flashTimer = window.setTimeout(() => {
      set({ flashSlotId: slotId })
      flashTimer = window.setTimeout(() => set({ flashSlotId: null }), 1400)
    }, 16)
  },
}))
