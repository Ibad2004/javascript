import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Without Vitest globals, Testing Library cannot clean up by itself,
// so unmount whatever each test rendered.
afterEach(() => {
  cleanup();
  // Removes the fetch spy (fake server) so no test sees another test's network.
  vi.restoreAllMocks();
});

/**
 * jsdom has no HTMLDialogElement.showModal() / close(). This small stand-in only sets the
 * `open` attribute and fires "close", like the browser. It does NOT trap focus or make the
 * page inert: those are the browser's job, checked by hand in a real browser.
 */
if (typeof HTMLDialogElement !== 'undefined' && !('showModal' in HTMLDialogElement.prototype)) {
  Object.defineProperties(HTMLDialogElement.prototype, {
    open: {
      configurable: true,
      get(this: HTMLDialogElement) {
        return this.hasAttribute('open');
      },
    },
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        if (!this.hasAttribute('open')) return;
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    },
  });
}
