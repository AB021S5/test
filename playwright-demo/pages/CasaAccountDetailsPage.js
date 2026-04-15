class CasaAccountDetailsPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;

    // Update these XPath locators to match the real CASA screen in your app.
    this.firstAccountLink = page.locator("//*[@id='j_idt137:CASATable:tbody_element']/tr[1]/td[1]/a");
    this.accountDetailsHeading = page.locator("//a[normalize-space()='Account Details'] | //span[normalize-space()='Account Details'] | //*[contains(@class,'tab') and normalize-space()='Account Details']");
  }

  async clickacct() {
    await this.firstAccountLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.firstAccountLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('01_casa_account_opened');
  }

  async waitForAccountDetails() {
    await this.accountDetailsHeading.waitFor({ state: 'visible', timeout: 10000 });
    await this.takeScreenshot('02_casa_account_details');
  }

  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `screenshots/${name}_${timestamp}.png`;
    await this.page.screenshot({ path: filePath });

    if (this.testInfo) {
      await this.testInfo.attach(name, { path: filePath, contentType: 'image/png' });
    }
  }
}

module.exports = { CasaAccountDetailsPage };