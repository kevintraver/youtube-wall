import { beforeEach, describe, expect, it } from 'vitest'
import { useWall } from '../wall'

const video = (id: string) => ({ kind: 'video' as const, id })
const ids = () => useWall.getState().slots.map((s) => s.id)

beforeEach(() => {
  useWall.getState().importShared('#l=grid&g=3x3&s=v:aaaaaaaaaaa,v:bbbbbbbbbbb,v:ccccccccccc,_,_,_,_,_,_')
})

describe('wall store', () => {
  it('toggleSound solos a tile and toggles it back off', () => {
    const { toggleSound } = useWall.getState()
    toggleSound('s1')
    expect(useWall.getState().audioSlotId).toBe('s1')
    toggleSound('s2')
    expect(useWall.getState().audioSlotId).toBe('s2')
    toggleSound('s2')
    expect(useWall.getState().audioSlotId).toBeNull()
  })

  it('toggleSound never moves tiles, even in a main layout', () => {
    useWall.getState().setLayout('main-strip')
    const before = ids()
    useWall.getState().toggleSound('s2')
    expect(ids()).toEqual(before)
    expect(useWall.getState().audioSlotId).toBe('s2')
  })

  it('clicking a small tile in a main layout swaps it into main with sound', () => {
    useWall.getState().setLayout('main-strip')
    useWall.getState().activate('s2')
    const { slots, audioSlotId } = useWall.getState()
    expect(slots[0].id).toBe('s2')
    expect(audioSlotId).toBe('s2')
  })

  it('growForEmptySlot returns the first empty visible slot, growing the grid only when full', () => {
    const wall = useWall.getState()
    expect(wall.growForEmptySlot()).toBe('s3')
    for (let i = 3; i < 9; i++) wall.setSource(`s${i}`, video(`x${i}`.padEnd(11, '0')))
    expect(useWall.getState().rows * useWall.getState().cols).toBe(9)
    expect(useWall.getState().growForEmptySlot()).toBe('s9')
    const { rows, cols } = useWall.getState()
    expect(rows * cols).toBe(12)
  })

  it('shrinking hides links and growing restores them', () => {
    useWall.getState().setSize(1, 1)
    useWall.getState().setSize(3, 3)
    expect(useWall.getState().slots[2].source).toEqual(video('ccccccccccc'))
  })

  it('swapBack undoes the last promote, and pressing it again re-promotes', () => {
    useWall.getState().setLayout('main-strip')
    const before = ids()
    useWall.getState().promote('s4')
    expect(ids()[0]).toBe('s4')
    expect(ids()[4]).toBe('s0')
    useWall.getState().swapBack()
    expect(ids()).toEqual(before)
    useWall.getState().swapBack() // toggle: "previous channel"
    expect(ids()[0]).toBe('s4')
  })

  it('swapBack is unavailable in Grid, before any promote, or once main changed some other way', () => {
    expect(useWall.getState().canSwapBack()).toBe(false)
    useWall.getState().setLayout('main-strip')
    useWall.getState().promote('s2')
    expect(useWall.getState().canSwapBack()).toBe(true)
    useWall.getState().swap('s2', 's5') // e.g. dragged the main tile elsewhere
    expect(useWall.getState().canSwapBack()).toBe(false)
    useWall.getState().swapBack() // no-op
    expect(ids()[0]).toBe('s5')
    useWall.getState().setLayout('grid')
    useWall.getState().promote('s7')
    expect(useWall.getState().canSwapBack()).toBe(false)
  })
})
