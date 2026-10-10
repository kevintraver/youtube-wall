declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
  }
}

let loading: Promise<typeof YT> | null = null

/** Loads the YouTube IFrame Player API once. */
export function loadYT(): Promise<typeof YT> {
  loading ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.append(script)
  })
  return loading
}

export type EmbedTarget = { videoId: string } | { channelId: string }

export function embedUrl(target: EmbedTarget): string {
  const url = new URL(
    'videoId' in target
      ? `https://www.youtube.com/embed/${target.videoId}`
      : 'https://www.youtube.com/embed/live_stream',
  )
  if ('channelId' in target) url.searchParams.set('channel', target.channelId)
  const params = {
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    controls: '0',
    rel: '0',
    iv_load_policy: '3',
    enablejsapi: '1',
    origin: window.location.origin,
  }
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

// IFrame API error codes: https://developers.google.com/youtube/iframe_api_reference#onError
export function describePlayerError(code: number): string {
  if (code === 101 || code === 150) return 'The owner has disabled embedding for this video'
  if (code === 100) return 'Video not found, private, or removed'
  if (code === 2) return 'Invalid video id'
  return 'This video could not be played'
}
