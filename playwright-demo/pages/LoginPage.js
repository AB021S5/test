const fs = require('fs');
const path = require('path');

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
    this.ataglance = page.locator("(//a[contains(normalize-space(),'At a Glance')] | //span[contains(normalize-space(),'At a Glance')])[1]");
    this.transferAndPayment = page.locator("(//a[contains(normalize-space(),'Transfer & Payment')])[1]");
    this.logoutLink = page.locator("(//a[contains(normalize-space(),'Log out')])[1]");
  }
  
  async openLoginPage() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });

    const outageBanner = this.page.locator("//*[contains(normalize-space(), 'Temporary Out Of Service') or contains(normalize-space(), 'DB00003')]").first();
    const sessionExpiredBanner = this.page.locator("//*[contains(normalize-space(), 'session has been expired')]").first();
    const reloginLink = this.page.locator("//a[normalize-space()='Log In' or normalize-space()='Log in']").first();

    if (await outageBanner.isVisible().catch(() => false)) {
      throw new Error('Bank portal is currently out of service (DB00003). Login page is unavailable for automation.');
    }

    if (await sessionExpiredBanner.isVisible().catch(() => false)) {
      if (await reloginLink.isVisible().catch(() => false)) {
        await reloginLink.click();
        await this.page.waitForLoadState('domcontentloaded');
      }
    }

    try {
      await this.usernameInput.waitFor({ state: 'visible', timeout: 45000 });
    } catch (error) {
      // One retry helps when the login page loads slowly or redirects.
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle').catch(() => {});

      if (await outageBanner.isVisible().catch(() => false)) {
        throw new Error('Bank portal is currently out of service (DB00003). Login page is unavailable for automation.');
      }

      if (await sessionExpiredBanner.isVisible().catch(() => false)) {
        if (await reloginLink.isVisible().catch(() => false)) {
          await reloginLink.click();
          await this.page.waitForLoadState('domcontentloaded');
        }
      }

      await this.usernameInput.waitFor({ state: 'visible', timeout: 45000 });
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

    // Check for service unavailability error message
    const serviceErrorLocator = this.page.locator(
      "//*[contains(text(), 'We are unable to process your request')] | " +
      "//*[contains(text(), 'Alert') and contains(., 'temporarily')] | " +
      "//*[contains(text(), 'Customer Service Centre')][1]"
    ).first();

    try {
      // Race: wait for either OTP input OR service error
      await Promise.race([
        this.otpInput.waitFor({ state: 'visible', timeout: 30000 }),
        serviceErrorLocator.waitFor({ state: 'visible', timeout: 5000 })
          .then(() => {
            throw new Error('SERVICE_UNAVAILABLE');
          })
      ]);
    } catch (error) {
      if (error.message === 'SERVICE_UNAVAILABLE') {
        const errorText = await serviceErrorLocator.innerText().catch(() => 'Service temporarily unavailable');
        throw new Error(`SERVICE_DOWN: ${errorText}`);
      }
      throw error;
    }
    
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
    await this.takeScreenshot('05_after_next_button');
  }

  async waitForAtAGlance() {
    await this.page.waitForLoadState('domcontentloaded');

    const homeLandmarks = [this.ataglance, this.transferAndPayment, this.logoutLink];
    let homeReady = false;

    for (const landmark of homeLandmarks) {
      try {
        await landmark.waitFor({ state: 'visible', timeout: 20000 });
        homeReady = true;
        break;
      } catch (error) {
        // Try next landmark.
      }
    }

    if (!homeReady) {
      throw new Error('Login succeeded but home page landmarks were not visible.');
    }

    await this.takeScreenshot('06_at_a_glance_screen');
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

  async login(username, password) {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLoginButton();
  }
}

module.exports = { LoginPage };