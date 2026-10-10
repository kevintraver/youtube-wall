import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type KeyStatus = 'unknown' | 'ok' | 'bad'

type SettingsState = {
  apiKey: string
  keyStatus: KeyStatus
  quotaExhaustedUntil: number // 0 = quota available; otherwise when it resets
  handles: Record<string, string> // @handle → UC… channel id; handles don't change, so cached forever

  setApiKey: (key: string, status: KeyStatus) => void
  markBadKey: () => void
  markQuotaExhausted: () => void
  cacheHandle: (handle: string, channelId: string) => void
}

// YouTube quota resets at midnight Pacific time.
function nextPacificMidnight(): number {
  const now = new Date()
  const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const offset = now.getTime() - pacific.getTime()
  pacific.setHours(24, 0, 0, 0)
  return pacific.getTime() + offset
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      keyStatus: 'unknown',
      quotaExhaustedUntil: 0,
      handles: {},

      setApiKey: (apiKey, keyStatus) => set({ apiKey: apiKey.trim(), keyStatus, quotaExhaustedUntil: 0 }),
      markBadKey: () => set({ keyStatus: 'bad' }),
      markQuotaExhausted: () => set({ quotaExhaustedUntil: nextPacificMidnight() }),
      cacheHandle: (handle, channelId) => set((s) => ({ handles: { ...s.handles, [handle]: channelId } })),
    }),
    { name: 'youtube-wall-settings' },
  ),
)

/** The key to use for API calls right now, or null when running embed-only. */
export function usableKey(s: Pick<SettingsState, 'apiKey' | 'keyStatus' | 'quotaExhaustedUntil'>): string | null {
  if (!s.apiKey || s.keyStatus === 'bad' || s.quotaExhaustedUntil > 0) return null
  return s.apiKey
}

export function useUsableKey(): string | null {
  return useSettings((s) => usableKey(s))
}
