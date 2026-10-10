import { useHotkeyRecorder, useHotkeySequenceRecorder } from '@tanstack/react-hotkeys'
import { useEffect, useMemo, useRef, useState } from 'react'
import { findAllConflicts, findConflicts, type Conflict } from './conflicts'
import { formatBinding, simplifyChord } from './format'
import { HOLD_KEY } from './HoldOverlay'
import { bindingsOf } from './keymap'
import { Kbd } from './Kbd'
import { useShortcutsPanel } from './panel'
import { CATEGORY_ORDER, COMMANDS, getCommand, scopeOf } from './registry'
import { useEffectiveKeymap, useKeymap } from './store'
import type { Binding, Command, CommandId } from './types'
import './commands.css'

type Mode = 'replace' | 'add'
type Recording = { id: CommandId; mode: Mode; kind: 'chord' | 'sequence' }
type Pending = { id: CommandId; binding: Binding; mode: Mode; conflicts: Conflict[] }

const labelOf = (id: CommandId) => getCommand(id)?.label ?? id

export function ShortcutsDialog() {
  const open = useShortcutsPanel((s) => s.open)
  const editing = useShortcutsPanel((s) => s.editing)
  const setPanel = useShortcutsPanel((s) => s.set)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="shortcuts-dialog"
      onClose={() => setPanel({ open: false })}
      onClick={(e) => {
        if (e.target === e.currentTarget) setPanel({ open: false })
      }}
    >
      {open && <ShortcutsBody editing={editing} />}
    </dialog>
  )
}

function ShortcutsBody({ editing }: { editing: boolean }) {
  const setPanel = useShortcutsPanel((s) => s.set)
  const keymap = useEffectiveKeymap()
  const overrides = useKeymap((s) => s.overrides)
  const { assign, unbind, clear, reset, resetAll } = useKeymap()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [rejection, setRejection] = useState<string | null>(null)
  const clashes = useMemo(() => findAllConflicts(keymap, scopeOf), [keymap])

  // A recorded binding goes straight in, unless it clashes: then ask first.
  const commit = (binding: Binding) => {
    if (!recording) return
    const { id, mode } = recording
    setRecording(null)
    const conflicts = findConflicts(keymap, id, binding, scopeOf)
    if (conflicts.length) setPending({ id, binding, mode, conflicts })
    else assign(id, binding, mode)
  }
  const recorderCallbacks = {
    onCancel: () => setRecording(null),
    onClear: () => {
      if (recording) clear(recording.id)
      setRecording(null)
    },
    onReject: (r: { message: string }) => setRejection(r.message),
  }
  const chord = useHotkeyRecorder({ ...recorderCallbacks, onRecord: (hotkey) => commit([simplifyChord(hotkey)]) })
  const sequence = useHotkeySequenceRecorder({
    ...recorderCallbacks,
    onRecord: (steps) => commit(steps.map((step) => simplifyChord(step))),
  })

  const start = (id: CommandId, mode: Mode, kind: Recording['kind']) => {
    chord.stopRecording()
    sequence.stopRecording()
    setPending(null)
    setRejection(null)
    setRecording({ id, mode, kind })
    if (kind === 'chord') chord.startRecording()
    else sequence.startRecording()
  }

  const stopEditing = () => {
    chord.stopRecording()
    sequence.stopRecording()
    setRecording(null)
    setPending(null)
    setPanel({ editing: false })
  }

  const rowState = (command: Command): RowState => ({
    bindings: bindingsOf(keymap, command.id),
    overridden: command.id in overrides,
    clashes: clashes.get(command.id) ?? [],
    recording: recording?.id === command.id ? { ...recording, steps: sequence.steps } : null,
    pending: pending?.id === command.id ? pending : null,
    rejection: recording?.id === command.id ? rejection : null,
  })

  const actions: RowActions = {
    start,
    cancelRecording: () => {
      chord.cancelRecording()
      sequence.cancelRecording()
    },
    unbind,
    reset,
    replace: (p) => {
      assign(p.id, p.binding, p.mode, p.conflicts)
      setPending(null)
    },
    dismiss: () => setPending(null),
  }

  return (
    <div className="dialog-body shortcuts-body">
      <header className="shortcuts-head">
        <h2>Keyboard shortcuts</h2>
        {editing ? (
          <button className="text-button" onClick={stopEditing}>
            Done customizing
          </button>
        ) : (
          <button className="text-button" onClick={() => setPanel({ editing: true })}>
            Customize
          </button>
        )}
      </header>
      <p className="muted shortcuts-tip">
        Hold <Kbd binding={[HOLD_KEY]} /> to see tile numbers. Paste a link while hovering a tile to put it there.
      </p>

      {CATEGORY_ORDER.map((category) => (
        <section key={category} className="shortcuts-group">
          <h3>{category}</h3>
          <ul>
            {COMMANDS.filter((c) => c.category === category).map((command) => (
              <CommandRow key={command.id} command={command} editing={editing} state={rowState(command)} actions={actions} />
            ))}
          </ul>
        </section>
      ))}

      <div className="dialog-actions shortcuts-actions">
        {editing && (
          <button className="text-button danger" disabled={Object.keys(overrides).length === 0} onClick={resetAll}>
            Reset all to defaults
          </button>
        )}
        <button className="primary" onClick={() => setPanel({ open: false })}>
          Close
        </button>
      </div>
    </div>
  )
}

