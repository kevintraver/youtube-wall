import { useState } from 'react'
import { parseLink } from '../lib/parseLink'
import type { Source } from '../lib/types'

type Props = {
  initial?: string
  autoFocus?: boolean
  onSubmit: (source: Source) => void
  onCancel?: () => void
  onSlash?: () => void // "/" typed into an empty box
}

export function LinkInput({ initial = '', autoFocus, onSubmit, onCancel, onSlash }: Props) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const submit = (text: string) => {
    const result = parseLink(text)
    if (result.ok) {
      setError(null)
      onSubmit(result.source)
    } else {
      setError(result.error)
    }
  }

  return (
    <form
      className="link-input"
      onSubmit={(e) => {
        e.preventDefault()
        submit(value)
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={value}
        name="link"
        aria-label="YouTube video or channel link"
        autoComplete="off"
        placeholder="Paste a YouTube video or channel link"
        autoFocus={autoFocus}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text')
          if (parseLink(text).ok) {
            e.preventDefault()
            setValue(text)
            submit(text)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel?.()
          if (e.key === '/' && value === '' && onSlash) {
            e.preventDefault()
            e.currentTarget.blur()
            onSlash()
          }
        }}
      />
      {error && <p className="link-error">{error}</p>}
    </form>
  )
}
