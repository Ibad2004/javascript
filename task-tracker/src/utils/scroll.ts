/** Matches the CSS breakpoint: below 48rem the detail panel sits under the list. */
export const NARROW_SCREEN_QUERY = '(max-width: 47.99rem)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * On narrow screens the detail panel is below the list, so after a tap
 * the user would not see it. Scroll it into view, smoothly only when the
 * user has not asked for reduced motion. Does nothing on wide screens.
 */
export function scrollIntoViewOnNarrowScreen(element: HTMLElement | null): void {
  // jsdom (tests) and very old browsers have no matchMedia.
  if (element === null || typeof window.matchMedia !== 'function') return;
  if (!window.matchMedia(NARROW_SCREEN_QUERY).matches) return;

  const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}
