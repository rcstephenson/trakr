import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
    // Unit tests never use cloud sync (no addon, no network), even if .env.local sets a URL.
    env: { VITE_DEXIE_CLOUD_URL: '' },
  },
});
