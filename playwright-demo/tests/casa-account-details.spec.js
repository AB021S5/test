const { test, expect } = require('./fixtures');
const { CasaAccountDetailsPage } = require('../pages/CasaAccountDetailsPage');

test('SC UAT CASA account details test', async ({ loggedInPage: page }, testInfo) => {
  const casaAccountDetailsPage = new CasaAccountDetailsPage(page, testInfo);

  await casaAccountDetailsPage.clickacct();

  await casaAccountDetailsPage.waitForAccountDetails();
  await expect(casaAccountDetailsPage.accountDetailsHeading).toBeVisible();
});
