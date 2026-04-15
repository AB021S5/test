const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { LoginPage } = require('../pages/LoginPage');
const { OtpManagementPage } = require('../pages/OtpManagementPage');
const { testData } = require('../config/testData');

test.setTimeout(120000);

async function ensureScreenshotsFolder() {
  const screenshotsFolder = 'screenshots';
  if (!fs.existsSync(screenshotsFolder)) {
    fs.mkdirSync(screenshotsFolder, { recursive: true });
  }
}

test('SC UAT OTP management test', async ({ page }, testInfo) => {
  await ensureScreenshotsFolder();

  const loginPage = new LoginPage(page, testInfo);
  const otpManagementPage = new OtpManagementPage(page, testInfo);

  // Step 1: Sign in.
  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();
  await loginPage.login(testData.username, testData.password);
  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await loginPage.waitForAtAGlance();

  // Step 2: Open OTP Management from Customer Service menu.
  await otpManagementPage.openCustomerService();
  await otpManagementPage.openOtpManagement();

  // Step 3: Toggle OTP setting.
  await otpManagementPage.selectUnselectedRadioButton();

  // Step 4: Continue and confirm with OTP.
  await otpManagementPage.clickNextButton();
  await otpManagementPage.enterOtpAndSubmit(testData.otp);

  // Step 5: Verify success message.
  await otpManagementPage.waitForSuccessScreen();
  await expect(otpManagementPage.successMessage).toBeVisible();
});