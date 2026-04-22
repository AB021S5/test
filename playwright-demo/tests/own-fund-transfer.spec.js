const { test, expect } = require('./fixtures');
const { OwnFundTransferPage } = require('../pages/OwnFundTransferPage');
const { testData } = require('../config/testData');

async function runTransfer(page, testInfo, scenario, transferData) {
  const transferPage = new OwnFundTransferPage(page, testInfo, {
    screenshotScenario: scenario,
  });
  try {
    await transferPage.performTransfer(transferData);
    await expect(transferPage.submittedMessage).toBeVisible({ timeout: 45000 });
  } catch (error) {
    if (error.message && error.message.includes('SERVICE_504')) {
      test.skip(true, `⚠ Bank server returned 504 Gateway Time-out during fund transfer confirm. ${error.message}`);
    }
    throw error;
  }
}

test('SC UAT own fund transfer - local to local', async ({ loggedInPage: page }, testInfo) => {
  await runTransfer(page, testInfo, 'local-to-local', testData.ownFundTransfer.localToLocal);
});

test('SC UAT own fund transfer - EUR to USD', async ({ loggedInPage: page }, testInfo) => {
  await runTransfer(page, testInfo, 'eur-to-usd', testData.ownFundTransfer.eurToUsd);
});

