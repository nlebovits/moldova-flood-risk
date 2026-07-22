import { test, expect, type Page, type Locator } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Guards the cross-engine return-period bug: changing the return period must
 * redraw the flood raster on every browser engine. On WebKit the map used to
 * keep the previous depth tiles (stale tile cache keyed by tile index, not by
 * GeoTIFF), so the map looked frozen while the numbers changed.
 *
 * Strategy: the flood overlay shares MapLibre's WebGL canvas, so we compare
 * element screenshots (engine-independent, always composited) rather than
 * reading GL pixels. A same-RP re-shot gives the antialiasing/label noise
 * floor; the RP10-vs-RP500 shot must move far more pixels than that floor.
 */

const ONBOARDING_KEY = 'md-flood-onboarding-v1';

/** Count the pixels that differ between two element screenshots. */
function diffPixels(a: Buffer, b: Buffer): { diff: number; total: number } {
  const imgA = PNG.sync.read(a);
  const imgB = PNG.sync.read(b);
  const { width, height } = imgA;
  // Engines can size the canvas a device-pixel off; bail loudly if so.
  if (imgB.width !== width || imgB.height !== height) {
    throw new Error(
      `screenshot size drift: ${width}x${height} vs ${imgB.width}x${imgB.height}`,
    );
  }
  const diff = pixelmatch(imgA.data, imgB.data, undefined, width, height, {
    threshold: 0.1,
  });
  return { diff, total: width * height };
}

/**
 * Screenshot the map canvas once it stops changing, so we compare settled
 * frames rather than mid-tile-fetch ones. Polls until two consecutive shots
 * match within a tight noise band, or gives up after the budget.
 */
async function settledShot(page: Page, canvas: Locator): Promise<Buffer> {
  let prev = await canvas.screenshot();
  const deadline = Date.now() + 30_000;
  // Date.now is fine in test code (runs in Node, not the resumable workflow VM).
  while (Date.now() < deadline) {
    await page.waitForTimeout(1_500);
    const next = await canvas.screenshot();
    const { diff, total } = diffPixels(prev, next);
    prev = next;
    if (diff / total < 0.002) return next; // < 0.2% moving → settled
  }
  return prev;
}

async function rpButton(page: Page, rp: number): Promise<Locator> {
  return page.getByRole('button', { name: `RP${rp}`, exact: true });
}

test('flood raster redraws when the return period changes', async ({ page }) => {
  // Skip the first-run tutorial so it never covers the RP selector.
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, 'dismissed');
  }, ONBOARDING_KEY);

  await page.goto('/');

  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();

  // Start at the sparsest return period, let it settle.
  await (await rpButton(page, 10)).click();
  const shotA = await settledShot(page, canvas);

  // Same RP, no interaction — the rendering noise floor (labels, AA, tiles).
  const shotAControl = await settledShot(page, canvas);
  const noise = diffPixels(shotA, shotAControl);

  // Jump to the densest return period. Far more land floods, so the raster
  // must change across a large share of the canvas.
  await (await rpButton(page, 500)).click();
  const shotB = await settledShot(page, canvas);
  const signal = diffPixels(shotA, shotB);

  const noiseRatio = noise.diff / noise.total;
  const signalRatio = signal.diff / signal.total;

  // The RP switch must move far more than the idle noise floor. On the bug it
  // moved roughly nothing (tiles stayed put), so this fails on the regression.
  expect(signalRatio).toBeGreaterThan(0.02);
  expect(signalRatio).toBeGreaterThan(noiseRatio * 5);
});
