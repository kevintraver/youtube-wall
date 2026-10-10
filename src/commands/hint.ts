import { formatBinding } from './format'
import { bindingsOf } from './keymap'
import { effectiveKeymap } from './store'
import type { CommandId } from './types'

/** ` (⌘Z)` for tooltips: the command's first binding, or nothing when it's unbound. */
export function shortcutHint(id: CommandId): string {
  const [first] = bindingsOf(effectiveKeymap(), id)
  return first ? ` (${formatBinding(first)})` : ''
}