type RowState = {
  bindings: Binding[]
  overridden: boolean
  clashes: Conflict[]
  recording: (Recording & { steps: Binding }) | null
  pending: Pending | null
  rejection: string | null
}

type RowActions = {
  start: (id: CommandId, mode: Mode, kind: Recording['kind']) => void
  cancelRecording: () => void
  unbind: (id: CommandId, binding: Binding) => void
  reset: (id: CommandId) => void
  replace: (pending: Pending) => void
  dismiss: () => void
}

function CommandRow({ command, editing, state, actions }: { command: Command; editing: boolean; state: RowState; actions: RowActions }) {
  const { bindings, recording, pending } = state

  return (
    <li className={`shortcut-row${recording ? ' recording' : ''}`}>
      <div className="shortcut-label">
        <span>{command.label}</span>
        {command.description && <span className="shortcut-desc">{command.description}</span>}
        {state.clashes.length > 0 && !pending && (
          <span className="shortcut-warn">Same keys as {[...new Set(state.clashes.map((c) => labelOf(c.id)))].join(', ')}</span>
        )}
      </div>

      <div className="shortcut-keys">
        {recording ? (
          <span className="shortcut-prompt">
            {recording.kind === 'sequence' && recording.steps.length > 0 && <Kbd binding={recording.steps} />}
            <span>{recording.kind === 'sequence' ? 'Press keys, then Enter' : 'Press a shortcut'}</span>
            <small>Esc cancels · Backspace unbinds</small>
            {state.rejection && <small className="shortcut-warn">{state.rejection}</small>}
          </span>
        ) : bindings.length === 0 ? (
          <span className="shortcut-none">Not set</span>
        ) : (
          bindings.map((binding, i) => (
            <span key={i} className="shortcut-chip">
              {i > 0 && !editing && <span className="shortcut-or">or</span>}
              <Kbd binding={binding} />
              {editing && (
                <button
                  className="chip-remove"
                  title={`Remove ${formatBinding(binding)}`}
                  aria-label={`Remove ${formatBinding(binding)}`}
                  onClick={() => actions.unbind(command.id, binding)}
                >
                  ×
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {editing && (
        <div className="shortcut-actions">
          {recording ? (
            <button className="text-button" onClick={actions.cancelRecording}>
              Cancel
            </button>
          ) : (
            <>
              <button className="text-button" title="Replace with a new shortcut" onClick={() => actions.start(command.id, 'replace', 'chord')}>
                Record
              </button>
              <button className="text-button" title="Replace with a key sequence, like G then 1" onClick={() => actions.start(command.id, 'replace', 'sequence')}>
                Sequence
              </button>
              <button className="text-button" title="Add another shortcut" onClick={() => actions.start(command.id, 'add', 'chord')}>
                Add
              </button>
              {state.overridden && (
                <button className="text-button" title="Back to the default keys" onClick={() => actions.reset(command.id)}>
                  Reset
                </button>
              )}
            </>
          )}
        </div>
      )}

      {pending && (
        <div className="shortcut-conflict" role="alert">
          <span>
            <Kbd binding={pending.binding} />{' '}
            {pending.conflicts.some((c) => c.kind === 'same') ? 'is already used by' : 'overlaps with'}{' '}
            {pending.conflicts.map((c, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <b>{labelOf(c.id)}</b>
                {c.kind === 'prefix' && (
                  <>
                    {' '}
                    (<Kbd binding={c.binding} />)
                  </>
                )}
              </span>
            ))}
            .
          </span>
          <span className="conflict-actions">
            <button className="text-button" onClick={() => actions.replace(pending)}>
              Replace
            </button>
            <button className="text-button" onClick={actions.dismiss}>
              Cancel
            </button>
          </span>
        </div>
      )}
    </li>
  )
}
