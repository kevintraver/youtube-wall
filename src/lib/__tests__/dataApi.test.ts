import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchVideos, findChannelLive } from '../dataApi'

function video(id: string, live: 'live' | 'none' = 'none') {
  return {
    id,
    snippet: { title: id, channelId: 'UCx', channelTitle: 'Chan', liveBroadcastContent: live, thumbnails: {} },
    liveStreamingDetails: live === 'live' ? { concurrentViewers: '1234' } : undefined,
  }
}

function respond(handler: (url: URL) => { status?: number; body: unknown }) {
  const mock = vi.fn(async (input: URL | RequestInfo) => {
    const { status = 200, body } = handler(new URL(String(input)))
    return new Response(JSON.stringify(body), { status })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe('dataApi', () => {
  it('batches video ids 50 per request and dedupes', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `vid${String(i).padStart(8, '0')}`)
    const mock = respond((url) => ({
      body: { items: url.searchParams.get('id')!.split(',').map((id) => video(id)) },
    }))
    const out = await fetchVideos([...ids, ...ids.slice(0, 10)], 'KEY')
    expect(mock).toHaveBeenCalledTimes(3)
    expect(out).toHaveLength(120)
  })

  it('finds the live video among a channel’s uploads', async () => {
    respond((url) => {
      if (url.pathname.endsWith('/playlistItems')) {
        expect(url.searchParams.get('playlistId')).toBe('UUabc')
        return { body: { items: ['a', 'b', 'c'].map((videoId) => ({ contentDetails: { videoId } })) } }
      }
      return { body: { items: [video('a'), video('b', 'live'), video('c')] } }
    })
    const live = await findChannelLive('UCabc', 'KEY')
    expect(live?.id).toBe('b')
    expect(live?.viewers).toBe(1234)
  })

  it('returns null when nothing is live', async () => {
    respond((url) =>
      url.pathname.endsWith('/playlistItems')
        ? { body: { items: [{ contentDetails: { videoId: 'a' } }] } }
        : { body: { items: [video('a')] } },
    )
    expect(await findChannelLive('UCabc', 'KEY')).toBeNull()
  })

  it('classifies quota and bad-key errors', async () => {
    respond(() => ({ status: 403, body: { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } } }))
    await expect(fetchVideos(['a'], 'KEY')).rejects.toMatchObject({ reason: 'quota' })

    respond(() => ({
      status: 400,
      body: { error: { message: 'API key not valid. Please pass a valid API key.', errors: [{ reason: 'badRequest' }] } },
    }))
    const err = await fetchVideos(['a'], 'KEY').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ reason: 'badKey' })
  })
})
