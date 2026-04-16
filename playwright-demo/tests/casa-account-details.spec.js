const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const { CasaAccountDetailsPage } = require('../pages/CasaAccountDetailsPage');
const { testData } = require('../config/testData');

const RUN_FOLDER = `screenshots/run_${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}`;

function ensureRunFolder() {
  if (!fs.existsSync(RUN_FOLDER)) fs.mkdirSync(RUN_FOLDER, { recursive: true });
}

async function snap(page, testInfo, name) {
  ensureRunFolder();
  const filePath = path.join(RUN_FOLDER, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
}

test('SC UAT CASA account details test', async ({ page }, testInfo) => {
  test.setTimeout(180000);

  const loginPage = new LoginPage(page, testInfo);
  const casaAccountDetailsPage = new CasaAccountDetailsPage(page, testInfo);

  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();
  await snap(page, testInfo, 'casa_01_login_page');

  await loginPage.login(testData.username, testData.password);
  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await loginPage.waitForAtAGlance();
  await snap(page, testInfo, 'casa_02_home_page');

  await casaAccountDetailsPage.clickacct();
  await snap(page, testInfo, 'casa_03_account_selected');

  await casaAccountDetailsPage.waitForAccountDetails();
  await expect(casaAccountDetailsPage.accountDetailsHeading).toBeVisible();
  await snap(page, testInfo, 'casa_04_account_details');
});