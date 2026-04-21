const fs = require('fs');
const path = require('path');

class OwnFundTransferPage {
  constructor(page, testInfo = null) {
    this.page = page;
    this.testInfo = testInfo;
    this.selectedFromAccountValue = null;
    this.selectedFromAccountText = '';

    this.transferAndPaymentMenu = page.locator("//*[@id='top_menu']/li[2]/a | //a[normalize-space()='Transfer & Payment']").first();
    this.fundTransferMenu = page.locator("//*[@id='menu']//a[normalize-space()='Fund Transfer'] | //a[normalize-space()='Fund Transfer']").first();
    this.transferNowLink = page.locator("(//a[normalize-space()='TRANSFER NOW'])[1] | (//td[normalize-space()='TRANSFER NOW']//a)[1]").first();

    // Keep selectors tied to transfer form content while allowing minor wording/id variations.
    this.fromAccountSelect = page.locator("(//td[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'from account')]/following::select[1] | //label[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'from account')]/following::select[1] | //select[contains(translate(@id,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'from')])[1]");
    this.toAccountSelect = page.locator("(//td[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'payee or account')]/following::select[1] | //td[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'to account')]/following::select[1] | //select[contains(translate(@id,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'to')])[1]");

    // Flow buttons and inputs with text-based fallbacks.
    this.firstNextButton = page.locator("(//a[normalize-space()='Next' or .//span[normalize-space()='Next']] | //button[normalize-space()='Next'])[1]").first();
    this.amountInput = page.locator("//*[@id='form:j_idt98']").first();
    this.paymentDescriptionInput = page.locator("(//label[contains(., 'Payment Description')]/following::input[1] | //*[@id='form:j_idt169'] | //input[contains(translate(@name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'description')])[1]").first();
    this.secondNextButton = page.locator("(//*[@id='form']/div[5]/div/table/tbody/tr/td/div[1]/a | //a[normalize-space()='Next'] | //button[normalize-space()='Next'])[1]").first();
    this.confirmButton = page.locator("(//*[@id='form:j_idt106'] | //a[normalize-space()='Confirm'] | //button[normalize-space()='Confirm'])[1]").first();
    this.submittedMessage = page.locator("(//*[@id='pageintro_640']/div | //*[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'submitted') or contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'successful')])[1]").first();
  }

  async openFundTransferForm() {
    if (await this.fromAccountSelect.isVisible().catch(() => false)) {
      return;
    }

    await this.transferAndPaymentMenu.waitFor({ state: 'visible', timeout: 7000 });
    await this.transferAndPaymentMenu.click({ noWaitAfter: true });
    await this.page.waitForLoadState('domcontentloaded');

    if (await this.fromAccountSelect.isVisible().catch(() => false)) {
      return;
    }

    if (await this.fundTransferMenu.isVisible().catch(() => false)) {
      await this.fundTransferMenu.click();
      await this.page.waitForLoadState('domcontentloaded');
    }

    if (!(await this.fromAccountSelect.isVisible().catch(() => false)) && (await this.transferNowLink.isVisible().catch(() => false))) {
      await this.transferNowLink.click();
      await this.page.waitForLoadState('domcontentloaded');
    }

    await this.fromAccountSelect.waitFor({ state: 'visible', timeout: 7000 });
  }

  async getSelectedOptionText(selectLocator) {
    return await selectLocator.evaluate((select) => {
      const option = select.options[select.selectedIndex];
      return option ? (option.textContent || '').trim() : '';
    });
  }

  async getSelectedOptionValue(selectLocator) {
    return await selectLocator.evaluate((select) => {
      const option = select.options[select.selectedIndex];
      return option ? (option.value || '').trim() : '';
    });
  }

