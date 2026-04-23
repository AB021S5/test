const { test, expect } = require('./fixtures');
const { OwnFundTransferPage } = require('../pages/OwnFundTransferPage');
const { testData } = require('../config/testData');
const fs = require('fs');
const path = require('path');

async function runTransfer(page, testInfo, scenario, transferData) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const transferPage = new OwnFundTransferPage(page, testInfo, {
      screenshotScenario: scenario,
    });

    try {
      await transferPage.performTransfer(transferData);
      await expect(transferPage.submittedMessage).toBeVisible({ timeout: 45000 });
      return;
    } catch (error) {
      lastError = error;
      const message = String(error && error.message ? error.message : '');
      const isRetryable =
        message.includes('SERVICE_504') ||
        message.includes('SERVICE_CONFIRM_STUCK');

      if (isRetryable && attempt < maxAttempts) {
        // Attempt recovery then retry once for transient backend issues.
        await page.goto('https://www.absa.sc/air/feature/accountSummary', {
          waitUntil: 'domcontentloaded',
        }).catch(() => {});
        await page.waitForTimeout(1500);
        continue;
      }

      if (isRetryable) {
        const suiteFolder = path.join('screenshots', `own-fund-transfer-${scenario}`);
        fs.mkdirSync(suiteFolder, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = path.join(suiteFolder, `08_retry_exhausted_failure_${timestamp}.png`);

        await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
        await testInfo.attach('retry-exhausted-final-state', {
          path: filePath,
          contentType: 'image/png',
        }).catch(() => {});

        throw new Error(
          `TRANSFER_RETRY_FAILED: ${message} (attempt ${attempt}/${maxAttempts} after one retry)`
        );
      }

      throw error;
    }
  }

  throw lastError;
}

test('SC UAT own fund transfer - local to local', async ({ loggedInPage: page }, testInfo) => {
  await runTransfer(page, testInfo, 'local-to-local', testData.ownFundTransfer.localToLocal);
});

test('SC UAT own fund transfer - EUR to USD', async ({ loggedInPage: page }, testInfo) => {
  await runTransfer(page, testInfo, 'eur-to-usd', testData.ownFundTransfer.eurToUsd);
});

