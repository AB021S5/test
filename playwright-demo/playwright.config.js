const { defineConfig } = require('@playwright/test');
const { testData } = require('./config/testData');

const reporters = [['line']];
// JSON reporter is always enabled so the email step always has test stats.
reporters.push(['json', { outputFile: 'test-results/results.json' }]);
if (process.env.PW_HTML_REPORT === '1') {
  reporters.push(['html', { open: 'never' }]);
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 30000,
  },
  reporter: reporters,
  use: {
    baseURL: testData.baseUrl,
    headless: testData.headless,
    screenshot: 'only-on-failure',
    trace: process.env.PW_TRACE_MODE || 'off',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
});