import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The React app shares the site's static files (fonts, /brand assets) from ../public and
// calls the existing Node API. In dev, /api is proxied to scripts/dev-server.js (port 3100).
export default defineConfig({
  plugins: [react()],
  publicDir: '../public',
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:3100' } },
  build: {
    outDir: 'dist',
    // No inline scripts or data-URI modules: the site's CSP is script-src 'self'.
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    sourcemap: true,
    copyPublicDir: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: false,
  },
});
