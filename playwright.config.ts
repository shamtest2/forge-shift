import { defineConfig, devices } from '@playwright/test';
import chromium, { inflate } from '@sparticuz/chromium';

// The npm-distributed browser works even when Playwright's CDN and apt are blocked.
await inflate('node_modules/@sparticuz/chromium/bin/al2023.tar.br');
const executablePath = await chromium.executablePath();

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath, args: [...chromium.args, '--enable-webgl'], env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' } },
  },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 90_000 },
});
