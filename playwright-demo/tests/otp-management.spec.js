const { test, expect } = require('./fixtures');
const { OtpManagementPage } = require('../pages/OtpManagementPage');
const { testData } = require('../config/testData');

test('SC UAT OTP management test', async ({ loggedInPage: page }, testInfo) => {
  const otpManagementPage = new OtpManagementPage(page, testInfo);

  await otpManagementPage.openCustomerService();

  await otpManagementPage.openOtpManagement();

  await otpManagementPage.selectUnselectedRadioButton();

  await otpManagementPage.clickNextButton();
  await otpManagementPage.enterOtpAndSubmit(testData.otp);

  await otpManagementPage.waitForSuccessScreen();
  await expect(otpManagementPage.successMessage).toBeVisible();
});
