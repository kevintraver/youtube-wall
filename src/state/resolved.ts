import { create } from 'zustand'
import type { VideoInfo } from '../lib/types'

// What the API says a slot's source should play right now. Keyed by sourceKey().
export type Resolution =
  | { status: 'loading' }
  | { status: 'ok'; video: VideoInfo } // video source: its metadata; channel/handle: its current live stream
  | { status: 'offline' } // channel/handle that isn't live right now
  | { status: 'missing'; message: string }

type ResolvedState = {
  map: Record<string, Resolution>
  put: (entries: Record<string, Resolution>) => void
}

export const useResolved = create<ResolvedState>()((set) => ({
  map: {},
  put: (entries) => set((s) => ({ map: { ...s.map, ...entries } })),
}))
