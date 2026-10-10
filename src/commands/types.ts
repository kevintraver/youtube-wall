import type { Hotkey } from '@tanstack/react-hotkeys'
import type { LayoutKind } from '../lib/types'

/**
 * Where a command can fire. `global` is active whenever no dialog is open; the others are modes,
 * and only the topmost active mode counts (placing > editing > search), so Escape backs out one step.
 */
export type Scope = 'global' | 'search' | 'editing' | 'placing'

export type Category = 'Layout' | 'Wall' | 'Tiles' | 'Search' | 'App'

export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type CommandId =
  | `layout.${LayoutKind}`
  | 'view.fullscreen'
  | 'audio.muteAll'
  | `tile.pick.${TileNumber}`
  | 'tile.swapBack'
  | `tile.sound.${TileNumber}`
  | 'tile.removeHovered'
  | 'history.undo'
  | 'wall.clear'
  | 'wall.share'
  | 'search.open'
  | 'search.close'
  | 'placing.cancel'
  | 'editing.cancel'
  | 'help.shortcuts'
  | 'settings.open'

export type Command = {
  id: CommandId
  label: string
  description?: string
  category: Category
  scope: Scope
  /** Fire even while typing in an input (Escape-style commands). Default: false. */
  allowInInputs?: boolean
  /** Checked at key time; when false the key does nothing. */
  when?: () => boolean
  run: () => void
}

/** One chord (`['Mod+Z']`) or a sequence of chords (`['G', '1']`). */
export type Binding = Hotkey[]

/** Command id → its bindings. An empty array means unbound. */
export type Keymap = Partial<Record<CommandId, Binding[]>>

export type Platform = 'mac' | 'windows' | 'linux'
