import { useEffect, useRef } from 'react'
import { embedUrl, loadYT, type EmbedTarget } from '../lib/ytApi'

const ENDED = 0
const PLAYING = 1

type Props = {
  target: EmbedTarget
  muted: boolean
  onError: (code: number) => void
  onEnded: () => void
  onTitle: (title: string) => void
}

export function Player({ target, muted, onError, onEnded, onTitle }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const mutedRef = useRef(muted)
  const handlers = useRef({ onError, onEnded, onTitle })

  useEffect(() => {
    handlers.current = { onError, onEnded, onTitle }
  })

  const src = embedUrl(target)

  useEffect(() => {
    let cancelled = false
    loadYT().then((YTApi) => {
      if (cancelled || !iframeRef.current) return
      new YTApi.Player(iframeRef.current, {
        events: {
          onReady: (e) => {
            if (cancelled) return
            playerRef.current = e.target
            applyMute(e.target, mutedRef.current)
            const title = e.target.getVideoData()?.title
            if (title) handlers.current.onTitle(title)
          },
          onStateChange: (e) => {
            if (e.data === ENDED) handlers.current.onEnded()
            if (e.data === PLAYING) {
              const title = e.target.getVideoData()?.title
              if (title) handlers.current.onTitle(title)
            }
          },
          onError: (e) => handlers.current.onError(e.data),
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current = null
    }
  }, [src])

  useEffect(() => {
    mutedRef.current = muted
    if (playerRef.current) applyMute(playerRef.current, muted)
  }, [muted])

  return (
    <iframe
      ref={iframeRef}
      className="player"
      src={src}
      title="YouTube player"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      tabIndex={-1}
    />
  )
}

function applyMute(player: YT.Player, muted: boolean): void {
  if (muted) {
    player.mute()
  } else {
    player.unMute()
    player.setVolume(100)
    player.playVideo()
  }
}
