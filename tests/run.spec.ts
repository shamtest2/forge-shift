import { test, expect } from '@playwright/test';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window.__forgeDebug?.().frame ?? 0) > 3);
  await page.waitForTimeout(3300);
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => window.__forgeDebug!().webgl)).toBe(true);
}

async function walkToFirstNode(page: import('@playwright/test').Page): Promise<void> {
  await page.keyboard.down('w');
  await page.waitForFunction(() => (window.__forgeDebug?.().player[2] ?? 3) < -7.4, null, { timeout: 30_000 });
  await page.keyboard.up('w');
  await page.waitForTimeout(220);
}

test('Shift actually deploys missing bridge; complete, fail, retry, pause and persist', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().startsWith('http://127.0.0.1:4173')) errors.push(request.url()); });
  await ready(page);
  await walkToFirstNode(page);
  console.log('node position', await page.evaluate(() => window.__forgeDebug!().player));
  await expect(page.locator('#prompt')).toBeVisible();
  await page.screenshot({ path: 'test-results/m2-before-shift.png' });
  await page.keyboard.press('e');
  await page.waitForFunction(() => (window.__forgeDebug?.().bridges[0] ?? 0) > .96, null, { timeout: 20_000 });
  expect(await page.evaluate(() => window.__forgeDebug!().score)).toBeGreaterThanOrEqual(100);
  await page.screenshot({ path: 'test-results/m2-after-shift.png' });

  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__forgeDebug?.().phase === 'results', null, { timeout: 30_000 });
  await page.keyboard.up('w');
  const won = await page.evaluate(() => window.__forgeDebug!());
  console.log('finish snapshot', won);
  await expect(page.getByRole('dialog', { name: 'RUN COMPLETE' })).toBeVisible();
  await expect(page.locator('.result-stats')).toContainText('SCORE');
  await expect(page.locator('.reward')).toContainText('TOTAL');
  expect(won.cores).toBeGreaterThan(0);
  expect(won.score).toBeGreaterThan(500);
  await page.screenshot({ path: 'test-results/m1-result.png' });

  await page.keyboard.press('r');
  await page.waitForFunction(() => window.__forgeDebug?.().phase === 'gameplay' && window.__forgeDebug().player[2] > 2);
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__forgeDebug?.().phase === 'results', null, { timeout: 25_000 });
  await page.keyboard.up('w');
  await expect(page.getByRole('dialog', { name: 'ROUTE LOST' })).toBeVisible();
  await page.screenshot({ path: 'test-results/m1-gap-failure.png' });

  await page.keyboard.press('r');
  await page.waitForFunction(() => window.__forgeDebug?.().phase === 'gameplay');
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__forgeDebug?.().phase === 'paused');
  const frozenTime = await page.evaluate(() => window.__forgeDebug!().time);
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__forgeDebug!().time)).toBe(frozenTime);
  await page.getByRole('button', { name: /RESUME RUN/ }).click();
  await page.waitForFunction(() => window.__forgeDebug?.().phase === 'gameplay');

  await page.reload();
  await page.waitForFunction(() => (window.__forgeDebug?.().frame ?? 0) > 2);
  await page.waitForTimeout(3200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('forge-shift:progress:v1') ?? '{}'));
  expect(saved.unlocked).toBeGreaterThanOrEqual(1);
  expect(saved.best['0'].score).toBeGreaterThan(500);
  expect(saved.cores).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
