import { DEFAULT_SEQUENCE_TIMEOUT, getSequenceManager, matchesKeyboardEvent, type SequenceRegistrationView } from '@tanstack/react-hotkeys'
import { useEffect } from 'react'

/**
 * Whether this key is the next step of a sequence that's already in progress (e.g. the `1` in
 * `G 1`). Hotkeys and sequences are matched independently, so without this check the `1` would
 * also switch to layout 1.
 */
export function continuesSequence(
  views: Iterable<SequenceRegistrationView>,
  event: KeyboardEvent,
  now: number = Date.now(),
): boolean {
  for (const view of views) {
    if (view.options.enabled === false || view.matchedStepCount === 0) continue
    if (now - view.partialMatchLastKeyTime > (view.options.timeout ?? DEFAULT_SEQUENCE_TIMEOUT)) continue
    if (matchesKeyboardEvent(event, view.sequence[view.matchedStepCount], view.options.platform)) return true
  }
  return false
}

const sequenceSteps = new WeakSet<KeyboardEvent>()

export function isSequenceStep(event: KeyboardEvent): boolean {
  return sequenceSteps.has(event)
}

/** Marks sequence-continuing keys in the capture phase, before either manager sees them. */
export function useSequenceGuard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (continuesSequence(getSequenceManager().registrations.state.values(), e)) sequenceSteps.add(e)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}
