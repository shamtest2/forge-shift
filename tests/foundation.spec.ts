import { test, expect } from '@playwright/test';

const controls: Array<[string, number, number]> = [
  ['w', 0, -1], ['s', 0, 1], ['a', -1, 0], ['d', 1, 0],
  ['ArrowUp', 0, -1], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0],
];

interface Snapshot {
  frame: number;
  player: [number, number, number];
  camera: [number, number, number];
  grounded: boolean;
  calls: number;
  webgl: boolean;
}

test('real WebGL scene, eight physical keyboard inputs and following camera', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith('http://127.0.0.1:4173')) errors.push(request.url()); });

  await page.goto('/');
  await page.waitForFunction(() => window.__forgeDebug?.().frame && window.__forgeDebug().frame > 2);
  await page.waitForTimeout(3200); // Observe initialized WebGL, not just the HTML shell.
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const initial = await page.evaluate(() => window.__forgeDebug!() as Snapshot);
  expect(initial.webgl).toBe(true);
  expect(initial.calls).toBeGreaterThan(0);
  expect(initial.grounded).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/m0-initial.png' });

  for (const [key, dx, dz] of controls) {
    const before = await page.evaluate(() => window.__forgeDebug!() as Snapshot);
    // Hold the physical key until the *rendering page* has simulated a step.
    // Fixed 280ms sleeps can elapse entirely inside one software-WebGL frame.
    await page.keyboard.down(key);
    await page.waitForFunction(({ axis, origin, sign }) => {
      const state = window.__forgeDebug?.();
      return !!state && sign * (state.player[axis]! - origin) > 0.95;
    }, { axis: dx ? 0 : 2, origin: dx ? before.player[0] : before.player[2], sign: dx || dz }, { timeout: 25_000 });
    await page.keyboard.up(key);
    await page.waitForTimeout(220);
    const after = await page.evaluate(() => window.__forgeDebug!() as Snapshot);
    const deltaX = after.player[0] - before.player[0];
    const deltaZ = after.player[2] - before.player[2];
    if (dx !== 0) expect(deltaX * dx, `${key}: horizontal player movement`).toBeGreaterThan(0.65);
    if (dz !== 0) expect(deltaZ * dz, `${key}: forward/back player movement`).toBeGreaterThan(0.65);
    // The camera is damped. Check sustained displacement on the first key of
    // each axis; on immediate reversals its smooth return can net to ~zero.
    if (key === 'a') expect(before.camera[0] - after.camera[0], 'camera follows lateral travel').toBeGreaterThan(0.14);
    if (key === 'w') expect(before.camera[2] - after.camera[2], 'camera follows forward travel').toBeGreaterThan(0.25);
    expect(after.grounded, `${key}: normal movement does not leave platform`).toBe(true);
    expect(after.webgl).toBe(true);
    console.log(key, JSON.stringify({ deltaX: +deltaX.toFixed(2), deltaZ: +deltaZ.toFixed(2), camera: after.camera.map(n => +n.toFixed(2)) }));
    if (key === 'w' || key === 'ArrowLeft') await page.screenshot({ path: `test-results/m0-${key}.png` });
  }
  expect(errors).toEqual([]);
});