  hasPositiveBalance(accountText) {
    // Extract balance from account text. Patterns: "ACC - 1234.56" (positive), "ACC - (-1234.56)" or "ACC (-1234.56)" (negative)
    const text = String(accountText || '').trim();
    
    // Pattern 1: "... - (negative)" or "... (-negative)"
    const negativeMatch = text.match(/[-\s]\([-\d.,]+\)|[-\s]-\d+[.,]\d+/);
    if (negativeMatch) {
      return false;
    }
    
    // If we see a negative indicator anywhere, it's negative
    if (/[-\s]\([-]|[-\s]-[\d]/.test(text)) {
      return false;
    }
    
    // Otherwise assume positive (has some amount)
    return true;
  }

  async getAccountOptions(selectLocator, wantedType, excludeTexts = [], isFromAccount = false, excludeValues = []) {
    return await selectLocator.evaluate(
      (select, type, excluded, checkBalance, excludedValues) => {
        const hasPositiveBalance = (accountText) => {
          const text = String(accountText || '').trim();
          // Pattern: "... - (negative)" or "... (-negative)" or "... - -number"
          const negativeMatch = text.match(/[-\s]\([-\d.,]+\)|[-\s]-\d+[.,]\d+/);
          if (negativeMatch) {
            return false;
          }
          if (/[-\s]\([-]|[-\s]-[\d]/.test(text)) {
            return false;
          }
          return true;
        };

        const options = Array.from(select.options || []);
        const isLocal = (text) => /\bscr\b|local/i.test(text);
        const excludedSet = new Set((excluded || []).map((item) => item.trim()));
        const excludedValueSet = new Set((excludedValues || []).map((item) => String(item || '').trim()));
        const matchesType = (text) => {
          if (type === 'local') {
            return isLocal(text);
          }

          return !isLocal(text);
        };
        const mapped = [];

        for (const option of options) {
          const text = (option.textContent || '').trim();
          const value = option.value;

          if (!text || /please\s*select/i.test(text)) {
            continue;
          }

          if (!value) {
            continue;
          }

          if (excludedValueSet.has(String(value).trim())) {
            continue;
          }

          if (excludedSet.has(text)) {
            continue;
          }

          // For FROM accounts, filter to only positive balance accounts
          if (checkBalance && !hasPositiveBalance(text)) {
            continue;
          }

          if (matchesType(text)) {
            mapped.push({ value, text });
          }
        }

        if (mapped.length > 0) {
          return mapped;
        }

        for (const option of options) {
          const text = (option.textContent || '').trim();
          const value = option.value;

          if (!text || !value || /please\s*select/i.test(text)) {
            continue;
          }

          if (excludedValueSet.has(String(value).trim())) {
            continue;
          }

          if (excludedSet.has(text)) {
            continue;
          }

          // Even in fallback, filter FROM accounts for positive balance
          if (checkBalance && !hasPositiveBalance(text)) {
            continue;
          }

          mapped.push({ value, text });
        }

        return mapped;
      },
      wantedType,
      excludeTexts,
      isFromAccount,
      excludeValues
    );
  }

  getAccountType(type) {
    return String(type).toLowerCase() === 'local' ? 'local' : 'foreign';
  }

  async selectFromAccountOption(option, wantedType) {
    await this.fromAccountSelect.waitFor({ state: 'visible', timeout: 7000 });
    await this.fromAccountSelect.selectOption(option.value);
    this.selectedFromAccountValue = option.value;
    this.selectedFromAccountText = await this.getSelectedOptionText(this.fromAccountSelect);
    await this.takeScreenshot(`01_from_account_${wantedType}_selected`);
  }

  async selectToAccountOption(option, wantedType) {
    await this.toAccountSelect.waitFor({ state: 'visible', timeout: 7000 });
    await this.toAccountSelect.selectOption(option.value);

    const selectedToValue = await this.getSelectedOptionValue(this.toAccountSelect);
    if (
      selectedToValue &&
      this.selectedFromAccountValue &&
      String(selectedToValue).trim() === String(this.selectedFromAccountValue).trim()
    ) {
      throw new Error('From and To account resolved to the same account after selection.');
    }

    await this.takeScreenshot(`02_to_account_${wantedType}_selected`);
  }

  async clickFirstNext() {
    await this.firstNextButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.firstNextButton.click();
    await this.amountInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async enterPaymentDetails(amount, description) {
    await this.amountInput.waitFor({ state: 'visible', timeout: 7000 });
    await this.amountInput.fill(String(amount));

    // Wait for payment description field with reduced timeout
    await this.paymentDescriptionInput.waitFor({ state: 'visible', timeout: 7000 });
    await this.paymentDescriptionInput.fill(description);

    await this.takeScreenshot('04_payment_details_entered');
  }

  async clickSecondNext() {
    await this.secondNextButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.secondNextButton.click();
    await this.confirmButton.waitFor({ state: 'visible', timeout: 7000 });
  }

  async confirmTransfer() {
    await this.confirmButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.confirmButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForSubmittedMessage() {
    await this.submittedMessage.waitFor({ state: 'visible', timeout: 7000 });
    await this.takeScreenshot('04_transfer_submitted_message');
  }

  async performTransfer({ fromAccountType, toAccountType, amount, description }) {
    await this.openFundTransferForm();

    const fromType = this.getAccountType(fromAccountType);
    const toType = this.getAccountType(toAccountType);
    const fromOptions = await this.getAccountOptions(this.fromAccountSelect, fromType, [], true);

    if (!fromOptions.length) {
      throw new Error(`No ${fromType} from-account options with positive balance were found.`);
    }

    let lastError = null;

    for (const fromOption of fromOptions) {
      await this.selectFromAccountOption(fromOption, fromType);
      const toOptions = await this.getAccountOptions(
        this.toAccountSelect,
        toType,
        [this.selectedFromAccountText],
        false,
        [this.selectedFromAccountValue]
      );

      for (const toOption of toOptions) {
        try {
          await this.selectToAccountOption(toOption, toType);
          await this.clickFirstNext();
          await this.enterPaymentDetails(amount, description);
          await this.clickSecondNext();
          await this.confirmTransfer();
          await this.waitForSubmittedMessage();
          return;
        } catch (error) {
          lastError = error;

          // If we reached the confirmation step, propagate as a real failure.
          const isConfirmationError =
            await this.confirmButton.isVisible().catch(() => false) ||
            await this.submittedMessage.isVisible().catch(() => false);

          if (isConfirmationError) {
            throw error;
          }

          // If the form is no longer visible we have partially navigated away.
          // Go back to the fund transfer form before trying the next account pair.
          const stillOnForm = await this.fromAccountSelect.isVisible().catch(() => false);
          if (!stillOnForm) {
            try {
              await this.openFundTransferForm();
            } catch {
              // If navigation back also fails, surface the original error.
              throw error;
            }
            break; // restart with next fromOption after re-opening the form
          }

          // Still on form - try next to-account combination.
          continue;
        }
      }
    }

    throw lastError || new Error('No valid from/to account combination completed the fund transfer.');
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

module.exports = { OwnFundTransferPage };
