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
    // JRC has no CORS. Mirror the Vercel rewrites (see vercel.json) for
    // local dev — same URL paths resolve to the same upstream so code
    // never has to know which environment it's in.
    proxy: {
      '/jrc': {
        target: 'https://jeodpp.jrc.ec.europa.eu',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/jrc/,
            '/ftp/jrc-opendata/CEMS-GLOFAS/flood_hazard',
          ),
      },
    },
  },
  build: {
    // Source maps help inspect MapLibre paint expressions in prod debugging.
    sourcemap: true,
    // Keep CSS in a single bundle so the @font-face / Hydro ramp / radius
    // overrides are guaranteed to load before any component CSS.
    cssCodeSplit: false,
  },
  worker: {
    // @developmentseed/geotiff spawns workers that import dependencies
    // (lzw-tiff-decoder) with top-level await. The default 'iife' format
    // doesn't allow that; ES modules do.
    format: 'es',
  },
  // MapLibre + pmtiles produce some heavy chunks; bump the warning ceiling
  // so legitimate map bundles don't spam the build log.
  // (deck.gl is the usual culprit if we add it later — ~600 KB raw.)
});
