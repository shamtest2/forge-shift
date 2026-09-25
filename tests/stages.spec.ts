import { test, expect, type Page } from '@playwright/test';

// Authored geometry, not a teleport or internal game call: drive each route using
// the same keyboard movement and E interaction a player uses in Chromium/WebGL.
const specs = [
  { index: 1, nodes: 2, hazards: [0], timed: false, elevation: false },
  { index: 2, nodes: 2, hazards: [0, 1], timed: true, elevation: false },
  { index: 3, nodes: 3, hazards: [1], timed: true, elevation: true },
  { index: 4, nodes: 3, hazards: [0, 1, 2], timed: true, elevation: true },
  { index: 5, nodes: 3, hazards: [0, 1, 2], timed: true, elevation: true },
];

async function state(page: Page) {
  return page.evaluate(() => window.__forgeDebug!());
}

async function forward(page: Page, limit: number): Promise<void> {
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(z => {
      const s = window.__forgeDebug?.();
      return !!s && (s.player[2] < z || s.phase === 'results');
    }, limit, { timeout: 45_000 });
  } finally {
    await page.keyboard.up('w');
  }
  const s = await state(page);
  expect(s.phase, `premature failure en route to Z ${limit}; location ${s.player}`).toBe('gameplay');
  expect(s.player[2]).toBeLessThan(limit + .7);
}

async function strafe(page: Page, key: 'a' | 'd', x: number): Promise<void> {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(({ x, key }) => {
      const s = window.__forgeDebug?.();
      return !!s && ((key === 'a' ? s.player[0] < x : s.player[0] > x) || s.phase === 'results');
    }, { x, key }, { timeout: 20_000 });
  } finally {
    await page.keyboard.up(key);
  }
  const s = await state(page);
  expect(s.phase, `strafe ${key} unexpectedly failed`).toBe('gameplay');
  expect(s.grounded).toBe(true);
}

for (const stage of specs) {
  test(`sector ${stage.index + 1}: physical shifts, hazards, extraction and reward`, async ({ page }) => {
    test.setTimeout(200_000);
    await page.setViewportSize({ width: 1000, height: 650 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', r => { if (r.url().startsWith('http://127.0.0.1:4173')) errors.push(`${r.url()} ${r.failure()?.errorText}`); });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('forge-shift:progress:v1', JSON.stringify({
      version: 1, unlocked: 5, cores: 30, completions: 6, best: {}, skin: 'ice', muted: false,
    })));
    await page.reload();
    await page.waitForFunction(() => (window.__forgeDebug?.().frame ?? 0) > 3);
    await page.waitForTimeout(3200);
    await page.getByRole('button', { name: 'Pause game' }).click();
    await page.locator(`[data-action="stage"][data-value="${stage.index}"]`).click();
    expect((await state(page)).stage).toBe(stage.index);

    for (let i = 0; i < stage.nodes; i++) {
      const nodeZ = -9 - 28 * i;
      await forward(page, nodeZ + .6);
      await expect(page.locator('#prompt')).toBeVisible();
      await page.keyboard.press('e');
      await page.waitForFunction(i => (window.__forgeDebug?.().bridges[i] ?? 0) > .94, i, { timeout: 18_000 });
      if (i === 0 && stage.index === 3) await page.screenshot({ path: 'test-results/vertical-bridge-deployed.png' });
      const far = -24 - 28 * i;
      await forward(page, far - 1.4);
      const crossed = await state(page);
      expect(crossed.grounded, `bridge ${i + 1} lacked a walkable surface`).toBe(true);
      if (stage.elevation && i === 0) expect(crossed.player[1]).toBeGreaterThan(.75);
      if (stage.hazards.includes(i)) {
        // The amber moving gate covers the central lanes, but not the marked
        // maintenance shoulder. Leave the bridge, skirt the sweep, rejoin route.
        await strafe(page, 'a', -2.85);
        await forward(page, far - 7.7);
        await strafe(page, 'd', -1.2);
      }
    }

    const finishZ = -24 - (stage.nodes - 1) * 28 - 11;
    await page.keyboard.down('w');
    try {
      await page.waitForFunction(() => window.__forgeDebug?.().phase === 'results', null, { timeout: 45_000 });
    } finally {
      await page.keyboard.up('w');
    }
    const result = await state(page);
    expect(result.player[2]).toBeLessThan(finishZ + 1);
    expect(result.score).toBeGreaterThan(500);
    await expect(page.getByRole('dialog', { name: 'RUN COMPLETE' })).toBeVisible();
    await expect(page.locator('.result-breakdown')).toContainText(`${stage.nodes} SHIFTS`);
    expect(result.cores).toBeGreaterThan(30);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/sector-${stage.index + 1}-result.png` });
    console.log(`SECTOR ${stage.index + 1} CLEARED: ${result.time.toFixed(2)}s ${result.score} points, x=${result.player[0].toFixed(1)} y=${result.player[1].toFixed(1)}`);
  });
}
