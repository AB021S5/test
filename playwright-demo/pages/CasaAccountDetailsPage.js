const fs = require('fs');
const path = require('path');

class CasaAccountDetailsPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;

    this.firstAccountLink = page.locator("//*[@id='j_idt137:CASATable:tbody_element']/tr[1]/td[1]/a").first();
    this.accountDetailsHeading = page.locator("//*[@id='heading']/div").first();
  }

  async clickacct() {
    await this.firstAccountLink.waitFor({ state: 'visible', timeout: 7000 });
    await this.takeScreenshot('00_casa_accounts_list');
    await this.firstAccountLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('01_casa_account_opened');
  }

  async waitForAccountDetails() {
    await this.accountDetailsHeading.waitFor({ state: 'visible', timeout: 7000 });
    await this.accountDetailsHeading.scrollIntoViewIfNeeded().catch(() => {});
    await this.takeScreenshot('02_casa_account_details');
  }

  async takeScreenshot(name) {
    if (process.env.PW_CAPTURE_STEPS === '0') {
      return;
    }

    const suiteName = this.testInfo && this.testInfo.file
      ? path.basename(this.testInfo.file, '.spec.js')
      : 'general';
    const suiteFolder = path.join('screenshots', suiteName);
    fs.mkdirSync(suiteFolder, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(suiteFolder, `${name}_${timestamp}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true });
    if (this.testInfo) {
      await this.testInfo.attach(name, { path: filePath, contentType: 'image/png' });
    }
  }
}

module.exports = { CasaAccountDetailsPage };