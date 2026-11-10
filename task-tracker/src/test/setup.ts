import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Without Vitest globals, Testing Library cannot clean up by itself,
// so unmount whatever each test rendered.
afterEach(() => {
  cleanup();
});
