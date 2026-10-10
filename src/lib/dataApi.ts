import type { LiveStatus, VideoInfo } from './types'

// The only module that talks to the YouTube Data API v3.
// Quota costs (default 10,000 units/day): videos/channels/playlistItems = 1, search = 100.

const BASE = 'https://www.googleapis.com/youtube/v3/'

export type ApiErrorReason = 'quota' | 'badKey' | 'other'

export class ApiError extends Error {
  readonly reason: ApiErrorReason

  constructor(reason: ApiErrorReason, message: string) {
    super(message)
    this.reason = reason
  }
}

type ErrorBody = { error?: { message?: string; errors?: { reason?: string }[] } }

async function call<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('key', key)

  const res = await fetch(url)
  if (res.ok) return (await res.json()) as T

  const body = (await res.json().catch(() => ({}))) as ErrorBody
  const reasons = body.error?.errors?.map((e) => e.reason) ?? []
  const message = body.error?.message ?? `YouTube API error ${res.status}`
  if (reasons.some((r) => r === 'quotaExceeded' || r === 'dailyLimitExceeded' || r === 'rateLimitExceeded')) {
    throw new ApiError('quota', 'YouTube API quota used up for today')
  }
  const keyProblem = reasons.some((r) => r === 'keyInvalid' || r === 'accessNotConfigured' || r === 'ipRefererBlocked')
  if (keyProblem || (res.status === 400 && /api key/i.test(message))) {
    throw new ApiError('badKey', message)
  }
  throw new ApiError('other', message)
}

type Thumbs = { medium?: { url: string }; high?: { url: string }; default?: { url: string } }

type VideoItem = {
  id: string
  snippet: {
    title: string
    channelId: string
    channelTitle: string
    liveBroadcastContent: LiveStatus
    thumbnails: Thumbs
  }
  liveStreamingDetails?: { concurrentViewers?: string; actualEndTime?: string }
}

function pickThumb(t: Thumbs): string {
  return t.medium?.url ?? t.high?.url ?? t.default?.url ?? ''
}

function toVideoInfo(item: VideoItem): VideoInfo {
  const viewers = item.liveStreamingDetails?.concurrentViewers
  return {
    id: item.id,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    thumb: pickThumb(item.snippet.thumbnails),
    live: item.snippet.liveBroadcastContent,
    viewers: viewers === undefined ? undefined : Number(viewers),
  }
}

/** Fetch metadata for any number of videos, 50 ids (1 unit) per request. Missing ids are omitted. */
export async function fetchVideos(ids: string[], key: string): Promise<VideoInfo[]> {
  const unique = [...new Set(ids)]
  const out: VideoInfo[] = []
  for (let i = 0; i < unique.length; i += 50) {
    const data = await call<{ items: VideoItem[] }>(
      'videos',
      { part: 'snippet,liveStreamingDetails', id: unique.slice(i, i + 50).join(','), maxResults: '50' },
      key,
    )
    out.push(...data.items.map(toVideoInfo))
  }
  return out
}

/** @handle → UC… channel id (1 unit). Null if no such channel. */
export async function resolveHandle(handle: string, key: string): Promise<string | null> {
  const data = await call<{ items?: { id: string }[] }>('channels', { part: 'id', forHandle: `@${handle}` }, key)
  return data.items?.[0]?.id ?? null
}

/**
 * The channel's current live stream, or null if it isn't live (2 units).
 * Reads the newest uploads instead of using search, which costs 100 units.
 */
export async function findChannelLive(channelId: string, key: string): Promise<VideoInfo | null> {
  const uploads = `UU${channelId.slice(2)}`
  const data = await call<{ items?: { contentDetails: { videoId: string } }[] }>(
    'playlistItems',
    { part: 'contentDetails', playlistId: uploads, maxResults: '10' },
    key,
  ).catch((e: unknown) => {
    // Channels with no uploads have no uploads playlist.
    if (e instanceof ApiError && e.reason === 'other') return { items: [] }
    throw e
  })
  const ids = (data.items ?? []).map((i) => i.contentDetails.videoId)
  if (ids.length === 0) return null
  const videos = await fetchVideos(ids, key)
  return videos.find((v) => v.live === 'live') ?? null
}

export type SearchOrder = 'relevance' | 'viewCount'

/**
 * Live-only search, with viewer counts (100 units for the search + 1 for the counts).
 * An empty query with order 'viewCount' gives the most-watched live streams right now.
 */
export async function searchLive(
  q: string,
  key: string,
  order: SearchOrder = 'relevance',
  maxResults = 25,
): Promise<VideoInfo[]> {
  const params: Record<string, string> = {
    part: 'snippet',
    type: 'video',
    eventType: 'live',
    maxResults: String(maxResults),
    order,
  }
  if (q) params.q = q
  const data = await call<{ items: { id: { videoId: string }; snippet: VideoItem['snippet'] }[] }>('search', params, key)
  const found = data.items.map((item) => ({
    id: item.id.videoId,
    title: decodeEntities(item.snippet.title),
    channelId: item.snippet.channelId,
    channelTitle: decodeEntities(item.snippet.channelTitle),
    thumb: pickThumb(item.snippet.thumbnails),
    live: item.snippet.liveBroadcastContent,
  }))
  if (found.length === 0) return []
  const stats = new Map((await fetchVideos(found.map((r) => r.id), key)).map((v) => [v.id, v.viewers]))
  return found.map((r) => ({ ...r, viewers: stats.get(r.id) }))
}

/** Cheap call (1 unit) to check that a key works. */
export async function testKey(key: string): Promise<void> {
  await call('videos', { part: 'id', id: 'jNQXAC9IVRw' }, key)
}

// search.list returns HTML-escaped titles.
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
