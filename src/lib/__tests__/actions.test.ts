import { beforeEach, describe, expect, it, vi } from 'vitest'

// The UI store uses browser timers; give it what it needs under Node.
vi.stubGlobal('window', globalThis)
vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0))
const memory = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, val: string) => void memory.set(k, val),
  removeItem: (k: string) => void memory.delete(k),
})

const { clearAll, fillEmptyTiles, placeAt, placeWithUndo, quickAdd, removeFromSlot, undoLast, undoRemoval } = await import('../actions')
const { useWall } = await import('../../state/wall')
const { useHistory } = await import('../../state/history')
const { useUi } = await import('../../state/ui')

const v = (id: string) => ({ kind: 'video' as const, id: id.padEnd(11, '0') })
const sources = () => useWall.getState().slots.slice(0, 9).map((s) => (s.source?.kind === 'video' ? s.source.id[0] : '_')).join('')
const video = (id: string, viewers: number) => ({
  id: id.padEnd(11, '0'),
  title: id,
  channelId: 'UC',
  channelTitle: 'c',
  thumb: '',
  live: 'live' as const,
  viewers,
})

beforeEach(() => {
  useWall.getState().importShared(`#l=grid&g=3x3&s=v:${v('a').id},v:${v('b').id},v:${v('c').id},_,_,_,_,_,_`)
  useHistory.setState({ entries: [] })
  useUi.setState({ placing: null, searchTarget: null, removed: {} })
})

describe('undo', () => {
  it('restores a removed stream to its tile', () => {
    removeFromSlot('s1')
    expect(sources()).toBe('a_c______')
    undoLast()
    expect(sources()).toBe('abc______')
  })

  it('restores into the next empty tile if the old one was reused', () => {
    removeFromSlot('s1')
    placeWithUndo('s1', v('x'))
    // Undo the removal specifically (not the later add): it must not clobber "x".
    const removal = useHistory.getState().entries[0]
    useHistory.getState().undoEntry(removal.id)
    expect(sources()).toBe('axcb_____')
  })

  it('steps back through several changes in order', () => {
    removeFromSlot('s0')
    removeFromSlot('s2')
    undoLast()
    expect(sources()).toBe('_bc______')
    undoLast()
    expect(sources()).toBe('abc______')
    undoLast() // nothing left: no-op
    expect(sources()).toBe('abc______')
  })

  it('a removed tile offers its own Undo, which puts the stream back there', () => {
    removeFromSlot('s1')
    expect(useUi.getState().removed.s1?.source).toEqual(v('b'))
    undoRemoval('s1')
    expect(sources()).toBe('abc______')
    expect(useUi.getState().removed.s1).toBeUndefined()
    // It was also taken off the history, so ⌘Z can't restore it a second time.
    expect(useHistory.getState().entries.some((e) => e.label === 'Removed Tile 2')).toBe(false)
  })

  it("a tile's Undo goes away once something else is put in it", () => {
    removeFromSlot('s1')
    placeWithUndo('s1', v('x'))
    expect(useUi.getState().removed.s1).toBeUndefined()
  })

  it('⌘Z after a removal also clears that tile’s Undo', () => {
    removeFromSlot('s1')
    undoLast()
    expect(sources()).toBe('abc______')
    expect(useUi.getState().removed.s1).toBeUndefined()
  })

  it('Clear all empties everything, resets to 3×3, and drops tile Undos', () => {
    useWall.getState().setSize(4, 4)
    removeFromSlot('s2')
    clearAll()
    const w = useWall.getState()
    expect(w.slots.every((s) => !s.source)).toBe(true)
    expect([w.rows, w.cols]).toEqual([3, 3])
    expect(w.audioSlotId).toBeNull()
    expect(useUi.getState().removed).toEqual({})
    // Fill now targets exactly the 9 fresh tiles.
    fillEmptyTiles(['d', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'].map((id, i) => video(id, i)))
    expect(sources()).not.toContain('_')
    expect(useWall.getState().slots.slice(9).every((s) => !s.source)).toBe(true)
  })

  it('undoing Clear all restores the streams and the grid size', () => {
    useWall.getState().setSize(4, 4)
    useWall.getState().setSource('s12', v('z'))
    clearAll()
    undoLast()
    const w = useWall.getState()
    expect([w.rows, w.cols]).toEqual([4, 4])
    expect(w.slots[12].source).toEqual(v('z'))
    expect(sources()).toBe('abc______')
  })

  it('undoes Clear all, including tiles hidden by a smaller grid', () => {
    useWall.getState().setSize(1, 1) // a stays visible; b and c are hidden but kept
    clearAll()
    expect(useWall.getState().slots.every((s) => !s.source)).toBe(true)
    undoLast()
    useWall.getState().setSize(3, 3)
    expect(sources()).toBe('abc______')
  })

  it('undoes Fill without touching tiles changed afterwards', () => {
    fillEmptyTiles([video('d', 10), video('e', 50), video('a', 99)]) // a is already on the wall
    expect(sources()).toBe('abced____') // most-watched first
    placeWithUndo('s3', v('z')) // user replaces one of the filled tiles
    useHistory.getState().undoEntry(useHistory.getState().entries[0].id)
    expect(sources()).toBe('abcz_____')
  })
})

describe('adding from search', () => {
  it('quick add fills the next empty tile', () => {
    quickAdd({ source: v('q'), title: 'q', thumb: '' })
    expect(sources()).toBe('abcq_____')
  })

  it('quick add on a full wall enters placement mode instead of growing the grid', () => {
    fillEmptyTiles(['d', 'e', 'f', 'g', 'h', 'i'].map((id, i) => video(id, i)))
    quickAdd({ source: v('q'), title: 'q', thumb: '' })
    expect(useWall.getState().rows * useWall.getState().cols).toBe(9)
    expect(useUi.getState().placing?.title).toBe('q')
    placeAt('s4')
    expect(useUi.getState().placing).toBeNull()
    expect(sources()[4]).toBe('q')
    undoLast()
    expect(sources()[4]).not.toBe('q')
  })
})
