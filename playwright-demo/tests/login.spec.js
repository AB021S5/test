const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { testData } = require('../config/testData');
const fs = require('fs');
const path = require('path');

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

test('SC UAT login page test', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page, testInfo);

  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();
  await snap(page, testInfo, '01_login_page_loaded');

  await loginPage.login(testData.username, testData.password);
  await snap(page, testInfo, '02_after_username_password');

  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await snap(page, testInfo, '03_after_otp');

  await loginPage.waitForAtAGlance();
  await snap(page, testInfo, '04_at_a_glance_home');
});