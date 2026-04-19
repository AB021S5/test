const { test, expect } = require('./fixtures');
const { CasaAccountDetailsPage } = require('../pages/CasaAccountDetailsPage');
const fs = require('fs');
const path = require('path');

const SUITE_NAME = 'casa-account-details';
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

test('SC UAT CASA account details test', async ({ loggedInPage: page }, testInfo) => {
  const casaAccountDetailsPage = new CasaAccountDetailsPage(page, testInfo);

  await snap(page, testInfo, 'casa_01_home_page');

  await casaAccountDetailsPage.clickacct();
  await snap(page, testInfo, 'casa_02_account_selected');

  await casaAccountDetailsPage.waitForAccountDetails();
  await expect(casaAccountDetailsPage.accountDetailsHeading).toBeVisible();
  await snap(page, testInfo, 'casa_03_account_details');
});
