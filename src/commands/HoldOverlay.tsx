import { useHeldKeys, type CanonicalModifier } from '@tanstack/react-hotkeys'
import { useEffect, useState } from 'react'
import { computeLayout, isMainLayout } from '../lib/layouts'
import { useWall } from '../state/wall'
import { bindingsOf, TILE_NUMBERS } from './keymap'
import { Kbd } from './Kbd'
import { useEffectiveKeymap } from './store'
import { useActiveScopes } from './useCommandHotkeys'
import { tileNumber } from './tileKeys'
import { useWallFrame } from './useWallFrame'
import './commands.css'

/** Hold this key on its own to see tile numbers. */
export const HOLD_KEY: CanonicalModifier = 'Shift'
const HOLD_DELAY_MS = 350 // long enough that typing `?` or Shift+click doesn't flash it

function isTyping(el: Element | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

function useHeldAlone(): boolean {
  const held = useHeldKeys()
  const alone = held.length === 1 && held[0] === HOLD_KEY
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!alone) return
    const timer = window.setTimeout(() => setShown(!isTyping(document.activeElement)), HOLD_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      setShown(false)
    }
  }, [alone])
  return alone && shown
}

export function HoldOverlay() {
  const held = useHeldAlone()
  const live = useActiveScopes().has('global')
  return held && live ? <TileNumbers /> : null
}

// Mirrors the wall's grid over it, using the same layout math, so each number sits on its tile.
function TileNumbers() {
  const layout = useWall((s) => s.layout)
  const rows = useWall((s) => s.rows)
  const cols = useWall((s) => s.cols)
  const keymap = useEffectiveKeymap()
  const frame = useWallFrame()
  if (!frame) return null

  const computed = computeLayout(layout, rows * cols, rows, cols)
  const help = bindingsOf(keymap, 'help.shortcuts')[0]
  const swapBack = bindingsOf(keymap, 'tile.swapBack')[0]

  return (
    <div className="hold-overlay" aria-hidden="true">
      <div className="hold-grid" style={{ ...frame, gridTemplateColumns: computed.columns, gridTemplateRows: computed.rows }}>
        {computed.cells.map((cell, i) => {
          const n = tileNumber(i, layout)
          const key = n !== null && n <= TILE_NUMBERS.length ? TILE_NUMBERS[n - 1] : null
          const pick = key ? bindingsOf(keymap, `tile.pick.${key}`)[0] : undefined
          // G + number only gives sound in Grid; Main layouts keep sound on the main tile.
          const sound = key && !isMainLayout(layout) ? bindingsOf(keymap, `tile.sound.${key}`)[0] : undefined
          return (
            <div
              key={i}
              className={`hold-cell${n === null ? ' main' : ''}`}
              style={{ gridColumn: `${cell.col} / span ${cell.colSpan}`, gridRow: `${cell.row} / span ${cell.rowSpan}` }}
            >
              {n !== null && <span className="hold-number">{n}</span>}
              {(pick || sound) && (
                <span className="hold-keys">
                  {pick && <Kbd binding={pick} />}
                  {sound && (
                    <span>
                      <Kbd binding={sound} /> sound
                    </span>
                  )}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="hold-hint">
        <span>{isMainLayout(layout) ? 'Number: make it main' : 'Number: make it main · G + number: sound only'}</span>
        {swapBack && (
          <span>
            <Kbd binding={swapBack} /> swap back
          </span>
        )}
        {help && (
          <span>
            <Kbd binding={help} /> all shortcuts
          </span>
        )}
      </div>
    </div>
  )
}
