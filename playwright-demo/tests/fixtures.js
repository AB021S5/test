const { test: base, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { testData } = require('../config/testData');
const fs = require('fs');
const path = require('path');

/**
 * Custom Playwright fixture that logs in once per test before the test body runs.
 * Detects service unavailability errors and skips the test with a descriptive message.
 */
const test = base.extend({
  loggedInPage: async ({ page }, use, testInfo) => {
    const loginPage = new LoginPage(page, testInfo, {
      captureLoginSteps: false,
      capturePostLoginLanding: true,
    });

    try {
      await loginPage.openLoginPage();
      await expect(loginPage.usernameInput).toBeVisible();
      await loginPage.login(testData.username, testData.password);
      await loginPage.enterOtp(testData.otp);
      await loginPage.clickNextButton();
      await loginPage.waitForAtAGlance();

      // Hand the authenticated page to the test
      await use(page);
    } catch (error) {
      // If service is down, skip the test with a descriptive message
      if (error.message && error.message.includes('SERVICE_DOWN')) {
        const suiteName = path.basename(testInfo.file, '.spec.js');
        const suiteFolder = path.join('screenshots', suiteName);
        fs.mkdirSync(suiteFolder, { recursive: true });

        const serviceDownShot = path.join(suiteFolder, 'service_unavailable.png');
        await page.screenshot({ path: serviceDownShot, fullPage: true }).catch(() => {});
        await testInfo.attach('service-unavailable', { path: serviceDownShot, contentType: 'image/png' }).catch(() => {});

        const serviceErrorMsg = error.message.replace('SERVICE_DOWN: ', '');
        const skipMessage = `⚠ SC UAT Environment is DOWN/UNAVAILABLE. ${serviceErrorMsg}`;
        test.skip(true, skipMessage);
      }
      throw error;
    }
  },
});

module.exports = { test, expect };
