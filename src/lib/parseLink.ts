import type { Source } from './types'

export type ParseResult = { ok: true; source: Source } | { ok: false; error: string }

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/
const HANDLE = /^@?([A-Za-z0-9._-]{3,30})$/

const YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
])

const INVALID = 'Not a YouTube video or channel link'

export function parseLink(input: string): ParseResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Paste a YouTube link' }

  if (VIDEO_ID.test(text)) return { ok: true, source: { kind: 'video', id: text } }
  if (CHANNEL_ID.test(text)) return { ok: true, source: { kind: 'channel', id: text } }
  if (text.startsWith('@')) {
    const m = HANDLE.exec(text)
    return m ? { ok: true, source: { kind: 'handle', handle: m[1].toLowerCase() } } : { ok: false, error: INVALID }
  }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return { ok: false, error: INVALID }
  }
  const host = url.hostname.toLowerCase()
  if (!YT_HOSTS.has(host)) return { ok: false, error: INVALID }

  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    return parts[0] && VIDEO_ID.test(parts[0])
      ? { ok: true, source: { kind: 'video', id: parts[0] } }
      : { ok: false, error: INVALID }
  }

  const v = url.searchParams.get('v')
  if (parts[0] === 'watch' && v && VIDEO_ID.test(v)) return { ok: true, source: { kind: 'video', id: v } }

  // Checked before video ids: "live_stream" is itself 11 characters.
  if (parts[0] === 'embed' && parts[1] === 'live_stream') {
    const channel = url.searchParams.get('channel')
    return channel && CHANNEL_ID.test(channel)
      ? { ok: true, source: { kind: 'channel', id: channel } }
      : { ok: false, error: INVALID }
  }

  if (['live', 'shorts', 'embed', 'v'].includes(parts[0]) && parts[1] && VIDEO_ID.test(parts[1])) {
    return { ok: true, source: { kind: 'video', id: parts[1] } }
  }

  if (parts[0] === 'channel' && parts[1] && CHANNEL_ID.test(parts[1])) {
    return { ok: true, source: { kind: 'channel', id: parts[1] } }
  }

  if (parts[0]?.startsWith('@')) {
    const m = HANDLE.exec(decodeURIComponent(parts[0]))
    if (m) return { ok: true, source: { kind: 'handle', handle: m[1].toLowerCase() } }
  }

  return { ok: false, error: INVALID }
}
