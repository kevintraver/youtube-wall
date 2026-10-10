import { areHotkeysEqual, detectPlatform } from '@tanstack/react-hotkeys'
import { bindingEquals, keymapEntries } from './keymap'
import { scopesOverlap } from './scopes'
import type { Binding, CommandId, Keymap, Platform, Scope } from './types'

/**
 * `same`: both commands would fire on the same keys.
 * `prefix`: one binding starts the other (`G` vs `G 1`), so the shorter one swallows the sequence.
 */
export type Conflict = { id: CommandId; binding: Binding; kind: 'same' | 'prefix' }

function startsWith(long: Binding, short: Binding, platform: Platform): boolean {
  return short.length < long.length && short.every((step, i) => areHotkeysEqual(step, long[i], platform))
}

/** Bindings of other commands, in scopes that can be live together, that clash with `binding`. */
export function findConflicts(
  keymap: Keymap,
  id: CommandId,
  binding: Binding,
  scopeOf: (id: CommandId) => Scope,
  platform: Platform = detectPlatform(),
): Conflict[] {
  const conflicts: Conflict[] = []
  for (const [otherId, bindings] of keymapEntries(keymap)) {
    if (otherId === id || !scopesOverlap(scopeOf(id), scopeOf(otherId))) continue
    for (const other of bindings) {
      if (bindingEquals(other, binding, platform)) conflicts.push({ id: otherId, binding: other, kind: 'same' })
      else if (startsWith(other, binding, platform) || startsWith(binding, other, platform)) {
        conflicts.push({ id: otherId, binding: other, kind: 'prefix' })
      }
    }
  }
  return conflicts
}

/** Every clash in a keymap, by command (e.g. from overrides saved before the defaults changed). */
export function findAllConflicts(
  keymap: Keymap,
  scopeOf: (id: CommandId) => Scope,
  platform: Platform = detectPlatform(),
): Map<CommandId, Conflict[]> {
  const result = new Map<CommandId, Conflict[]>()
  for (const [id, bindings] of keymapEntries(keymap)) {
    const found = bindings.flatMap((binding) => findConflicts(keymap, id, binding, scopeOf, platform))
    if (found.length) result.set(id, found)
  }
  return result
}
