import { useMemo } from 'react'
import { computeLayout, isMainLayout } from '../lib/layouts'
import { sourceKey } from '../lib/types'
import { useWall } from '../state/wall'
import { Tile } from './Tile'

const slotNumber = (id: string) => Number(id.slice(1))

export function Wall() {
  const slots = useWall((s) => s.slots)
  const layout = useWall((s) => s.layout)
  const rows = useWall((s) => s.rows)
  const cols = useWall((s) => s.cols)

  const visible = slots.slice(0, rows * cols)
  const computed = useMemo(() => computeLayout(layout, rows * cols, rows, cols), [layout, rows, cols])

  // Render tiles in a fixed (slot id) order and place them with CSS grid. Reordering the
  // slots then only moves grid positions; the iframes never move in the DOM, so they don't reload.
  // The key includes the stream, so a tile that gets a new (or the same, re-added) stream starts
  // fresh: no leftover error, title, or retry state from what was there before.
  const placed = visible
    .map((slot, index) => ({ slot, index, cell: computed.cells[index] }))
    .sort((a, b) => slotNumber(a.slot.id) - slotNumber(b.slot.id))

  return (
    <main className="wall" style={{ gridTemplateColumns: computed.columns, gridTemplateRows: computed.rows }}>
      {placed.map(({ slot, index, cell }) => (
        <Tile
          key={`${slot.id}:${slot.source ? sourceKey(slot.source) : 'empty'}`}
          slot={slot}
          index={index}
          cell={cell}
          isMain={isMainLayout(layout) && index === 0}
        />
      ))}
    </main>
  )
}
