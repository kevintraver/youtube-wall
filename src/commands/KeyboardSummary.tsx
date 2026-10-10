import { HOLD_KEY } from './HoldOverlay'
import { bindingsOf } from './keymap'
import { Kbd } from './Kbd'
import { useShortcutsPanel } from './panel'
import { useEffectiveKeymap } from './store'
import './commands.css'

/** The Settings dialog's Keyboard section: pointers, and the way into the shortcut editor. */
export function KeyboardSummary({ onCustomize }: { onCustomize: () => void }) {
  const help = bindingsOf(useEffectiveKeymap(), 'help.shortcuts')[0]
  const show = useShortcutsPanel((s) => s.show)

  return (
    <>
      <p className="muted">
        {help ? (
          <>
            Press <Kbd binding={help} /> anywhere to see every shortcut.{' '}
          </>
        ) : null}
        Hold <Kbd binding={[HOLD_KEY]} /> to see tile numbers. Paste a link while hovering a tile to put it there.
      </p>
      <button
        className="text-button"
        onClick={() => {
          onCustomize()
          show(true)
        }}
      >
        Customize shortcuts…
      </button>
    </>
  )
}
