export type Source =
  | { kind: 'video'; id: string }
  | { kind: 'channel'; id: string }
  | { kind: 'handle'; handle: string }

export type Slot = { id: string; source: Source | null }

export type LayoutKind = 'grid' | 'main-strip' | 'main-sidebar' | 'main-2x2'

export type LiveStatus = 'live' | 'upcoming' | 'none'

export type VideoInfo = {
  id: string
  title: string
  channelId: string
  channelTitle: string
  thumb: string
  live: LiveStatus
  viewers?: number
}

export function sourceKey(source: Source): string {
  switch (source.kind) {
    case 'video':
      return `v:${source.id}`
    case 'channel':
      return `c:${source.id}`
    case 'handle':
      return `h:${source.handle}`
  }
}

export function sourceUrl(source: Source): string {
  switch (source.kind) {
    case 'video':
      return `https://www.youtube.com/watch?v=${source.id}`
    case 'channel':
      return `https://www.youtube.com/channel/${source.id}/live`
    case 'handle':
      return `https://www.youtube.com/@${source.handle}/live`
  }
}
