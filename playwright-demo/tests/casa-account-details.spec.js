const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { LoginPage } = require('../pages/LoginPage');
const { CasaAccountDetailsPage } = require('../pages/CasaAccountDetailsPage');
const { testData } = require('../config/testData');

async function ensureScreenshotsFolder() {
  const screenshotsFolder = 'screenshots';
  if (!fs.existsSync(screenshotsFolder)) {
    fs.mkdirSync(screenshotsFolder, { recursive: true });
  }
}

test('SC UAT CASA account details test', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await ensureScreenshotsFolder();

  const loginPage = new LoginPage(page, testInfo);
  const casaAccountDetailsPage = new CasaAccountDetailsPage(page, testInfo);

  // Sign in and open home page.
  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();

  await loginPage.login(testData.username, testData.password);
  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await loginPage.waitForAtAGlance();

  // Open first CASA account and validate details page.
  await casaAccountDetailsPage.clickacct();
  await casaAccountDetailsPage.waitForAccountDetails();

  await expect(casaAccountDetailsPage.accountDetailsHeading).toBeVisible();
});