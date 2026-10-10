import { describe, expect, it } from 'vitest'
import { findAllConflicts, findConflicts } from '../conflicts'
import { DEFAULT_KEYMAP } from '../keymap'
import { activeScopes, scopesOverlap } from '../scopes'
import type { CommandId, Keymap, Scope } from '../types'

const scopes: Partial<Record<CommandId, Scope>> = {
  'search.close': 'search',
  'placing.cancel': 'placing',
  'editing.cancel': 'editing',
}
const scopeOf = (id: CommandId): Scope => scopes[id] ?? 'global'

const keymap: Keymap = {
  'audio.muteAll': [['M']],
  'history.undo': [['Mod+Z']],
  'search.close': [['Escape']],
  'placing.cancel': [['Escape']],
  'editing.cancel': [['Escape']],
  'tile.sound.1': [['G', '1']],
  'tile.pick.1': [['1']],
  'layout.grid': [['L', '1']],
}

describe('findConflicts', () => {
  it('finds a global command already using the keys', () => {
    expect(findConflicts(keymap, 'view.fullscreen', ['M'], scopeOf, 'mac')).toEqual([
      { id: 'audio.muteAll', binding: ['M'], kind: 'same' },
    ])
  })

  it('resolves Mod before comparing', () => {
    expect(findConflicts(keymap, 'wall.share', ['Meta+Z'], scopeOf, 'mac')).toHaveLength(1)
    expect(findConflicts(keymap, 'wall.share', ['Meta+Z'], scopeOf, 'windows')).toHaveLength(0)
  })

  it('ignores the command itself', () => {
    expect(findConflicts(keymap, 'audio.muteAll', ['M'], scopeOf, 'mac')).toEqual([])
  })

  it('lets modes share keys, since only one mode is live at a time', () => {
    expect(findConflicts(keymap, 'search.close', ['Escape'], scopeOf, 'mac')).toEqual([])
  })

  it('flags a mode command that clashes with a global one', () => {
    expect(findConflicts(keymap, 'search.close', ['M'], scopeOf, 'mac')).toHaveLength(1)
  })

  it('flags sequence prefixes both ways', () => {
    expect(findConflicts(keymap, 'wall.share', ['G'], scopeOf, 'mac')).toEqual([
      { id: 'tile.sound.1', binding: ['G', '1'], kind: 'prefix' },
    ])
    expect(findConflicts(keymap, 'wall.share', ['M', 'M'], scopeOf, 'mac')).toEqual([
      { id: 'audio.muteAll', binding: ['M'], kind: 'prefix' },
    ])
  })

  it("doesn't treat a sequence's last step as a prefix", () => {
    // `1`, `G 1` and `L 1` coexist: the sequence guard handles the overlap at key time.
    expect(findConflicts(keymap, 'tile.pick.1', ['1'], scopeOf, 'mac')).toEqual([])
  })
})

describe('findAllConflicts', () => {
  it('is empty for a clean keymap', () => {
    expect(findAllConflicts(keymap, scopeOf, 'mac').size).toBe(0)
  })

  it('is empty for the shipped defaults', () => {
    expect(findAllConflicts(DEFAULT_KEYMAP, scopeOf, 'mac').size).toBe(0)
    expect(findAllConflicts(DEFAULT_KEYMAP, scopeOf, 'windows').size).toBe(0)
  })

  it('reports both sides of a clash', () => {
    const clashes = findAllConflicts({ ...keymap, 'wall.share': [['M']] }, scopeOf, 'mac')
    expect([...clashes.keys()].sort()).toEqual(['audio.muteAll', 'wall.share'])
  })
})

describe('scopes', () => {
  const base = { searchOpen: false, editing: false, placing: false, dialogOpen: false }

  it('is just global normally', () => {
    expect([...activeScopes(base)]).toEqual(['global'])
  })

  it('activates only the topmost mode', () => {
    expect([...activeScopes({ ...base, searchOpen: true })]).toEqual(['global', 'search'])
    expect([...activeScopes({ ...base, searchOpen: true, placing: true })]).toEqual(['global', 'placing'])
    expect([...activeScopes({ ...base, searchOpen: true, editing: true })]).toEqual(['global', 'editing'])
  })

  it('turns everything off while a dialog is open', () => {
    expect(activeScopes({ ...base, searchOpen: true, dialogOpen: true }).size).toBe(0)
  })

  it('overlaps global with everything, modes only with themselves', () => {
    expect(scopesOverlap('global', 'search')).toBe(true)
    expect(scopesOverlap('search', 'search')).toBe(true)
    expect(scopesOverlap('search', 'placing')).toBe(false)
  })
})
