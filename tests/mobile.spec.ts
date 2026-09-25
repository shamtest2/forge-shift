import { test, expect } from '@playwright/test';

test('landscape touch D-pad and Shift complete the route; portrait remains usable', async ({ browser }) => {
  test.setTimeout(150_000);
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => { if (r.url().startsWith('http://127.0.0.1:4173')) errors.push(r.url()); });

  async function holdForward(untilZ: number): Promise<void> {
    const rect = await page.locator('[data-control="forward"]').boundingBox();
    expect(rect).not.toBeNull();
    const x = rect!.x + rect!.width / 2;
    const y = rect!.y + rect!.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
    try {
      await page.waitForFunction(z => {
        const game = window.__forgeDebug?.();
        return !!game && (game.player[2] < z || game.phase === 'results');
      }, untilZ, { timeout: 50_000 });
    } finally {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  }

  try {
    await page.goto('/');
    await page.waitForFunction(() => (window.__forgeDebug?.().frame ?? 0) > 2);
    await page.waitForTimeout(3400);
    await expect(page.locator('#viewport canvas')).toBeVisible();
    await expect(page.locator('.touch-controls')).toBeVisible();
    await expect(page.locator('[data-control="forward"]')).toBeVisible();
    await expect(page.locator('[data-control="interact"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile-landscape-start.png' });
    await holdForward(-8.5);
    expect((await page.evaluate(() => window.__forgeDebug!())).phase).toBe('gameplay');
    await expect(page.locator('#prompt')).toBeVisible();
    await page.locator('[data-control="interact"]').tap();
    await page.waitForFunction(() => (window.__forgeDebug?.().bridges[0] ?? 0) > .95, null, { timeout: 20_000 });
    await page.screenshot({ path: 'test-results/mobile-landscape-shift.png' });
    await holdForward(-35.2);
    await page.waitForFunction(() => window.__forgeDebug?.().phase === 'results', null, { timeout: 12_000 });
    await expect(page.getByRole('dialog', { name: 'RUN COMPLETE' })).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile-landscape-result.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /RUN AGAIN/ }).click();
    await expect(page.locator('.orientation-note')).toBeVisible();
    await expect(page.locator('.touch-controls')).toBeVisible();
    await page.screenshot({ path: 'test-results/mobile-portrait-start.png' });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
