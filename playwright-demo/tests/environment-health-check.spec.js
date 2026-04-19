const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { testData } = require('../config/testData');
const fs = require('fs');
const path = require('path');

/**
 * Environment Health Check - Negative Test Case
 * 
 * This test verifies if the SC UAT environment is operational.
 * If a service unavailability error is encountered, this test is skipped with a
 * message indicating that the environment is down, which will appear in email reports.
 */
test('SC UAT environment health check', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page, testInfo);
  const suiteFolder = path.join('screenshots', 'environment-health-check');
  
  try {
    await loginPage.openLoginPage();
    await expect(loginPage.usernameInput).toBeVisible();
    await loginPage.login(testData.username, testData.password);
    
    // clickLoginButton will throw SERVICE_DOWN error if service error is detected
    await loginPage.enterOtp(testData.otp);
    await loginPage.clickNextButton();
    await loginPage.waitForAtAGlance();
    
    // Environment health check PASSED
    fs.mkdirSync(suiteFolder, { recursive: true });
    await page.screenshot({ path: path.join(suiteFolder, 'environment_health_ok.png'), fullPage: true });
    await testInfo.attach('health-check-pass', { body: 'Environment is operational', contentType: 'text/plain' });
  } catch (error) {
    // If service is down, skip the test
    if (error.message && error.message.includes('SERVICE_DOWN')) {
      fs.mkdirSync(suiteFolder, { recursive: true });
      const serviceDownShot = path.join(suiteFolder, 'service_unavailable.png');
      await page.screenshot({ path: serviceDownShot, fullPage: true }).catch(() => {});

      const serviceErrorMsg = error.message.replace('SERVICE_DOWN: ', '');
      const skipMessage = `⚠ SC UAT Environment is DOWN/UNAVAILABLE. ${serviceErrorMsg}`;
      await testInfo.attach('service-error', { body: serviceErrorMsg, contentType: 'text/plain' });
      await testInfo.attach('service-unavailable', { path: serviceDownShot, contentType: 'image/png' }).catch(() => {});
      test.skip(true, skipMessage);
    }
    const errorContext = `Health check failed: ${error.message}`;
    await testInfo.attach('error-context', { body: errorContext, contentType: 'text/plain' });
    throw error;
  }
});
