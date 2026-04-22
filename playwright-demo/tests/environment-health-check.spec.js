const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { testData } = require('../config/testData');
const fs = require('fs');
const path = require('path');

/**
 * Environment Health Check
 * Pass = login completes.
 * Fail = any login step fails.
 */
test('SC UAT environment health check', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page, testInfo, {
    captureLoginSteps: true,
    capturePostLoginLanding: true,
  });
  const suiteFolder = path.join('screenshots', 'environment-health-check');
  
  try {
    await loginPage.openLoginPage();
    await expect(loginPage.usernameInput).toBeVisible();
    await loginPage.login(testData.username, testData.password);
    await loginPage.enterOtp(testData.otp);
    await loginPage.clickNextButton();
    await loginPage.waitForAtAGlance();

    fs.mkdirSync(suiteFolder, { recursive: true });
    await page.screenshot({ path: path.join(suiteFolder, 'environment_health_ok.png'), fullPage: true });
    await testInfo.attach('health-check-pass', { body: 'Login successful', contentType: 'text/plain' });
  } catch (error) {
    fs.mkdirSync(suiteFolder, { recursive: true });
    const serviceDownShot = path.join(suiteFolder, 'service_unavailable.png');
    await page.screenshot({ path: serviceDownShot, fullPage: true }).catch(() => {});
    const errorContext = `Health check failed: ${error.message}`;
    await testInfo.attach('error-context', { body: errorContext, contentType: 'text/plain' });
    throw error;
  }
});
