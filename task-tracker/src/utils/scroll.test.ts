import { afterEach, describe, expect, it, vi } from 'vitest';
import { NARROW_SCREEN_QUERY, scrollIntoViewOnNarrowScreen } from './scroll';

/** jsdom has no matchMedia, so tests provide a fake one. */
function fakeMatchMedia(matchingQueries: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: matchingQueries.includes(query) }));
}

function makeElement() {
  const element = document.createElement('div');
  const scrollIntoView = vi.fn();
  element.scrollIntoView = scrollIntoView;
  return { element, scrollIntoView };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scrollIntoViewOnNarrowScreen', () => {
  it('scrolls smoothly on a narrow screen', () => {
    fakeMatchMedia([NARROW_SCREEN_QUERY]);
    const { element, scrollIntoView } = makeElement();
    scrollIntoViewOnNarrowScreen(element);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('jumps without animation when the user prefers reduced motion', () => {
    fakeMatchMedia([NARROW_SCREEN_QUERY, '(prefers-reduced-motion: reduce)']);
    const { element, scrollIntoView } = makeElement();
    scrollIntoViewOnNarrowScreen(element);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('does nothing on a wide screen', () => {
    fakeMatchMedia([]);
    const { element, scrollIntoView } = makeElement();
    scrollIntoViewOnNarrowScreen(element);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
