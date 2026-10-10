import { describe, expect, it } from 'vitest'
import { decodeWall, encodeWall, type SharedWall } from '../hash'

describe('wall hash', () => {
  it('round-trips layout, size and sources', () => {
    const wall: SharedWall = {
      layout: 'main-strip',
      rows: 2,
      cols: 3,
      sources: [
        { kind: 'video', id: 'dQw4w9WgXcQ' },
        null,
        { kind: 'channel', id: 'UC4R8DWoMoI7CAwX8_LjQHig' },
        { kind: 'handle', handle: 'nasa' },
        null,
        null,
      ],
    }
    expect(decodeWall(`#${encodeWall(wall)}`)).toEqual(wall)
  })

  it('ignores hashes that are not walls', () => {
    expect(decodeWall('')).toBeNull()
    expect(decodeWall('#section-2')).toBeNull()
  })

  it('falls back to grid and a fitting size for bad params', () => {
    const decoded = decodeWall('#l=bogus&s=v:dQw4w9WgXcQ,_,_,_,_')
    expect(decoded?.layout).toBe('grid')
    expect(decoded?.cols).toBe(3)
    expect(decoded?.rows).toBe(2)
  })
})
