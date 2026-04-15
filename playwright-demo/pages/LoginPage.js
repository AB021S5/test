class LoginPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;
    // XPath: find input/textbox following a cell containing "Username" text
    this.usernameInput = page.locator("//td[contains(., 'Username')]/following::input[1] | //td[contains(., 'Username')]/following::textarea[1]");
    this.passwordInput = page.locator("//td[contains(., 'Password')]/following::input[1] | //td[contains(., 'Password')]/following::textarea[1]");
    this.loginButton = page.locator("//a[contains(., 'Log in')]");
    this.otpInput = page.locator("//td[contains(., 'One Time Password')]/following::input[1] | //td[contains(., 'One Time Password')]/following::textarea[1]");
    this.nextButton = page.locator("//a[contains(., 'Next')]");
    this.ataglance = page.locator("//a[contains(., 'At a Glance')]");
  }
  
  async openLoginPage() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });

    try {
      await this.usernameInput.waitFor({ state: 'visible', timeout: 20000 });
    } catch (error) {
      // One retry helps when the login page loads slowly or redirects.
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.usernameInput.waitFor({ state: 'visible', timeout: 20000 });
    }
  }

  async enterUsername(username) {
    await this.usernameInput.fill(username);
    await this.takeScreenshot('01_username_entered');
  }

  async enterPassword(password) {
    await this.passwordInput.fill(password);
    await this.takeScreenshot('02_password_entered');
  }

  async clickLoginButton() {
    await this.loginButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('03_after_login_button');
  }

  async enterOtp(otp) {
    await this.otpInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.otpInput.fill(otp);
    await this.takeScreenshot('04_otp_entered');
  }

  async clickNextButton() {
    await this.nextButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('05_after_next_button');
  }

  async waitForAtAGlance() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    await this.takeScreenshot('06_at_a_glance_screen');
  }

  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `screenshots/${name}_${timestamp}.png`;
    await this.page.screenshot({ path: filePath });
    if (this.testInfo) {
      await this.testInfo.attach(name, { path: filePath, contentType: 'image/png' });
    }
  }

  async login(username, password) {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLoginButton();
  }
}

module.exports = { LoginPage };