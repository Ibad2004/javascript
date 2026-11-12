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
