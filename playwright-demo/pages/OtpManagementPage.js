const fs = require('fs');
const path = require('path');

class OtpManagementPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;

    this.customerServiceMenu = page.locator("//*[@id='top_menu']/li[3] | //a[contains(normalize-space(),'Customer Service')]").first();
    this.otpManagementMenu = page.locator("//*[@id='menu']/li[4]/a | //a[contains(normalize-space(),'OTP') or contains(normalize-space(),'OTP Management')]").first();
    this.radioOptionOne = page.locator("(//*[@id='form:j_idt104:0'] | //input[@type='radio'])[1]").first();
    this.radioOptionTwo = page.locator("(//*[@id='form:j_idt96:0'] | //input[@type='radio'])[2]").first();
    this.nextButton = page.locator("//a[contains(., 'Continue')] | //button[contains(., 'Continue')] | //input[@type='submit' and @value='Continue']");
    this.otpInput = page.locator("(//input[contains(@id,'otp') or contains(@name,'otp') or @type='password'] | //td[contains(., 'One Time Password')]/following::input[1])[1]");
    this.submitButton = this.nextButton;
    // Scope to leaf-level elements so we do not prematurely match a broad container
    // such as <body> or <html> which also "contains" the word 'success'.
    this.successMessage = page.locator(
      "(//div | //p | //span | //td | //li)[" +
      "contains(normalize-space(text()), 'success') or contains(normalize-space(text()), 'Success') " +
      "or contains(normalize-space(text()), 'successful') or contains(normalize-space(text()), 'completed')" +
      "]"
    ).first();
  }

  async openCustomerService() {
    await this.customerServiceMenu.waitFor({ state: 'visible', timeout: 7000 });
    await this.customerServiceMenu.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openOtpManagement() {
    await this.otpManagementMenu.waitFor({ state: 'visible', timeout: 7000 });
    await this.otpManagementMenu.click();

    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectUnselectedRadioButton() {
    await this.radioOptionOne.waitFor({ state: 'visible', timeout: 7000 });

    if (await this.radioOptionOne.isChecked()) {
      if (await this.radioOptionTwo.isVisible().catch(() => false)) {
        await this.radioOptionTwo.click();
      }
    } else {
      await this.radioOptionOne.click();
    }

    await this.takeScreenshot('03_otp_radio_selected');
  }

  async clickNextButton() {
    await this.nextButton.first().waitFor({ state: 'visible', timeout: 7000 });
    await this.nextButton.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async enterOtpAndSubmit(otp) {
    await this.otpInput.waitFor({ state: 'visible', timeout: 7000 });
    await this.otpInput.fill(otp);

    await this.submitButton.first().waitFor({ state: 'visible', timeout: 7000 });
    await this.submitButton.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForSuccessScreen() {
    await this.successMessage.waitFor({ state: 'visible', timeout: 7000 });
    await this.takeScreenshot('04_otp_management_success');
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

module.exports = { OtpManagementPage };