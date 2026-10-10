import { areHotkeysEqual, detectPlatform } from '@tanstack/react-hotkeys'
import type { Binding, CommandId, Keymap, Platform, TileNumber } from './types'

export const TILE_NUMBERS: TileNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** The keymap users start from. Commands not listed here exist but are unbound by default. */
export const DEFAULT_KEYMAP: Keymap = {
  'layout.grid': [['L', '1']],
  'layout.main-strip': [['L', '2']],
  'layout.main-sidebar': [['L', '3']],
  'layout.main-2x2': [['L', '4']],
  'view.fullscreen': [['F']],
  'audio.muteAll': [['M']],
  'search.open': [['/']],
  'tile.removeHovered': [['Delete'], ['Backspace']],
  'history.undo': [['Mod+Z']],
  'placing.cancel': [['Escape']],
  'editing.cancel': [['Escape']],
  'search.close': [['Escape']],
  'help.shortcuts': [['?']],
  // Logical key; on layouts where that key types something else (^, ²), the matcher falls back to its position.
  'tile.swapBack': [['`']],
  'wall.clear': [['C', 'C']],
  ...Object.fromEntries(TILE_NUMBERS.map((n) => [`tile.pick.${n}`, [[`${n}` as const]]])),
  ...Object.fromEntries(TILE_NUMBERS.map((n) => [`tile.sound.${n}`, [['G', `${n}` as const]]])),
}

/** Defaults with the user's overrides on top. An override of `[]` unbinds the command. */
export function mergeKeymap(defaults: Keymap, overrides: Keymap): Keymap {
  return { ...defaults, ...overrides }
}

/** Typed `Object.entries` for a keymap (its keys are always command ids). */
export function keymapEntries(keymap: Keymap): [CommandId, Binding[]][] {
  return Object.entries(keymap) as [CommandId, Binding[]][]
}

export function bindingsOf(keymap: Keymap, id: CommandId): Binding[] {
  return keymap[id] ?? []
}

export function bindingEquals(a: Binding, b: Binding, platform: Platform = detectPlatform()): boolean {
  return a.length === b.length && a.every((step, i) => areHotkeysEqual(step, b[i], platform))
}

function listEquals(a: Binding[], b: Binding[], platform: Platform): boolean {
  return a.length === b.length && a.every((binding, i) => bindingEquals(binding, b[i], platform))
}

/** Set a command's bindings, dropping the override when it matches the default again. */
export function setOverride(
  overrides: Keymap,
  defaults: Keymap,
  id: CommandId,
  bindings: Binding[],
  platform: Platform = detectPlatform(),
): Keymap {
  const next = { ...overrides }
  if (listEquals(bindings, defaults[id] ?? [], platform)) delete next[id]
  else next[id] = bindings
  return next
}

export function resetOverride(overrides: Keymap, id: CommandId): Keymap {
  const next = { ...overrides }
  delete next[id]
  return next
}

/** Remove one binding from a command (unbinding it entirely if it was the last one). */
export function removeBinding(
  overrides: Keymap,
  defaults: Keymap,
  id: CommandId,
  binding: Binding,
  platform: Platform = detectPlatform(),
): Keymap {
  const current = bindingsOf(mergeKeymap(defaults, overrides), id)
  const kept = current.filter((b) => !bindingEquals(b, binding, platform))
  return setOverride(overrides, defaults, id, kept, platform)
}
