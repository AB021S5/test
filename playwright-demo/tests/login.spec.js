const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { testData } = require('../config/testData');
const fs = require('fs');

async function ensureScreenshotsFolder() {
  const screenshotsFolder = 'screenshots';
  if (!fs.existsSync(screenshotsFolder)) {
    fs.mkdirSync(screenshotsFolder, { recursive: true });
  }
}

test('SC UAT login page test', async ({ page }, testInfo) => {
  await ensureScreenshotsFolder();

  const loginPage = new LoginPage(page, testInfo);

  // Open login page.
  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const loginPageScreenshot = `screenshots/00_login_page_loaded_${timestamp}.png`;
  await page.screenshot({ path: loginPageScreenshot });
  await testInfo.attach('Login Page Loaded', { path: loginPageScreenshot, contentType: 'image/png' });
  
  // Complete login flow.
  await loginPage.login(testData.username, testData.password);
  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await loginPage.waitForAtAGlance();
});