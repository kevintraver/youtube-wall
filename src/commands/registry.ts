import { clearAll, closeSearch, copyShareLink, openSearch, placeAt, removeFromSlot, toggleFullscreen, undoLast } from '../lib/actions'
import { isMainLayout, LAYOUT_LABELS } from '../lib/layouts'
import type { LayoutKind } from '../lib/types'
import { useUi } from '../state/ui'
import { useWall } from '../state/wall'
import { TILE_NUMBERS } from './keymap'
import { useShortcutsPanel } from './panel'
import { tileIndex, tileKeyAction } from './tileKeys'
import type { Category, Command, CommandId, Scope } from './types'

const LAYOUTS = Object.keys(LAYOUT_LABELS) as LayoutKind[]

function pickTile(n: number): void {
  const action = tileKeyAction(n, useWall.getState(), useUi.getState().placing !== null)
  if (action?.kind === 'place') placeAt(action.slotId)
  else if (action?.kind === 'promote') useWall.getState().promote(action.slotId)
  else if (action?.kind === 'sound') useWall.getState().toggleSound(action.slotId)
}

// The slot showing tile number `n`, if it has a stream.
function tileAt(n: number): string | null {
  const { slots, rows, cols, layout } = useWall.getState()
  const index = tileIndex(n, layout)
  const slot = index < rows * cols ? slots[index] : undefined
  return slot?.source ? slot.id : null
}

/** Everything the keyboard can do. What keys trigger them lives in the keymap, not here. */
export const COMMANDS: Command[] = [
  ...LAYOUTS.map(
    (kind): Command => ({
      id: `layout.${kind}`,
      label: `${LAYOUT_LABELS[kind]} layout`,
      category: 'Layout',
      scope: 'global',
      run: () => useWall.getState().setLayout(kind),
    }),
  ),
  {
    id: 'view.fullscreen',
    label: 'Fullscreen',
    category: 'Wall',
    scope: 'global',
    run: toggleFullscreen,
  },
  {
    id: 'audio.muteAll',
    label: 'Mute all',
    category: 'Wall',
    scope: 'global',
    run: () => useWall.getState().muteAll(),
  },
  {
    id: 'history.undo',
    label: 'Undo',
    description: 'Undo the last change (removing, clearing, adding, filling)',
    category: 'Wall',
    scope: 'global',
    run: undoLast,
  },
  {
    id: 'wall.clear',
    label: 'Clear all',
    description: 'Remove every stream and start over (Undo available)',
    category: 'Wall',
    scope: 'global',
    run: clearAll,
  },
  {
    id: 'wall.share',
    label: 'Copy share link',
    category: 'Wall',
    scope: 'global',
    run: () => void copyShareLink(),
  },
  {
    id: 'tile.removeHovered',
    label: 'Remove hovered tile',
    description: 'Clear the tile under the mouse',
    category: 'Tiles',
    scope: 'global',
    when: () => {
      const ui = useUi.getState()
      return ui.hoveredSlotId !== null && ui.editingSlotId === null
    },
    run: () => {
      const id = useUi.getState().hoveredSlotId
      if (id) removeFromSlot(id)
    },
  },
  ...TILE_NUMBERS.map(
    (n): Command => ({
      id: `tile.pick.${n}`,
      label: `Tile ${n}`,
      description:
        n === 1
          ? 'Main layouts: make it the main tile. Grid: toggle its sound. While placing: put the stream there'
          : undefined,
      category: 'Tiles',
      scope: 'global',
      run: () => pickTile(n),
    }),
  ),
  {
    id: 'tile.swapBack',
    label: 'Swap back',
    description: 'Send the main tile back to where it came from (press again to flip back)',
    category: 'Tiles',
    scope: 'global',
    when: () => useWall.getState().canSwapBack(),
    run: () => useWall.getState().swapBack(),
  },
  ...TILE_NUMBERS.map(
    (n): Command => ({
      id: `tile.sound.${n}`,
      label: `Sound on tile ${n}`,
      description: n === 1 ? 'Grid only: solo (or mute) its sound. In Main layouts sound stays with the main tile' : undefined,
      category: 'Tiles',
      scope: 'global',
      // Main layouts keep sound on the main tile; promote (1–9) a tile to hear it.
      when: () => !isMainLayout(useWall.getState().layout) && tileAt(n) !== null,
      run: () => {
        const id = tileAt(n)
        if (id) useWall.getState().toggleSound(id)
      },
    }),
  ),
  {
    id: 'search.open',
    label: 'Search live streams',
    category: 'Search',
    scope: 'global',
    run: () => openSearch(),
  },
  {
    id: 'search.close',
    label: 'Close search',
    category: 'Search',
    scope: 'search',
    allowInInputs: true,
    run: closeSearch,
  },
  {
    id: 'placing.cancel',
    label: 'Cancel placing',
    description: 'Stop picking a tile for a search result',
    category: 'Search',
    scope: 'placing',
    allowInInputs: true,
    run: () => useUi.getState().set({ placing: null }),
  },
  {
    id: 'editing.cancel',
    label: 'Stop editing tile',
    category: 'Tiles',
    scope: 'editing',
    allowInInputs: true,
    run: () => useUi.getState().set({ editingSlotId: null }),
  },
  {
    id: 'help.shortcuts',
    label: 'Keyboard shortcuts',
    description: 'Show this list',
    category: 'App',
    scope: 'global',
    run: () => useShortcutsPanel.getState().show(),
  },
  {
    id: 'settings.open',
    label: 'Open settings',
    category: 'App',
    scope: 'global',
    run: () => useUi.getState().set({ settingsOpen: true }),
  },
]

export const CATEGORY_ORDER: Category[] = ['Layout', 'Wall', 'Tiles', 'Search', 'App']

const byId = new Map(COMMANDS.map((c) => [c.id, c]))

// Saved overrides can name commands that no longer exist, so lookups may miss.
export function getCommand(id: CommandId): Command | undefined {
  return byId.get(id)
}

export const scopeOf = (id: CommandId): Scope => byId.get(id)?.scope ?? 'global'
