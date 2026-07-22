# End-to-end tests

Cross-engine Playwright tests. They run on Chromium and WebKit, because the
flood raster is a deck.gl WebGL overlay and its bugs are engine-specific — a
return-period switch that redrew on Chrome once stayed frozen on WebKit (Safari,
most Macs).

## Run

```bash
# One-time: fetch the browser engines
pnpm exec playwright install --with-deps chromium webkit

# All engines
pnpm test:e2e

# One engine, or the UI runner
pnpm exec playwright test --project=webkit
pnpm test:e2e:ui
```

The config starts the Vite dev server on port 5173 and reuses one already
running. Tests stream real tiles from Source Cooperative, so they need network.

## What `rp-change.spec.ts` checks

Switching the return period must redraw the flood raster on every engine. The
test loads the map at RP10, screenshots the canvas, jumps to RP500, and asserts
the canvas moved far more pixels than the idle rendering noise. On the stale-tile
regression the canvas barely changed, so the assertion fails.
