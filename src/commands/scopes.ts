import type { Scope } from './types'

export type ScopeState = {
  searchOpen: boolean
  editing: boolean
  placing: boolean
  /** A modal (settings, shortcuts) is open: no wall shortcuts at all. */
  dialogOpen: boolean
}

/** Modes from top to bottom. Only the topmost active one receives its commands. */
export const MODE_ORDER: Exclude<Scope, 'global'>[] = ['placing', 'editing', 'search']

export function activeScopes(state: ScopeState): Set<Scope> {
  if (state.dialogOpen) return new Set()
  const on = { placing: state.placing, editing: state.editing, search: state.searchOpen }
  const mode = MODE_ORDER.find((m) => on[m])
  return new Set<Scope>(mode ? ['global', mode] : ['global'])
}

/** Whether commands in these two scopes can ever be live at the same time. */
export function scopesOverlap(a: Scope, b: Scope): boolean {
  return a === b || a === 'global' || b === 'global'
}
