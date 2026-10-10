import { HotkeysProvider, type HotkeysProviderOptions } from '@tanstack/react-hotkeys'
import { HoldOverlay } from './HoldOverlay'
import { ShortcutsDialog } from './ShortcutsDialog'
import { TileBadges } from './TileBadges'
import { useSequenceGuard } from './sequenceGuard'
import { useCommandHotkeys, useScopeSnapshot } from './useCommandHotkeys'

// Let keys keep bubbling (other listeners, like the idle timer, still see them), and record
// what the key produces ("?", "/") rather than its physical position.
const DEFAULTS: HotkeysProviderOptions = {
  hotkey: { stopPropagation: false },
  hotkeySequence: { stopPropagation: false },
  hotkeyRecorder: { recordBy: 'key' },
  hotkeySequenceRecorder: { recordBy: 'key' },
}

function CommandHotkeys() {
  useScopeSnapshot()
  useSequenceGuard()
  useCommandHotkeys()
  return null
}

/** Keyboard commands: hotkey registration, tile number badges, hold-Shift big numbers, and the shortcuts dialog. */
export function Commands() {
  return (
    <HotkeysProvider defaultOptions={DEFAULTS}>
      <CommandHotkeys />
      <TileBadges />
      <HoldOverlay />
      <ShortcutsDialog />
    </HotkeysProvider>
  )
}
