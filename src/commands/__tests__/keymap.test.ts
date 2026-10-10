import { describe, expect, it } from 'vitest'
import { bindingEquals, DEFAULT_KEYMAP, mergeKeymap, removeBinding, resetOverride, setOverride } from '../keymap'
import type { Keymap } from '../types'

const defaults: Keymap = {
  'audio.muteAll': [['M']],
  'tile.removeHovered': [['Delete'], ['Backspace']],
  'history.undo': [['Mod+Z']],
}

describe('mergeKeymap', () => {
  it('layers overrides on top of defaults', () => {
    const merged = mergeKeymap(defaults, { 'audio.muteAll': [['Shift+M']], 'wall.share': [['S']] })
    expect(merged['audio.muteAll']).toEqual([['Shift+M']])
    expect(merged['wall.share']).toEqual([['S']])
    expect(merged['history.undo']).toEqual([['Mod+Z']])
  })

  it('treats an empty override as unbound', () => {
    expect(mergeKeymap(defaults, { 'history.undo': [] })['history.undo']).toEqual([])
  })

  it('binds the sequences and Mod chords the app ships with', () => {
    expect(DEFAULT_KEYMAP['tile.pick.3']).toEqual([['3']])
    expect(DEFAULT_KEYMAP['tile.sound.3']).toEqual([['G', '3']])
    expect(DEFAULT_KEYMAP['layout.main-strip']).toEqual([['L', '2']])
    expect(DEFAULT_KEYMAP['wall.clear']).toEqual([['C', 'C']])
    expect(DEFAULT_KEYMAP['history.undo']).toEqual([['Mod+Z']])
    expect(DEFAULT_KEYMAP['tile.swapBack']).toEqual([['`']])
    expect(DEFAULT_KEYMAP['wall.share']).toBeUndefined()
  })
})

describe('overrides', () => {
  it('stores a changed binding', () => {
    expect(setOverride({}, defaults, 'audio.muteAll', [['N']], 'mac')).toEqual({ 'audio.muteAll': [['N']] })
  })

  it('drops the override once it matches the default again', () => {
    const overrides = setOverride({}, defaults, 'audio.muteAll', [['N']], 'mac')
    expect(setOverride(overrides, defaults, 'audio.muteAll', [['M']], 'mac')).toEqual({})
  })

  it('compares Mod per platform', () => {
    expect(setOverride({}, defaults, 'history.undo', [['Meta+Z']], 'mac')).toEqual({})
    expect(setOverride({}, defaults, 'history.undo', [['Meta+Z']], 'windows')).toEqual({ 'history.undo': [['Meta+Z']] })
  })

  it('unbinds one of several bindings, then the last one', () => {
    let overrides = removeBinding({}, defaults, 'tile.removeHovered', ['Backspace'], 'mac')
    expect(mergeKeymap(defaults, overrides)['tile.removeHovered']).toEqual([['Delete']])
    overrides = removeBinding(overrides, defaults, 'tile.removeHovered', ['Delete'], 'mac')
    expect(overrides['tile.removeHovered']).toEqual([])
  })

  it('resets a single command', () => {
    expect(resetOverride({ 'audio.muteAll': [], 'history.undo': [] }, 'audio.muteAll')).toEqual({ 'history.undo': [] })
  })
})

describe('bindingEquals', () => {
  it('needs every step to match', () => {
    expect(bindingEquals(['G', '1'], ['G', '1'], 'mac')).toBe(true)
    expect(bindingEquals(['G', '1'], ['G', '2'], 'mac')).toBe(false)
    expect(bindingEquals(['G'], ['G', '1'], 'mac')).toBe(false)
  })
})
