const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const { OtpManagementPage } = require('../pages/OtpManagementPage');
const { testData } = require('../config/testData');

test.setTimeout(120000);

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

test('SC UAT OTP management test', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page, testInfo);
  const otpManagementPage = new OtpManagementPage(page, testInfo);

  await loginPage.openLoginPage();
  await expect(loginPage.usernameInput).toBeVisible();
  await snap(page, testInfo, 'otp_01_login_page');

  await loginPage.login(testData.username, testData.password);
  await loginPage.enterOtp(testData.otp);
  await loginPage.clickNextButton();
  await loginPage.waitForAtAGlance();
  await snap(page, testInfo, 'otp_02_home_page');

  await otpManagementPage.openCustomerService();
  await snap(page, testInfo, 'otp_03_customer_service_menu');

  await otpManagementPage.openOtpManagement();
  await snap(page, testInfo, 'otp_04_otp_management_page');

  await otpManagementPage.selectUnselectedRadioButton();
  await snap(page, testInfo, 'otp_05_radio_selected');

  await otpManagementPage.clickNextButton();
  await otpManagementPage.enterOtpAndSubmit(testData.otp);
  await snap(page, testInfo, 'otp_06_otp_submitted');

  await otpManagementPage.waitForSuccessScreen();
  await expect(otpManagementPage.successMessage).toBeVisible();
  await snap(page, testInfo, 'otp_07_success');
});