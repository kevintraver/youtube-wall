import { useHotkeys, useHotkeySequences, type UseHotkeyDefinition, type UseHotkeySequenceDefinition } from '@tanstack/react-hotkeys'
import { useEffect } from 'react'
import { useUi } from '../state/ui'
import { bindingsOf } from './keymap'
import { useShortcutsPanel } from './panel'
import { COMMANDS } from './registry'
import { activeScopes } from './scopes'
import { isSequenceStep } from './sequenceGuard'
import { useEffectiveKeymap } from './store'
import type { Command, Scope } from './types'

export function useActiveScopes() {
  const searchOpen = useUi((s) => s.searchOpen)
  const editing = useUi((s) => s.editingSlotId !== null)
  const placing = useUi((s) => s.placing !== null)
  const settingsOpen = useUi((s) => s.settingsOpen)
  const panelOpen = useShortcutsPanel((s) => s.open)
  return activeScopes({ searchOpen, editing, placing, dialogOpen: settingsOpen || panelOpen })
}

function currentScopes(): Set<Scope> {
  const ui = useUi.getState()
  return activeScopes({
    searchOpen: ui.searchOpen,
    editing: ui.editingSlotId !== null,
    placing: ui.placing !== null,
    dialogOpen: ui.settingsOpen || useShortcutsPanel.getState().open,
  })
}

const scopesAtKeydown = new WeakMap<KeyboardEvent, Set<Scope>>()

/**
 * Snapshot the scopes in the capture phase, before any handler runs. A component may react to the
 * same key first (the tile link box clears editing on Escape); without the snapshot, that would
 * re-enable the next mode down and the same Escape would also close search.
 */
export function useScopeSnapshot(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => void scopesAtKeydown.set(e, currentScopes())
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}

function runIfAllowed(command: Command, event: KeyboardEvent): void {
  // Events that never reached window (triggered from devtools) use the scopes as they are now.
  const scopes = scopesAtKeydown.get(event) ?? currentScopes()
  if (scopes.has(command.scope) && (!command.when || command.when())) command.run()
}

/**
 * Registers every bound command with TanStack Hotkeys. A command's scope decides `enabled`;
 * its input policy decides `ignoreInputs`; single chords and sequences go to their own managers.
 */
export function useCommandHotkeys(): void {
  const keymap = useEffectiveKeymap()
  const scopes = useActiveScopes()

  const hotkeys: UseHotkeyDefinition[] = []
  const sequences: UseHotkeySequenceDefinition[] = []
  for (const command of COMMANDS) {
    const options = {
      enabled: scopes.has(command.scope),
      ignoreInputs: !command.allowInInputs,
      meta: { name: command.label, description: command.description, group: command.category },
    }
    for (const binding of bindingsOf(keymap, command.id)) {
      if (binding.length === 1) {
        hotkeys.push({
          hotkey: binding[0],
          // The `1` that finishes `G 1` belongs to the sequence, not to "Grid layout".
          callback: (event) => {
            if (!isSequenceStep(event)) runIfAllowed(command, event)
          },
          options,
        })
      } else {
        sequences.push({ sequence: binding, callback: (event) => runIfAllowed(command, event), options })
      }
    }
  }

  // Same keys in different scopes (Escape) are expected; real clashes are caught when rebinding.
  useHotkeys(hotkeys, { conflictBehavior: 'allow' })
  useHotkeySequences(sequences, { conflictBehavior: 'allow' })
}
