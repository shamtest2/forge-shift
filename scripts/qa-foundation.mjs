import { chromium as playwrightChromium } from 'playwright';
import chromium from '@sparticuz/chromium';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { brotliDecompressSync } from 'node:zlib';

// Arena's minimal Debian image lacks Chrome and NSS. The npm-packaged headless Chrome
// plus its NSS libraries gives us real software-WebGL browser QA without an OS download.
if (!existsSync('/tmp/al2023/lib/libnspr4.so')) {
  mkdirSync('/tmp/al2023', { recursive: true });
  const archive = brotliDecompressSync(readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  writeFileSync('/tmp/al2023/qa-libs.tar', archive);
  execFileSync('tar', ['-xf', '/tmp/al2023/qa-libs.tar', '-C', '/tmp/al2023']);
}
process.env.LD_LIBRARY_PATH = `/tmp/al2023/lib:${process.env.LD_LIBRARY_PATH || ''}`;
mkdirSync('test-results', { recursive: true });
const browser = await playwrightChromium.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 680 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(`PAGE: ${e.message}`));
page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`); });
page.on('requestfailed', request => errors.push(`RESOURCE: ${request.url()} ${request.failure()?.errorText}`));
try {
  const response = await page.goto(process.env.FORGE_URL || 'http://localhost:5173/', { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.locator('#app[data-game-ready="true"]').waitFor({ timeout: 20000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'test-results/m0-initial.png' });
  const state = async () => await page.evaluate(() => window.__forgeDebug());
  const first = await state();
  assert.ok(first.frames > 3 && first.drawCalls > 0, `not rendering: ${JSON.stringify(first)}`);
  console.log('WebGL draw calls:', first.drawCalls, 'frames after settle:', first.frames);
  const tests = [
    ['w', 2, -1, 'Forward'], ['s', 2, 1, 'Backward'],
    ['a', 0, -1, 'Left'], ['d', 0, 1, 'Right'],
    ['ArrowUp', 2, -1, 'Forward'], ['ArrowDown', 2, 1, 'Backward'],
    ['ArrowLeft', 0, -1, 'Left'], ['ArrowRight', 0, 1, 'Right'],
  ];
  for (const [key, axis, direction, label] of tests) {
    const before = await state();
    await page.keyboard.down(key);
    await page.waitForTimeout(1400);
    const during = await state();
    await page.keyboard.up(key);
    await page.waitForTimeout(380);
    const after = await state();
    const playerDistance = (during.player[axis] - before.player[axis]) * direction;
    const cameraDistance = (after.camera[axis] - before.camera[axis]) * direction;
    assert.ok(playerDistance > 1.8, `${key} ${label}: player moved ${playerDistance.toFixed(2)} not ${label.toLowerCase()}`);
    assert.ok(cameraDistance > 0.9, `${key} ${label}: camera followed ${cameraDistance.toFixed(2)} not ${label.toLowerCase()}`);
    console.log(`${key.padEnd(10)} ${label.padEnd(9)} player ${playerDistance.toFixed(2)}m camera ${cameraDistance.toFixed(2)}m`);
    if (key === 'w' || key === 'ArrowRight') await page.screenshot({ path: `test-results/m0-${key.toLowerCase()}.png` });
  }
  assert.deepEqual(errors, [], `browser failures:\n${errors.join('\n')}`);
  console.log('M0 PASS: real WebGL render, all eight physical keys, follow camera, no runtime/resource errors.');
} finally {
  await browser.close();
}
