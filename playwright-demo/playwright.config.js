const { defineConfig } = require('@playwright/test');
const { testData } = require('./config/testData');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: testData.baseUrl,
    headless: testData.headless,
    trace: 'off',
  },
});