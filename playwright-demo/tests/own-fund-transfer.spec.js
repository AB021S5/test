const { test, expect } = require('./fixtures');
const { OwnFundTransferPage } = require('../pages/OwnFundTransferPage');
const { testData } = require('../config/testData');

test('SC UAT own fund transfer - local to local', async ({ loggedInPage: page }, testInfo) => {
  const transferPage = new OwnFundTransferPage(page, testInfo, {
    screenshotScenario: 'local-to-local',
  });
  await transferPage.performTransfer(testData.ownFundTransfer.localToLocal);
  await expect(transferPage.submittedMessage).toBeVisible({ timeout: 45000 });
});

test('SC UAT own fund transfer - EUR to USD', async ({ loggedInPage: page }, testInfo) => {
  const transferPage = new OwnFundTransferPage(page, testInfo, {
    screenshotScenario: 'eur-to-usd',
  });
  await transferPage.performTransfer(testData.ownFundTransfer.eurToUsd);
  await expect(transferPage.submittedMessage).toBeVisible({ timeout: 45000 });
});

