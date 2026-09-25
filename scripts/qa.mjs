import { chromium } from 'playwright';
import chrome, { inflate } from '@sparticuz/chromium';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.QA_URL ?? 'http://127.0.0.1:4173/';
const artifacts = resolve('qa-artifacts');
await mkdir(artifacts, { recursive: true });
const library = await inflate(resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const browser = await chromium.launch({
  executablePath: await chrome.executablePath(),
  headless: true,
  args: [...chrome.args, '--enable-webgl'],
  env: { ...process.env, LD_LIBRARY_PATH: `${library}/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}` },
});
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', error => errors.push(`PAGE: ${error.stack}`));
page.on('console', message => { if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`); });
page.on('requestfailed', request => errors.push(`NETWORK: ${request.url()} ${request.failure()?.errorText}`));
page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
const snapshot = () => page.evaluate(() => window.__FORGE_DEBUG__?.());
try {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (response?.status() !== 200) throw new Error(`App response ${response?.status()}`);
  await page.waitForFunction(() => document.querySelector('#game-canvas canvas') && window.__FORGE_DEBUG__?.().renderer.calls > 0, null, { timeout: 30000 });
  // The canvas may exist before GPU initialization or the first frames; let the scene settle.
  await page.waitForTimeout(3500);
  const gl = await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas canvas');
    const context = canvas?.getContext('webgl2');
    return { webgl: !!context, width: canvas?.width, height: canvas?.height };
  });
  console.log('Canvas:', gl, 'initial:', await snapshot());
  if (!gl.webgl || !gl.width || !gl.height) throw new Error('WebGL2 did not render');
  await page.screenshot({ path: resolve(artifacts, 'foundation-initial.png') });
  // Software WebGL used by CI is intentionally tested at a realistic lower-end resolution.
  await page.setViewportSize({ width: 960, height: 600 });
  await page.waitForTimeout(800);
  const movement = {};
  for (const [key, axis, direction, partner] of [
    ['w', 'z', 1, 'ArrowUp'], ['s', 'z', -1, 'ArrowDown'], ['a', 'x', -1, 'ArrowLeft'], ['d', 'x', 1, 'ArrowRight'],
    ['ArrowUp', 'z', 1, 'w'], ['ArrowDown', 'z', -1, 's'], ['ArrowLeft', 'x', -1, 'a'], ['ArrowRight', 'x', 1, 'd'],
  ]) {
    await page.keyboard.press('p');
    await page.waitForFunction(() => window.__FORGE_DEBUG__?.().state === 'paused');
    await page.keyboard.press('r');
    await page.waitForFunction(() => window.__FORGE_DEBUG__?.().state === 'gameplay');
    await page.waitForTimeout(250);
    const before = await snapshot();
    await page.keyboard.down(key);
    await page.waitForTimeout(axis === 'x' ? 700 : 1100);
    const held = await snapshot();
    await page.keyboard.up(key);
    await page.waitForTimeout(250);
    const after = await snapshot();
    const moved = after.player[axis] - before.player[axis];
    const followed = after.camera[axis] - before.camera[axis];
    movement[key] = { axis, moved: +moved.toFixed(2), camera: +followed.toFixed(2), axes: held.axes, state: after.state };
    console.log('Pressed', key, movement[key]);
    if (held.axes[axis] !== direction || held.axes[axis === 'x' ? 'z' : 'x'] !== 0) throw new Error(`Wrong action mapping for ${key}`);
    if (moved * direction < 1.3 || followed * direction < 0.5 || after.state !== 'gameplay') throw new Error(`Movement or camera failed for ${key}: ${JSON.stringify(movement[key])}`);
    if (movement[partner] && JSON.stringify(held.axes) !== JSON.stringify(movement[partner].axes)) throw new Error(`Action mismatch ${key} vs ${partner}`);
    if (key === 'w' || key === 'a' || key === 'ArrowRight') await page.screenshot({ path: resolve(artifacts, `foundation-${key}.png`) });
  }
  console.log('Physically pressed keyboard input:', movement);
  console.log('Browser errors:', errors);
  if (errors.length) throw new Error(`${errors.length} browser errors`);
} finally {
  await browser.close();
}
