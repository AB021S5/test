const fs = require('fs');
const path = require('path');

class LoginPage {
  constructor(page, testInfo = null, options = {}) {
    this.page = page;
    this.testInfo = testInfo;
    this.captureLoginSteps = Boolean(options.captureLoginSteps);
    this.capturePostLoginLanding = options.capturePostLoginLanding !== false;
    // XPath: find input/textbox following a cell containing "Username" text
    this.usernameInput = page.locator("//td[contains(., 'Username')]/following::input[1] | //td[contains(., 'Username')]/following::textarea[1]");
    this.passwordInput = page.locator("//td[contains(., 'Password')]/following::input[1] | //td[contains(., 'Password')]/following::textarea[1]");
    this.loginButton = page.locator("//a[contains(., 'Log in')]");
    this.otpInput = page.locator("//td[contains(., 'One Time Password')]/following::input[1] | //td[contains(., 'One Time Password')]/following::textarea[1]");
    this.nextButton = page.locator("//a[contains(., 'Next')]");
    this.ataglance = page.locator("(//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'at a glance')] | //span[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'at a glance')])[1]");
    this.transferAndPayment = page.locator("(//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'transfer') and contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'payment')])[1]");
    this.logoutLink = page.locator("(//a[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'log out') or contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'logout')])[1]");
    this.topMenu = page.locator("//*[@id='top_menu']").first();
  }
  
  async openLoginPage() {
    await this.page.goto('/air', { waitUntil: 'domcontentloaded' });

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
      await this.usernameInput.waitFor({ state: 'visible', timeout: 7000 });
    } catch (error) {
      // One retry helps when the login page loads slowly or redirects.
      await this.page.goto('/air', { waitUntil: 'domcontentloaded' });
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

      await this.usernameInput.waitFor({ state: 'visible', timeout: 7000 });
    }

    if (this.captureLoginSteps) {
      await this.takeScreenshot('00_login_page_visible');
    }
  }

  async enterUsername(username) {
    await this.usernameInput.fill(username);

    if (this.captureLoginSteps) {
      await this.takeScreenshot('01_username_entered');
    }
  }

  async enterPassword(password) {
    await this.passwordInput.fill(password);

    if (this.captureLoginSteps) {
      await this.takeScreenshot('02_password_entered');
    }
  }

  async clickLoginButton() {
    await this.loginButton.click({ noWaitAfter: true });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});

    // Check for service unavailability error message
    const serviceErrorLocator = this.page.locator(
      "//*[contains(text(), 'We are unable to process your request')] | " +
      "//*[contains(text(), 'Alert') and contains(., 'temporarily')] | " +
      "//*[contains(text(), 'Customer Service Centre')][1]"
    ).first();

    try {
      // Race: wait for either OTP input OR service error
      await Promise.race([
        this.otpInput.waitFor({ state: 'visible', timeout: 20000 }),
        serviceErrorLocator.waitFor({ state: 'visible', timeout: 20000 })
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
    
  }

  async enterOtp(otp) {
    await this.otpInput.waitFor({ state: 'visible', timeout: 7000 });
    await this.otpInput.fill(otp);

    if (this.captureLoginSteps) {
      await this.takeScreenshot('03_otp_entered');
    }
  }

  async clickNextButton() {
    await this.nextButton.click({ timeout: 7000, noWaitAfter: true });

    if (this.captureLoginSteps) {
      await this.takeScreenshot('04_next_clicked');
    }
  }

  async waitForAtAGlance() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});

    const homeLandmarks = [this.ataglance, this.transferAndPayment, this.logoutLink, this.topMenu];
    let homeReady = false;

    for (const landmark of homeLandmarks) {
      try {
        await landmark.waitFor({ state: 'visible', timeout: 7000 });
        homeReady = true;
        break;
      } catch (error) {
        // Try next landmark.
      }
    }

    if (!homeReady) {
      const url = this.page.url();
      const stillOnLoginFlow = /loginprocess|execution=/i.test(url);
      const loginFieldsVisible =
        (await this.usernameInput.isVisible().catch(() => false)) ||
        (await this.otpInput.isVisible().catch(() => false));

      if (!stillOnLoginFlow && !loginFieldsVisible) {
        homeReady = true;
      }
    }

    if (!homeReady) {
      // Check if the page is showing a 504 error before throwing a generic error
      const has504 = await this.page.evaluate(() =>
        document.body && document.body.innerText.includes('504 Gateway Time-out')
      ).catch(() => false);
      if (has504) {
        throw new Error('SERVICE_504: Server returned 504 Gateway Time-out during login/home page load.');
      }
      throw new Error('Login succeeded but home page landmarks were not visible.');
    }

    if (this.captureLoginSteps || this.capturePostLoginLanding) {
      await this.takeScreenshot('05_at_a_glance_home');
    }

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