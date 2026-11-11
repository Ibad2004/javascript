import { vi } from 'vitest';

/**
 * Turns on Vitest's fake timers in a way that works with Testing Library.
 *
 * Testing Library waits for a setTimeout(0) after every user-event action, and it only
 * moves fake timers forward when it finds a global `jest` object. Vitest has no `jest`
 * global, so without this shim that setTimeout never fires and every test hangs
 * until it times out after 5 seconds.
 */
export function useFakeTimersWithTestingLibrary() {
  vi.useFakeTimers();
  vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
}

export function restoreRealTimers() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

/** For userEvent.setup({ advanceTimers }): user-event's own small delays use the fake clock. */
export const advanceTimers = (ms: number) => vi.advanceTimersByTime(ms);
