import { create } from 'zustand'

type PanelState = {
  open: boolean
  editing: boolean
  show: (editing?: boolean) => void
  set: (patch: Partial<Pick<PanelState, 'open' | 'editing'>>) => void
}

/** The keyboard shortcuts dialog (cheat sheet, and the editor when `editing`). */
export const useShortcutsPanel = create<PanelState>()((set) => ({
  open: false,
  editing: false,
  show: (editing = false) => set({ open: true, editing }),
  set: (patch) => set(patch),
}))
