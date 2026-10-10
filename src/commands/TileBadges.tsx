import { computeLayout } from '../lib/layouts'
import { useWall } from '../state/wall'
import { tileNumber } from './tileKeys'
import { useWallFrame } from './useWallFrame'
import './commands.css'

/** A small number in each tile's top-left corner: the key that picks it. The main tile has none. */
export function TileBadges() {
  const frame = useWallFrame()
  const layout = useWall((s) => s.layout)
  const rows = useWall((s) => s.rows)
  const cols = useWall((s) => s.cols)
  const audibleIndex = useWall((s) => s.slots.slice(0, s.rows * s.cols).findIndex((slot) => slot.id === s.audioSlotId))
  if (!frame) return null

  const computed = computeLayout(layout, rows * cols, rows, cols)
  return (
    <div className="tile-badges" aria-hidden="true">
      <div className="badge-grid" style={{ ...frame, gridTemplateColumns: computed.columns, gridTemplateRows: computed.rows }}>
        {computed.cells.map((cell, i) => {
          const n = tileNumber(i, layout)
          return (
            <div key={i} style={{ gridColumn: `${cell.col} / span ${cell.colSpan}`, gridRow: `${cell.row} / span ${cell.rowSpan}` }}>
              {n !== null && (
                <span className={`tile-badge${cell.row === 1 ? ' first-row' : ''}${i === audibleIndex ? ' audible' : ''}`}>{n}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
