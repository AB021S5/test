const fs = require('fs');
const path = require('path');

class CasaAccountDetailsPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;

    // Prefer stable text/class selectors; keep JSF id selector as fast path.
    this.firstAccountLink = page.locator("//*[@id='j_idt137:CASATable:tbody_element']/tr[1]/td[1]/a | (//table[contains(@id,'CASATable')]//tr[1]//a)[1] | (//a[contains(@id,'CASATable')])[1]").first();
    this.accountDetailsHeading = page.locator("//a[normalize-space()='Account Details'] | //span[normalize-space()='Account Details'] | //*[contains(@class,'tab') and normalize-space()='Account Details'] | //*[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'account details')]").first();
  }

  async clickacct() {
    await this.firstAccountLink.waitFor({ state: 'visible', timeout: 7000 });
    await this.firstAccountLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('01_casa_account_opened');
  }

  async waitForAccountDetails() {
    await this.accountDetailsHeading.waitFor({ state: 'visible', timeout: 7000 });
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
    await this.page.screenshot({ path: filePath });

    if (this.testInfo) {
      await this.testInfo.attach(name, { path: filePath, contentType: 'image/png' });
    }
  }
}

module.exports = { CasaAccountDetailsPage };