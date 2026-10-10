import { useEffect, useRef, useState } from 'react'
import { KeyboardSummary } from '../commands/KeyboardSummary'
import { ApiError, testKey } from '../lib/dataApi'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'

export function ApiKeySetup() {
  return (
    <ol className="setup-steps">
      <li>
        Open the{' '}
        <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">
          YouTube Data API v3
        </a>{' '}
        page in Google Cloud and click <b>Enable</b>.
      </li>
      <li>
        Go to{' '}
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
          Credentials
        </a>{' '}
        → <b>Create credentials</b> → <b>API key</b>.
      </li>
      <li>Paste the key here. It stays in this browser and is never included in share links.</li>
    </ol>
  )
}

export function ApiKeyForm({ onSaved }: { onSaved?: () => void }) {
  const savedKey = useSettings((s) => s.apiKey)
  const setApiKey = useSettings((s) => s.setApiKey)
  const [value, setValue] = useState(savedKey)
  const [state, setState] = useState<{ kind: 'idle' | 'testing' | 'ok' } | { kind: 'error'; message: string }>({
    kind: 'idle',
  })

  const save = async () => {
    const key = value.trim()
    if (!key) {
      setApiKey('', 'unknown')
      setState({ kind: 'idle' })
      return
    }
    setState({ kind: 'testing' })
    try {
      await testKey(key)
      setApiKey(key, 'ok')
      setState({ kind: 'ok' })
      onSaved?.()
    } catch (e) {
      if (!(e instanceof ApiError)) throw e
      // A quota error still proves the key is valid.
      if (e.reason === 'quota') {
        setApiKey(key, 'ok')
        useSettings.getState().markQuotaExhausted()
        setState({ kind: 'error', message: 'Key saved, but its quota is used up until tomorrow.' })
      } else {
        setState({ kind: 'error', message: e.message })
      }
    }
  }

  return (
    <form
      className="key-form"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <input
        type="password"
        value={value}
        placeholder="AIza…"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value)
          setState({ kind: 'idle' })
        }}
      />
      <button type="submit" className="primary" disabled={state.kind === 'testing'}>
        {state.kind === 'testing' ? 'Testing…' : 'Test & save'}
      </button>
      {state.kind === 'ok' && <p className="form-ok">Key works. Search, @handles and live status are on.</p>}
      {state.kind === 'error' && <p className="form-error">{state.message}</p>}
    </form>
  )
}

export function SettingsDialog() {
  const open = useUi((s) => s.settingsOpen)
  const setUi = useUi((s) => s.set)
  const apiKey = useSettings((s) => s.apiKey)
  const setApiKey = useSettings((s) => s.setApiKey)
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
      className="settings"
      onClose={() => setUi({ settingsOpen: false })}
      onClick={(e) => {
        if (e.target === e.currentTarget) setUi({ settingsOpen: false })
      }}
    >
      <div className="dialog-body">
        <h2>Settings</h2>
        <section>
          <h3>YouTube API key</h3>
          <p className="muted">
            Optional. Video links and <code>/channel/UC…</code> links work without one. A key adds live search,{' '}
            <code>@handle</code> links, live badges and viewer counts, and lets channel tiles follow their next stream.
            Free quota is 10,000 units a day; a search costs 100.
          </p>
          <ApiKeySetup />
          <ApiKeyForm />
          {apiKey && (
            <button className="text-button danger" onClick={() => setApiKey('', 'unknown')}>
              Remove key
            </button>
          )}
        </section>
        <section>
          <h3>Keyboard</h3>
          <KeyboardSummary onCustomize={() => setUi({ settingsOpen: false })} />
        </section>
        <div className="dialog-actions">
          <button className="primary" onClick={() => setUi({ settingsOpen: false })}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  )
}
