import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'browser.spec.ts', fullyParallel: false, workers: 1,
  timeout: 45000, use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:4321', headless: true, launchOptions: { executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }, trace: 'retain-on-failure' },
});
