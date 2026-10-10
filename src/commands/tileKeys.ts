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
  /** Make the tile main, first switching to `layout` when the wall is in Grid. */
  | { kind: 'promote'; slotId: string; layout?: LayoutKind }

type WallView = { layout: LayoutKind; slots: Slot[]; rows: number; cols: number }

/**
 * What pressing tile number `n` does: while placing, put the picked stream there; otherwise make
 * it the main tile (from Grid, by switching to Main + strip). Nothing if there's no tile `n`.
 */
export function tileKeyAction(n: number, wall: WallView, placing: boolean): TileKeyAction | null {
  const index = tileIndex(n, wall.layout)
  if (index >= wall.rows * wall.cols) return null
  const slotId = wall.slots[index].id
  if (placing) return { kind: 'place', slotId }
  return isMainLayout(wall.layout) ? { kind: 'promote', slotId } : { kind: 'promote', slotId, layout: 'main-strip' }
}
