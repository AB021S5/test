const fs = require('fs');
const path = require('path');

class OtpManagementPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;

    this.customerServiceMenu = page.locator("//*[@id='top_menu']/li[3]");
    this.otpManagementMenu = page.locator("//*[@id='menu']/li[4]/a");
    this.radioOptionOne = page.locator("//*[@id='form:j_idt104:0']");
    this.radioOptionTwo = page.locator("//*[@id='form:j_idt96:0']");
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
    await this.customerServiceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.customerServiceMenu.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('01_customer_service_opened');
  }

  async openOtpManagement() {
    await this.otpManagementMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.otpManagementMenu.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('02_otp_management_opened');
  }

  async selectUnselectedRadioButton() {
    await this.radioOptionOne.waitFor({ state: 'visible', timeout: 15000 });
    await this.radioOptionTwo.waitFor({ state: 'visible', timeout: 15000 });

    if (await this.radioOptionOne.isChecked()) {
      await this.radioOptionTwo.click();
    } else {
      await this.radioOptionOne.click();
    }

    await this.takeScreenshot('03_unselected_radio_selected');
  }

  async clickNextButton() {
    await this.nextButton.first().waitFor({ state: 'visible', timeout: 15000 });
    await this.nextButton.first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('04_after_continue_button');
  }

  async enterOtpAndSubmit(otp) {
    await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.otpInput.fill(otp);
    await this.takeScreenshot('05_otp_entered_for_otp_management');

    await this.submitButton.first().waitFor({ state: 'visible', timeout: 15000 });
    await this.submitButton.first().click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('06_after_submit_click');
  }

  async waitForSuccessScreen() {
    await this.successMessage.waitFor({ state: 'visible', timeout: 15000 });
    await this.takeScreenshot('07_otp_management_success_screen');
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