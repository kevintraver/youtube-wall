import { describe, expect, it } from 'vitest'
import { chordParts, formatBinding, formatChord, simplifyChord } from '../format'

describe('formatChord', () => {
  it('uses symbols on macOS', () => {
    expect(formatChord('Mod+Z', 'mac')).toBe('⌘Z')
    expect(formatChord('Mod+Shift+Z', 'mac')).toBe('⇧⌘Z')
    expect(formatChord('Alt+K', 'mac')).toBe('⌥K')
    expect(formatChord('Delete', 'mac')).toBe('⌦')
    expect(formatChord('Escape', 'mac')).toBe('Esc')
  })

  it('uses words elsewhere', () => {
    expect(formatChord('Mod+Z', 'windows')).toBe('Ctrl+Z')
    expect(formatChord('Mod+Shift+Z', 'linux')).toBe('Ctrl+Shift+Z')
    expect(formatChord('Alt+K', 'windows')).toBe('Alt+K')
    expect(formatChord('Delete', 'windows')).toBe('Del')
    expect(formatChord('Escape', 'windows')).toBe('Esc')
  })

  it('shows bare modifiers', () => {
    expect(chordParts('Shift', 'mac')).toEqual(['⇧'])
    expect(chordParts('Shift', 'windows')).toEqual(['Shift'])
  })
})

describe('formatBinding', () => {
  it('spaces out sequence steps', () => {
    expect(formatBinding(['G', '1'], 'mac')).toBe('G 1')
    expect(formatBinding(['Mod+K', 'Mod+S'], 'mac')).toBe('⌘K ⌘S')
    expect(formatBinding(['Mod+K', 'Mod+S'], 'windows')).toBe('Ctrl+K Ctrl+S')
  })
})

describe('simplifyChord', () => {
  it('drops the Shift implied by a symbol', () => {
    expect(simplifyChord('Shift+?', 'mac')).toBe('?')
    expect(simplifyChord('Mod+Shift+?', 'mac')).toBe('Mod+?')
  })

  it('keeps Shift on letters and named keys', () => {
    expect(simplifyChord('Shift+K', 'mac')).toBe('Shift+K')
    expect(simplifyChord('Shift+Enter', 'mac')).toBe('Shift+Enter')
  })
})
