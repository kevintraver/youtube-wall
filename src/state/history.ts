import { create } from 'zustand'

// Undo history for wall changes. Each entry knows how to reverse itself in a way that doesn't
// clobber later edits (see the restore helpers in lib/actions.ts).
export type UndoEntry = { id: number; label: string; undo: () => void }

const MAX_ENTRIES = 30

type HistoryState = {
  entries: UndoEntry[]
  push: (label: string, undo: () => void) => number
  undoLast: () => UndoEntry | null
  undoEntry: (id: number) => void
}

let nextId = 1

export const useHistory = create<HistoryState>()((set, get) => ({
  entries: [],

  push: (label, undo) => {
    const id = nextId++
    set((s) => ({ entries: [...s.entries, { id, label, undo }].slice(-MAX_ENTRIES) }))
    return id
  },

  undoLast: () => {
    const last = get().entries.at(-1)
    if (!last) return null
    set((s) => ({ entries: s.entries.slice(0, -1) }))
    last.undo()
    return last
  },

  // From a toast's Undo button: that specific change, wherever it sits in the history.
  undoEntry: (id) => {
    const entry = get().entries.find((e) => e.id === id)
    if (!entry) return
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
    entry.undo()
  },
}))
