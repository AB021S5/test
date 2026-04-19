const { test, expect } = require('./fixtures');
const { OtpManagementPage } = require('../pages/OtpManagementPage');
const { testData } = require('../config/testData');
const fs = require('fs');
const path = require('path');

const SUITE_NAME = 'otp-management';
const SUITE_FOLDER = path.join('screenshots', SUITE_NAME);

function ensureRunFolder() {
  if (!fs.existsSync(SUITE_FOLDER)) fs.mkdirSync(SUITE_FOLDER, { recursive: true });
}

async function snap(page, testInfo, name) {
  if (process.env.PW_CAPTURE_STEPS !== '1') {
    return;
  }

  ensureRunFolder();
  const filePath = path.join(SUITE_FOLDER, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
}

test('SC UAT OTP management test', async ({ loggedInPage: page }, testInfo) => {
  const otpManagementPage = new OtpManagementPage(page, testInfo);

  await snap(page, testInfo, 'otp_01_home_page');

  await otpManagementPage.openCustomerService();
  await snap(page, testInfo, 'otp_02_customer_service_menu');

  await otpManagementPage.openOtpManagement();
  await snap(page, testInfo, 'otp_03_otp_management_page');

  await otpManagementPage.selectUnselectedRadioButton();
  await snap(page, testInfo, 'otp_04_radio_selected');

  await otpManagementPage.clickNextButton();
  await otpManagementPage.enterOtpAndSubmit(testData.otp);
  await snap(page, testInfo, 'otp_05_otp_submitted');

  await otpManagementPage.waitForSuccessScreen();
  await expect(otpManagementPage.successMessage).toBeVisible();
  await snap(page, testInfo, 'otp_06_success');
});
