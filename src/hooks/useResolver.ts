import { useEffect } from 'react'
import { ApiError, fetchVideos, findChannelLive, resolveHandle } from '../lib/dataApi'
import { sourceKey, type Source } from '../lib/types'
import { useResolved, type Resolution } from '../state/resolved'
import { usableKey, useSettings, useUsableKey } from '../state/settings'
import { useWall } from '../state/wall'

const VIDEO_POLL_MS = 2 * 60_000
const OFFLINE_CHANNEL_POLL_MS = 5 * 60_000
const RECHECK_MIN_GAP_MS = 30_000

function visibleSources(): Source[] {
  const { slots, rows, cols } = useWall.getState()
  return slots
    .slice(0, rows * cols)
    .map((s) => s.source)
    .filter((s): s is Source => s !== null)
}

function currentKey(): string | null {
  return usableKey(useSettings.getState())
}

function handleApiError(e: unknown): void {
  if (!(e instanceof ApiError)) throw e
  if (e.reason === 'quota') useSettings.getState().markQuotaExhausted()
  else if (e.reason === 'badKey') useSettings.getState().markBadKey()
  else console.warn('[youtube-wall]', e.message)
}

async function resolveVideos(ids: string[], key: string): Promise<void> {
  if (ids.length === 0) return
  const found = new Map((await fetchVideos(ids, key)).map((v) => [v.id, v]))
  const entries: Record<string, Resolution> = {}
  for (const id of ids) {
    const video = found.get(id)
    entries[`v:${id}`] = video ? { status: 'ok', video } : { status: 'missing', message: 'Video not found or private' }
  }
  useResolved.getState().put(entries)
}

async function resolveChannelLike(source: Source, key: string): Promise<void> {
  const k = sourceKey(source)
  let channelId: string
  if (source.kind === 'handle') {
    const settings = useSettings.getState()
    const cached = settings.handles[source.handle]
    const resolved = cached ?? (await resolveHandle(source.handle, key))
    if (!resolved) {
      useResolved.getState().put({ [k]: { status: 'missing', message: `No channel @${source.handle}` } })
      return
    }
    if (!cached) settings.cacheHandle(source.handle, resolved)
    channelId = resolved
  } else if (source.kind === 'channel') {
    channelId = source.id
  } else {
    return
  }
  const live = await findChannelLive(channelId, key)
  useResolved.getState().put({ [k]: live ? { status: 'ok', video: live } : { status: 'offline' } })
}

async function resolvePending(sources: Source[], key: string): Promise<void> {
  const { map, put } = useResolved.getState()
  const pending = sources.filter((s) => !map[sourceKey(s)])
  if (pending.length === 0) return
  put(Object.fromEntries(pending.map((s) => [sourceKey(s), { status: 'loading' } as Resolution])))
  try {
    await resolveVideos(
      pending.flatMap((s) => (s.kind === 'video' ? [s.id] : [])),
      key,
    )
    await Promise.all(pending.filter((s) => s.kind !== 'video').map((s) => resolveChannelLike(s, key)))
  } catch (e) {
    const stillLoading = pending.filter((s) => useResolved.getState().map[sourceKey(s)]?.status === 'loading')
    if (e instanceof ApiError && e.reason === 'other') {
      put(Object.fromEntries(stillLoading.map((s) => [sourceKey(s), { status: 'missing', message: e.message } as Resolution])))
    } else {
      // Key or quota problem: drop the loading markers so these resolve again once a key works.
      useResolved.setState((st) => {
        const next = { ...st.map }
        for (const s of stillLoading) delete next[sourceKey(s)]
        return { map: next }
      })
    }
    handleApiError(e)
  }
}

// Every 2 min: one batched videos.list for everything on the wall (status + viewer counts).
// Channels whose stream has ended get re-resolved to follow their next stream.
async function pollVideos(key: string): Promise<void> {
  const sources = visibleSources()
  const { map } = useResolved.getState()
  const direct = sources.flatMap((s) => (s.kind === 'video' ? [s.id] : []))
  const followed = sources.flatMap((s) => {
    const r = map[sourceKey(s)]
    return s.kind !== 'video' && r?.status === 'ok' ? [{ source: s, videoId: r.video.id }] : []
  })
  const ids = [...direct, ...followed.map((f) => f.videoId)]
  if (ids.length === 0) return
  const found = new Map((await fetchVideos(ids, key)).map((v) => [v.id, v]))

  const entries: Record<string, Resolution> = {}
  for (const id of direct) {
    const video = found.get(id)
    if (video) entries[`v:${id}`] = { status: 'ok', video }
  }
  const ended: Source[] = []
  for (const f of followed) {
    const video = found.get(f.videoId)
    if (video?.live === 'live') entries[sourceKey(f.source)] = { status: 'ok', video }
    else ended.push(f.source)
  }
  useResolved.getState().put(entries)
  await Promise.all(ended.map((s) => resolveChannelLike(s, key)))
}

async function pollOfflineChannels(key: string): Promise<void> {
  const { map } = useResolved.getState()
  const offline = visibleSources().filter((s) => s.kind !== 'video' && map[sourceKey(s)]?.status === 'offline')
  await Promise.all(offline.map((s) => resolveChannelLike(s, key)))
}

const lastRecheck = new Map<string, number>()

/** Called by a tile when its channel stream errors or ends: look for the channel's current stream now. */
export function recheckChannel(source: Source): void {
  const key = currentKey()
  if (!key || source.kind === 'video') return
  const k = sourceKey(source)
  if (Date.now() - (lastRecheck.get(k) ?? 0) < RECHECK_MIN_GAP_MS) return
  lastRecheck.set(k, Date.now())
  resolveChannelLike(source, key).catch(handleApiError)
}

function every(ms: number, fn: (key: string) => Promise<void>): () => void {
  const id = window.setInterval(() => {
    const key = currentKey()
    if (key && !document.hidden) fn(key).catch(handleApiError)
  }, ms)
  return () => window.clearInterval(id)
}

/** Keeps resolutions for every visible slot fresh while an API key is usable. */
export function useResolver(): void {
  const key = useUsableKey()
  const visibleKeys = useWall((s) =>
    s.slots
      .slice(0, s.rows * s.cols)
      .flatMap((slot) => (slot.source ? [sourceKey(slot.source)] : []))
      .join('|'),
  )
  const quotaExhaustedUntil = useSettings((s) => s.quotaExhaustedUntil)

  useEffect(() => {
    if (key) void resolvePending(visibleSources(), key)
  }, [key, visibleKeys])

  // The quota resets at Pacific midnight; clear the flag then so the key becomes usable again.
  useEffect(() => {
    if (!quotaExhaustedUntil) return
    const wait = Math.max(0, quotaExhaustedUntil - Date.now())
    const id = window.setTimeout(() => useSettings.setState({ quotaExhaustedUntil: 0 }), wait)
    return () => window.clearTimeout(id)
  }, [quotaExhaustedUntil])

  useEffect(() => {
    if (!key) return
    const stopVideos = every(VIDEO_POLL_MS, pollVideos)
    const stopChannels = every(OFFLINE_CHANNEL_POLL_MS, pollOfflineChannels)
    return () => {
      stopVideos()
      stopChannels()
    }
  }, [key])
}
