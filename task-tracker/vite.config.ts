import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Vitest returns CSS files as empty text unless they match here. The style test reads
    // them with ?raw to check the colour tokens, so CSS must come through as it is.
    css: { include: [/\.css(?:$|\?)/] },
  },
});
