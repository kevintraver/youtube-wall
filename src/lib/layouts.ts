import type { LayoutKind } from './types'

export type Cell = { col: number; row: number; colSpan: number; rowSpan: number }

export type ComputedLayout = {
  columns: string // CSS grid-template-columns
  rows: string // CSS grid-template-rows
  colWeights: number[] // relative track sizes (fr), for drawing previews
  rowWeights: number[]
  colCount: number
  rowCount: number
  cells: Cell[] // one per visible slot, by slot index
}

export const LAYOUT_LABELS: Record<LayoutKind, string> = {
  grid: 'Grid',
  'main-strip': 'Main + strip',
  'main-sidebar': 'Main + sidebar',
  'main-2x2': 'Main 2×2',
}

// Every layout covers its grid exactly: no empty cells for any tile count.

type Shape = { colWeights: number[]; rowWeights: number[]; cells: Cell[] }

const cell = (col: number, row: number, colSpan = 1, rowSpan = 1): Cell => ({ col, row, colSpan, rowSpan })
const even = (count: number) => Array.from({ length: count }, () => 1)

function single(): Shape {
  return { colWeights: [1], rowWeights: [1], cells: [cell(1, 1)] }
}

function grid(n: number, rows: number, cols: number): Shape {
  const cells = Array.from({ length: n }, (_, i) => cell((i % cols) + 1, Math.floor(i / cols) + 1))
  return { colWeights: even(cols), rowWeights: even(rows), cells }
}

// Main top-left; small tiles down a right column, then left to right across a bottom row
// (reading order, so tile numbers and "next empty tile" read naturally).
// With b tiles in the bottom row (including the corner) and r in the right column, a b × (r+1)
// grid is filled exactly when r + b = n - 1. Few tiles: just a bottom strip under a full-width main.
function mainStrip(n: number): Shape {
  const small = n - 1
  if (small <= 4) {
    const cells = [cell(1, 1, small), ...Array.from({ length: small }, (_, i) => cell(i + 1, 2))]
    return { colWeights: even(small), rowWeights: [3, 1], cells }
  }
  const b = Math.ceil(n / 2)
  const r = small - b
  const cells = [cell(1, 1, b - 1, r)]
  for (let row = 1; row <= r; row++) cells.push(cell(b, row))
  for (let col = 1; col <= b; col++) cells.push(cell(col, r + 1))
  return { colWeights: even(b), rowWeights: even(r + 1), cells }
}

// Main on the left; one column of small tiles, or two when there are many.
// With two columns and an odd count, the last tile spans both.
function mainSidebar(n: number): Shape {
  const small = n - 1
  const sideCols = small > 5 ? 2 : 1
  const sideRows = Math.ceil(small / sideCols)
  const cells = [cell(1, 1, 1, sideRows)]
  for (let i = 0; i < small; i++) {
    const lastAlone = sideCols === 2 && i === small - 1 && small % 2 === 1
    cells.push(cell(2 + (i % sideCols), Math.floor(i / sideCols) + 1, lastAlone ? 2 : 1))
  }
  return { colWeights: [sideCols === 1 ? 3 : 2.5, ...even(sideCols)], rowWeights: even(sideRows), cells }
}

// Main spans 2×2 top-left; small tiles fill the rest row by row.
// Picks the column count that leaves the fewest gaps, then stretches the last row's tiles
// across any remaining space (on a finer column grid so the spans stay whole numbers).
function main2x2(n: number): Shape {
  const needed = n + 3
  const target = Math.ceil(Math.sqrt(needed))
  const options = [3, 4, 5].map((cols) => {
    const rows = Math.max(2, Math.ceil(needed / cols))
    return { cols, rows, gaps: cols * rows - needed }
  })
  options.sort((a, b) => a.gaps - b.gaps || Math.abs(a.cols - target) - Math.abs(b.cols - target))
  const { cols, rows } = options[0]

  // Free cells per row (the main tile takes 2 cells in rows 1–2), and how many tiles each row gets.
  const free = (row: number) => (row <= 2 ? cols - 2 : cols)
  const perRow: number[] = []
  for (let row = 1, left = n - 1; left > 0; row++) {
    perRow.push(Math.min(free(row), left))
    left -= perRow[perRow.length - 1]
  }
  const last = perRow[perRow.length - 1]
  const lastFree = free(perRow.length)
  const k = last < lastFree ? last : 1 // fine columns per cell
  const fine = cols * k

  const cells = [cell(1, 1, 2 * k, 2)]
  perRow.forEach((count, i) => {
    const row = i + 1
    const start = row <= 2 ? 2 * k + 1 : 1
    const span = (free(row) * k) / count
    for (let j = 0; j < count; j++) cells.push(cell(start + j * span, row, span))
  })
  return { colWeights: even(fine), rowWeights: even(rows), cells }
}

const tracks = (weights: number[]) => weights.map((w) => `${w}fr`).join(' ')

function shapeFor(kind: LayoutKind, n: number, rows: number, cols: number): Shape {
  if (kind === 'grid') return grid(n, rows, cols)
  if (n <= 1) return single()
  // Two tiles: every main layout is just main + one beside it.
  if (n === 2 || kind === 'main-sidebar') return mainSidebar(n)
  if (kind === 'main-strip') return mainStrip(n)
  return main2x2(n)
}

export function computeLayout(kind: LayoutKind, n: number, rows: number, cols: number): ComputedLayout {
  const shape = shapeFor(kind, n, rows, cols)
  return {
    ...shape,
    columns: tracks(shape.colWeights),
    rows: tracks(shape.rowWeights),
    colCount: shape.colWeights.length,
    rowCount: shape.rowWeights.length,
  }
}

export function isMainLayout(kind: LayoutKind): boolean {
  return kind !== 'grid'
}
