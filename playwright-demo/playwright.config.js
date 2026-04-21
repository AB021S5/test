const { defineConfig } = require('@playwright/test');
const path = require('path');
const { testData } = require('./config/testData');

const reporters = [['line']];
// JSON reporter is always enabled so the email step always has test stats.
reporters.push(['json', { outputFile: path.join(__dirname, 'test-results', 'results.json') }]);
if (process.env.PW_HTML_REPORT === '1') {
  reporters.push(['html', { open: 'never' }]);
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: {
    timeout: 7000,
  },
  reporter: reporters,
  use: {
    baseURL: testData.baseUrl,
    headless: testData.headless,
    screenshot: 'only-on-failure',
    trace: process.env.PW_TRACE_MODE || 'off',
    actionTimeout: 7000,
    navigationTimeout: 20000,
  },
});