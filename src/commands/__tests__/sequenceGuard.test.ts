import type { SequenceRegistrationView } from '@tanstack/react-hotkeys'
import { describe, expect, it } from 'vitest'
import { continuesSequence } from '../sequenceGuard'

const key = (k: string) => ({ key: k, code: '', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, isComposing: false }) as KeyboardEvent

const view = (sequence: string[], matchedStepCount: number, lastKeyTime: number, enabled = true) =>
  ({
    id: 'x',
    sequence,
    options: { enabled, timeout: 1000, platform: 'mac' },
    target: {},
    triggerCount: 0,
    hasFired: false,
    matchedStepCount,
    partialMatchLastKeyTime: lastKeyTime,
  }) as SequenceRegistrationView

describe('continuesSequence', () => {
  it('claims the next step of an in-progress sequence', () => {
    expect(continuesSequence([view(['G', '1'], 1, 1000)], key('1'), 1500)).toBe(true)
  })

  it('claims the digit in L 2, so it switches layout instead of picking tile 2', () => {
    const views = [view(['L', '1'], 1, 1000), view(['L', '2'], 1, 1000), view(['G', '2'], 0, 0)]
    expect(continuesSequence(views, key('2'), 1200)).toBe(true)
  })

  it('leaves a plain digit alone when no sequence is under way', () => {
    expect(continuesSequence([view(['L', '2'], 0, 0), view(['G', '2'], 0, 0)], key('2'), 1200)).toBe(false)
  })

  it('ignores other keys', () => {
    expect(continuesSequence([view(['G', '1'], 1, 1000)], key('2'), 1500)).toBe(false)
  })

  it('ignores idle, timed-out and disabled sequences', () => {
    expect(continuesSequence([view(['G', '1'], 0, 0)], key('1'), 1500)).toBe(false)
    expect(continuesSequence([view(['G', '1'], 1, 1000)], key('1'), 2500)).toBe(false)
    expect(continuesSequence([view(['G', '1'], 1, 1000, false)], key('1'), 1500)).toBe(false)
  })
})
