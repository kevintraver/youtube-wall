import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('window', globalThis)
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, val: string) => void memory.set(k, val),
  removeItem: (k: string) => void memory.delete(k),
})

const { effectiveKeymap, useKeymap } = await import('../store')

beforeEach(() => useKeymap.getState().resetAll())

describe('keymap store', () => {
  it('replaces a binding, stealing it from the command that had it', () => {
    useKeymap.getState().assign('view.fullscreen', ['M'], 'replace', [{ id: 'audio.muteAll', binding: ['M'], kind: 'same' }])
    const keymap = effectiveKeymap()
    expect(keymap['view.fullscreen']).toEqual([['M']])
    expect(keymap['audio.muteAll']).toEqual([])
  })

  it('adds an alternate binding', () => {
    useKeymap.getState().assign('audio.muteAll', ['Shift+M'], 'add')
    expect(effectiveKeymap()['audio.muteAll']).toEqual([['M'], ['Shift+M']])
  })

  it('clears and resets', () => {
    useKeymap.getState().clear('history.undo')
    expect(effectiveKeymap()['history.undo']).toEqual([])
    useKeymap.getState().reset('history.undo')
    expect(effectiveKeymap()['history.undo']).toEqual([['Mod+Z']])
  })

  it('persists only the overrides', () => {
    useKeymap.getState().assign('wall.share', ['S'], 'replace')
    expect(JSON.parse(memory.get('youtube-wall-keymap') ?? '{}')).toEqual({
      state: { overrides: { 'wall.share': [['S']] } },
      version: 1,
    })
  })
})
