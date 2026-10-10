import {
  detectPlatform,
  formatForDisplay,
  normalizeHotkeyFromParsed,
  parseHotkey,
  type DisplayHotkey,
  type Hotkey,
} from '@tanstack/react-hotkeys'
import type { Platform } from './types'

const PC_KEY_LABELS = { Escape: 'Esc', Delete: 'Del', Backspace: 'Backspace' }

/** Display labels for one chord: `['⌘', 'Z']` on macOS, `['Ctrl', 'Z']` elsewhere. */
export function chordParts(hotkey: DisplayHotkey, platform: Platform = detectPlatform()): string[] {
  return platform === 'mac'
    ? formatForDisplay(hotkey, { platform, parts: true })
    : formatForDisplay(hotkey, { platform, parts: true, useSymbols: { modifiers: true, keys: false }, keyLabels: PC_KEY_LABELS })
}

/** `⇧⌘Z` on macOS, `Ctrl+Shift+Z` elsewhere. */
export function formatChord(hotkey: DisplayHotkey, platform: Platform = detectPlatform()): string {
  return chordParts(hotkey, platform).join(platform === 'mac' ? '' : '+')
}

/** A whole binding as text; sequence steps are separated by spaces (`G 1`). */
export function formatBinding(binding: readonly DisplayHotkey[], platform: Platform = detectPlatform()): string {
  return binding.map((step) => formatChord(step, platform)).join(' ')
}

/**
 * Tidy a recorded chord: Shift is implied by characters like `?` or `!` (and the matcher accepts
 * it either way), so `Shift+?` is stored and shown as `?`.
 */
export function simplifyChord(hotkey: Hotkey, platform: Platform = detectPlatform()): Hotkey {
  const parsed = parseHotkey(hotkey, platform)
  const key = parsed.key
  if (!parsed.shift || key === undefined || key.length !== 1 || /\p{Letter}/u.test(key)) return hotkey
  return normalizeHotkeyFromParsed({ ...parsed, shift: false, modifiers: parsed.modifiers.filter((m) => m !== 'Shift') }, platform)
}
