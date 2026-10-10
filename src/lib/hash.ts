import type { LayoutKind, Source } from './types'

export type SharedWall = {
  layout: LayoutKind
  rows: number
  cols: number
  sources: (Source | null)[]
}

const LAYOUTS: LayoutKind[] = ['grid', 'main-strip', 'main-sidebar', 'main-2x2']

function encodeSource(source: Source | null): string {
  if (!source) return '_'
  switch (source.kind) {
    case 'video':
      return `v:${source.id}`
    case 'channel':
      return `c:${source.id}`
    case 'handle':
      return `h:${source.handle}`
  }
}

function decodeSource(token: string): Source | null {
  const [prefix, value] = [token.slice(0, 2), token.slice(2)]
  if (!value) return null
  if (prefix === 'v:') return { kind: 'video', id: value }
  if (prefix === 'c:') return { kind: 'channel', id: value }
  if (prefix === 'h:') return { kind: 'handle', handle: value }
  return null
}

export function encodeWall(wall: SharedWall): string {
  const params = new URLSearchParams()
  params.set('l', wall.layout)
  params.set('g', `${wall.rows}x${wall.cols}`)
  params.set('s', wall.sources.map(encodeSource).join(','))
  return params.toString()
}

export function decodeWall(hash: string): SharedWall | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const s = params.get('s')
  if (s === null) return null

  const layoutParam = params.get('l')
  const layout = LAYOUTS.find((l) => l === layoutParam) ?? 'grid'
  const sources = s.split(',').map(decodeSource)

  const g = /^(\d+)x(\d+)$/.exec(params.get('g') ?? '')
  const cols = g ? clamp(Number(g[2])) : Math.min(4, Math.ceil(Math.sqrt(sources.length)))
  const rows = g ? clamp(Number(g[1])) : clamp(Math.ceil(sources.length / cols))

  return { layout, rows, cols, sources }
}

function clamp(n: number): number {
  return Math.max(1, Math.min(4, n))
}
