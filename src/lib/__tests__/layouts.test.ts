import { describe, expect, it } from 'vitest'
import { computeLayout } from '../layouts'
import type { LayoutKind } from '../types'

const mainKinds: LayoutKind[] = ['main-strip', 'main-sidebar', 'main-2x2']

// Every grid cell must be covered by exactly one tile: no overlaps and no empty holes.
function expectExactCover(kind: LayoutKind, n: number, rows = 0, cols = 0) {
  const layout = computeLayout(kind, n, rows, cols)
  expect(layout.cells).toHaveLength(n)
  const seen = new Set<string>()
  for (const c of layout.cells) {
    expect(Number.isInteger(c.colSpan) && Number.isInteger(c.col), `${kind} n=${n}: fractional span`).toBe(true)
    for (let r = c.row; r < c.row + c.rowSpan; r++) {
      for (let col = c.col; col < c.col + c.colSpan; col++) {
        const k = `${r},${col}`
        expect(seen.has(k), `${kind} n=${n}: overlap at ${k}`).toBe(false)
        expect(r <= layout.rowCount && col <= layout.colCount, `${kind} n=${n}: ${k} outside grid`).toBe(true)
        seen.add(k)
      }
    }
  }
  expect(seen.size, `${kind} n=${n}: empty cells`).toBe(layout.rowCount * layout.colCount)
  return layout
}

describe('computeLayout', () => {
  it.each(mainKinds)('%s fills its grid exactly for 1–16 tiles', (kind) => {
    for (let n = 1; n <= 16; n++) expectExactCover(kind, n)
  })

  it('grid fills every rows × cols size', () => {
    for (let rows = 1; rows <= 4; rows++) {
      for (let cols = 1; cols <= 4; cols++) expectExactCover('grid', rows * cols, rows, cols)
    }
  })

  it('makes slot 0 the biggest tile in main layouts', () => {
    for (const kind of mainKinds) {
      for (let n = 3; n <= 16; n++) {
        const { cells } = computeLayout(kind, n, 0, 0)
        const area = (c: (typeof cells)[number]) => c.colSpan * c.rowSpan
        // Compare in fractions of the whole grid, since column grids can be finer than a tile.
        const [main, ...rest] = cells
        for (const c of rest) expect(area(main), `${kind} n=${n}`).toBeGreaterThan(area(c))
      }
    }
  })

  it('main + strip with 9 tiles: 3 down the right, 5 along the bottom, no hole', () => {
    const layout = computeLayout('main-strip', 9, 3, 3)
    expect(layout.colCount).toBe(5)
    expect(layout.rowCount).toBe(4)
    expect(layout.cells[0]).toEqual({ col: 1, row: 1, colSpan: 4, rowSpan: 3 })
  })
})
