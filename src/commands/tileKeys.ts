import { isMainLayout } from '../lib/layouts'
import type { LayoutKind, Slot } from '../lib/types'

/**
 * The number shown on, and typed for, the tile at this visible index. Main layouts number the
 * side tiles from 1 and leave the main tile out (you can't switch to what's already main);
 * Grid numbers every tile from 1.
 */
export function tileNumber(index: number, layout: LayoutKind): number | null {
  if (!isMainLayout(layout)) return index + 1
  return index === 0 ? null : index
}

/** The visible index of tile number `n` (the inverse of `tileNumber`). */
export function tileIndex(n: number, layout: LayoutKind): number {
  return isMainLayout(layout) ? n : n - 1
}

export type TileKeyAction =
  | { kind: 'place'; slotId: string }
  | { kind: 'promote'; slotId: string }
  | { kind: 'sound'; slotId: string }

type WallView = { layout: LayoutKind; slots: Slot[]; rows: number; cols: number }

/**
 * What pressing tile number `n` does. While placing: put the picked stream there. Main layouts:
 * make it the main tile. Grid (no main tile): toggle its sound, skipping empty tiles.
 * Nothing if there's no tile `n`.
 */
export function tileKeyAction(n: number, wall: WallView, placing: boolean): TileKeyAction | null {
  const index = tileIndex(n, wall.layout)
  if (index >= wall.rows * wall.cols) return null
  const slot = wall.slots[index]
  if (placing) return { kind: 'place', slotId: slot.id }
  if (isMainLayout(wall.layout)) return { kind: 'promote', slotId: slot.id }
  return slot.source ? { kind: 'sound', slotId: slot.id } : null
}
