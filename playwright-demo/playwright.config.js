const { defineConfig } = require('@playwright/test');
const { testData } = require('./config/testData');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 180_000,
  reporter: [['html', { open: 'never' }], ['line'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: testData.baseUrl,
    headless: testData.headless,
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
});