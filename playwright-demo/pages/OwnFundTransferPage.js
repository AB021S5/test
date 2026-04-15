class OwnFundTransferPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;

    // Open fund transfer from the main top menu.
    this.transferAndPaymentMenu = page.locator("//*[@id='top_menu']/li[2]/a | //a[normalize-space()='Transfer & Payment']");
    this.fundTransferMenu = page.locator("//*[@id='menu']//a[contains(normalize-space(),'Fund Transfer')] | //a[normalize-space()='Fund Transfer']");

    // Account selection
    this.fromAccountEurSelect = page.locator("//*[@id='j_idt83:j_idt90']");
    this.fromAccountLocalOption = page.locator("//*[@id='j_idt83:j_idt90']/option[5]");
    this.toAccountLocalSelect = page.locator("//*[@id='j_idt83:j_idt88']/tbody/tr[2]/td[2]/select");
    this.toAccountUsdOption = page.locator("//*[@id='j_idt83:j_idt88']/tbody/tr[2]/td[2]/select/optgroup[1]/option[3]");

    // Flow buttons and inputs
    this.firstNextButton = page.locator("//*[@id='j_idt83']/div[4]/table/tbody/tr/td/div/a");
    this.amountInput = page.locator("//*[@id='form:j_idt98']");
    this.paymentDescriptionInput = page.locator("//*[@id='form:j_idt169']");
    this.secondNextButton = page.locator("//*[@id='form']/div[5]/div/table/tbody/tr/td/div[1]/a");
    this.confirmButton = page.locator("//*[@id='form:j_idt106']");
    this.submittedMessage = page.locator("//*[@id='pageintro_640']/div");
  }

  async openFundTransferForm() {
    if (await this.fromAccountEurSelect.isVisible()) {
      return;
    }

    await this.transferAndPaymentMenu.first().click();

    await this.fundTransferMenu.first().click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('00_opened_fund_transfer_from_top_menu');

    await this.fromAccountEurSelect.waitFor({ state: 'visible', timeout: 20000 });
  }

  async selectFromAccount(type) {
    if (String(type).toLowerCase() === 'local') {
      const localFromValue = await this.fromAccountLocalOption.getAttribute('value');
      if (!localFromValue) {
        throw new Error('Local from-account option value was not found.');
      }

      await this.fromAccountEurSelect.selectOption(localFromValue);
      await this.takeScreenshot('01_from_account_local_selected');
    } else {
      // EUR uses the provided from-account selector.
      await this.fromAccountEurSelect.click();
      await this.takeScreenshot('01_from_account_eur_selected');
    }
  }

  async selectToAccount(type) {
    if (String(type).toLowerCase() === 'usd') {
      const usdToValue = await this.toAccountUsdOption.getAttribute('value');
      if (!usdToValue) {
        throw new Error('USD to-account option value was not found.');
      }

      await this.toAccountLocalSelect.selectOption(usdToValue);
      await this.takeScreenshot('02_to_account_usd_selected');
    } else {
      // Local uses the first real option from the provided to-account dropdown.
      const localToValue = await this.toAccountLocalSelect.evaluate((select) => {
        for (const option of select.options) {
          const label = (option.textContent || '').toLowerCase();
          if (!label.includes('please select')) {
            return option.value;
          }
        }

        return null;
      });

      if (!localToValue) {
        throw new Error('Local to-account option value was not found.');
      }

      await this.toAccountLocalSelect.selectOption(localToValue);
      await this.takeScreenshot('02_to_account_local_selected');
    }
  }

  async clickFirstNext() {
    await this.firstNextButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('03_after_first_next');
  }

  async enterPaymentDetails(amount, description) {
    await this.amountInput.fill(String(amount));

    await this.paymentDescriptionInput.fill(description);

    await this.takeScreenshot('04_payment_details_entered');
  }

  async clickSecondNext() {
    await this.secondNextButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('05_after_second_next');
  }

  async confirmTransfer() {
    await this.confirmButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.takeScreenshot('06_after_confirm_click');
  }

  async waitForSubmittedMessage() {
    await this.submittedMessage.waitFor({ state: 'visible', timeout: 20000 });
    await this.takeScreenshot('07_transfer_submitted_message');
  }

  async performTransfer({ fromAccountType, toAccountType, amount, description }) {
    await this.openFundTransferForm();
    await this.selectFromAccount(fromAccountType);
    await this.selectToAccount(toAccountType);
    await this.clickFirstNext();
    await this.enterPaymentDetails(amount, description);
    await this.clickSecondNext();
    await this.confirmTransfer();
    await this.waitForSubmittedMessage();
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

module.exports = { OwnFundTransferPage };
