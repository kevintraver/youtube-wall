import type { DisplayHotkey } from '@tanstack/react-hotkeys'
import { formatBinding, formatChord } from './format'
import './commands.css'

/**
 * A binding (or a bare key like Shift) as keycaps: `⌘Z` on macOS, `Ctrl+Z` elsewhere.
 * Each step of a sequence gets its own cap.
 */
export function Kbd({ binding }: { binding: readonly DisplayHotkey[] }) {
  return (
    <span className="kbd-binding" aria-label={formatBinding(binding)}>
      {binding.map((step, i) => (
        <kbd key={i}>{formatChord(step)}</kbd>
      ))}
    </span>
  )
}
