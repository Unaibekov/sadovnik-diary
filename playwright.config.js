const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: process.env.PWTEST_OUTPUT_DIR || './playwright-artifacts',
  timeout: 120000,
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['line'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
    }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run phone:web',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
