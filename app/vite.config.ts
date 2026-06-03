import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Moldova Ag Flood-Risk Map — Vite config.
// Static SPA. No SSR. Targets Vercel static deploy (see vercel.json).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    cors: true,
    fs: {
      // Permit imports from one dir above app/ so we can read the
      // repo-root `i18n/{ro,en}.json` directly without copying.
      allow: ['..'],
    },
  },
  build: {
    // Source maps help inspect MapLibre paint expressions in prod debugging.
    sourcemap: true,
    // Keep CSS in a single bundle so the @font-face / Hydro ramp / radius
    // overrides are guaranteed to load before any component CSS.
    cssCodeSplit: false,
  },
  // MapLibre + pmtiles produce some heavy chunks; bump the warning ceiling
  // so legitimate map bundles don't spam the build log.
  // (deck.gl is the usual culprit if we add it later — ~600 KB raw.)
});
