import { describe, expect, it } from 'vitest'
import type { LayoutKind, Slot } from '../../lib/types'
import { tileIndex, tileKeyAction, tileNumber } from '../tileKeys'

const slots: Slot[] = Array.from({ length: 16 }, (_, i) => ({
  id: `s${i}`,
  source: i < 3 ? { kind: 'video', id: `v${i}`.padEnd(11, '0') } : null,
}))
const wall = (layout: LayoutKind, rows = 3, cols = 3) => ({ layout, slots, rows, cols })

describe('tile numbers', () => {
  it('numbers every tile from 1 in Grid', () => {
    expect([0, 1, 8].map((i) => tileNumber(i, 'grid'))).toEqual([1, 2, 9])
  })

  it('leaves the main tile out in Main layouts', () => {
    expect([0, 1, 9].map((i) => tileNumber(i, 'main-strip'))).toEqual([null, 1, 9])
  })

  it('maps numbers back to visible positions', () => {
    expect(tileIndex(1, 'grid')).toBe(0)
    expect(tileIndex(1, 'main-2x2')).toBe(1)
  })
})

describe('tileKeyAction', () => {
  it('promotes side tile N in Main layouts, including empty tiles', () => {
    expect(tileKeyAction(1, wall('main-sidebar'), false)).toEqual({ kind: 'promote', slotId: 's1' })
    expect(tileKeyAction(5, wall('main-2x2'), false)).toEqual({ kind: 'promote', slotId: 's5' })
  })

  it('switches Grid to Main + strip and promotes tile N', () => {
    expect(tileKeyAction(3, wall('grid'), false)).toEqual({ kind: 'promote', slotId: 's2', layout: 'main-strip' })
    expect(tileKeyAction(5, wall('grid'), false)).toEqual({ kind: 'promote', slotId: 's4', layout: 'main-strip' })
  })

  it('places the picked stream while placing, using the same numbers', () => {
    expect(tileKeyAction(5, wall('grid'), true)).toEqual({ kind: 'place', slotId: 's4' })
    expect(tileKeyAction(1, wall('main-strip'), true)).toEqual({ kind: 'place', slotId: 's1' })
  })

  it('does nothing for a tile the wall is too small to have', () => {
    expect(tileKeyAction(4, wall('main-strip', 2, 2), false)).toBeNull()
    expect(tileKeyAction(3, wall('main-strip', 2, 2), false)).toEqual({ kind: 'promote', slotId: 's3' })
    expect(tileKeyAction(5, wall('grid', 2, 2), true)).toBeNull()
  })

  it('follows visible order, not slot ids', () => {
    const swapped = { ...wall('main-sidebar'), slots: [slots[4], slots[3], ...slots.slice(1, 3), slots[0], ...slots.slice(5)] }
    expect(tileKeyAction(1, swapped, false)).toEqual({ kind: 'promote', slotId: 's3' })
  })
})
