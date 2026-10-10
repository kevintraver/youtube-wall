import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Conflict } from './conflicts'
import { bindingsOf, DEFAULT_KEYMAP, mergeKeymap, removeBinding, resetOverride, setOverride } from './keymap'
import type { Binding, CommandId, Keymap } from './types'

type KeymapState = {
  /** Only what the user changed; everything else comes from DEFAULT_KEYMAP. */
  overrides: Keymap

  /**
   * Give a command a binding: `replace` makes it the only one, `add` keeps the others.
   * Bindings listed in `steal` are taken away from the commands that had them.
   */
  assign: (id: CommandId, binding: Binding, mode: 'replace' | 'add', steal?: Conflict[]) => void
  unbind: (id: CommandId, binding: Binding) => void
  /** Leave the command with no keys at all. */
  clear: (id: CommandId) => void
  reset: (id: CommandId) => void
  resetAll: () => void
}

export const useKeymap = create<KeymapState>()(
  persist(
    (set) => ({
      overrides: {},

      assign: (id, binding, mode, steal = []) =>
        set((s) => {
          let overrides = s.overrides
          for (const c of steal) overrides = removeBinding(overrides, DEFAULT_KEYMAP, c.id, c.binding)
          const current = mode === 'add' ? bindingsOf(mergeKeymap(DEFAULT_KEYMAP, overrides), id) : []
          return { overrides: setOverride(overrides, DEFAULT_KEYMAP, id, [...current, binding]) }
        }),
      unbind: (id, binding) => set((s) => ({ overrides: removeBinding(s.overrides, DEFAULT_KEYMAP, id, binding) })),
      clear: (id) => set((s) => ({ overrides: setOverride(s.overrides, DEFAULT_KEYMAP, id, []) })),
      reset: (id) => set((s) => ({ overrides: resetOverride(s.overrides, id) })),
      resetAll: () => set({ overrides: {} }),
    }),
    { name: 'youtube-wall-keymap', version: 1, partialize: (s) => ({ overrides: s.overrides }) },
  ),
)

export function effectiveKeymap(): Keymap {
  return mergeKeymap(DEFAULT_KEYMAP, useKeymap.getState().overrides)
}

export function useEffectiveKeymap(): Keymap {
  const overrides = useKeymap((s) => s.overrides)
  return useMemo(() => mergeKeymap(DEFAULT_KEYMAP, overrides), [overrides])
}
