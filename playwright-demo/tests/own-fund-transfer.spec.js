const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { LoginPage } = require('../pages/LoginPage');
const { OwnFundTransferPage } = require('../pages/OwnFundTransferPage');
const { testData } = require('../config/testData');

test.setTimeout(180000);

async function ensureScreenshotsFolder() {
  const screenshotsFolder = 'screenshots';
  if (!fs.existsSync(screenshotsFolder)) {
    fs.mkdirSync(screenshotsFolder, { recursive: true });
  }
}

async function signInAndOpenHome(page, testInfo) {
  const loginPage = new LoginPage(page, testInfo);

  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();
  await loginPage.login(testData.username, testData.password);
  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await loginPage.waitForAtAGlance();
}

test('SC UAT own fund transfer - local to local', async ({ page }, testInfo) => {
  await ensureScreenshotsFolder();
  await signInAndOpenHome(page, testInfo);

  const transferPage = new OwnFundTransferPage(page, testInfo);
  const localTransferData = testData.ownFundTransfer.localToLocal;

  await transferPage.performTransfer(localTransferData);

  await expect(transferPage.submittedMessage).toBeVisible();
});

test('SC UAT own fund transfer - EUR to USD', async ({ page }, testInfo) => {
  await ensureScreenshotsFolder();
  await signInAndOpenHome(page, testInfo);

  const transferPage = new OwnFundTransferPage(page, testInfo);
  const eurToUsdTransferData = testData.ownFundTransfer.eurToUsd;

  await transferPage.performTransfer(eurToUsdTransferData);

  await expect(transferPage.submittedMessage).toBeVisible();
});
