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
    this.amountInput = page.locator(
      "(//*[@id='form:j_idt98'] | //td[normalize-space(.)='Amount']/following::input[@type='text'][1] | //label[normalize-space(.)='Amount']/following::input[1] | //td[contains(normalize-space(.),'Amount')]/following::input[@type='text'][1])[1]"
    ).first();
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

    await this.fromAccountSelect.waitFor({ state: 'visible', timeout: 15000 });
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

  async getAllOptions(selectLocator) {
    return await selectLocator.evaluate((select) =>
      Array.from(select.options || []).map((option) => ({
        value: String(option.value || '').trim(),
        text: String(option.textContent || '').replace(/\s+/g, ' ').trim(),
      }))
    );
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
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const acctNum = (s) => {
      const match = norm(s).match(/^(\S+)/);
      return match ? match[1] : norm(s);
    };
    const isLocal = (text) => /\bscr\b|local/i.test(text);
    const excludedNorm = new Set((excludeTexts || []).map(norm));
    const excludedAcct = new Set((excludeTexts || []).map(acctNum));
    const excludedValueSet = new Set((excludeValues || []).map((item) => String(item || '').trim()));
    const matchesType = (text) => {
      if (wantedType === 'local') {
        return isLocal(text);
      }

      return !isLocal(text);
    };

    const options = await this.getAllOptions(selectLocator);
    const filteredByType = options.filter((option) => {
      if (!option.text || !option.value || /please\s*select/i.test(option.text)) {
        return false;
      }

      if (excludedValueSet.has(String(option.value).trim())) {
        return false;
      }

      if (excludedNorm.has(norm(option.text)) || excludedAcct.has(acctNum(option.text))) {
        return false;
      }

      if (isFromAccount && !this.hasPositiveBalance(option.text)) {
        return false;
      }

      return matchesType(option.text);
    });

    if (filteredByType.length > 0) {
      return filteredByType;
    }

    return options.filter((option) => {
      if (!option.text || !option.value || /please\s*select/i.test(option.text)) {
        return false;
      }

      if (excludedValueSet.has(String(option.value).trim())) {
        return false;
      }

      if (excludedNorm.has(norm(option.text)) || excludedAcct.has(acctNum(option.text))) {
        return false;
      }

      if (isFromAccount && !this.hasPositiveBalance(option.text)) {
        return false;
      }

      return true;
    });
  }

  getAccountType(type) {
    return String(type).toLowerCase() === 'local' ? 'local' : 'foreign';
  }

  async selectFromAccountOption(option, wantedType) {
    await this.fromAccountSelect.waitFor({ state: 'visible', timeout: 7000 });
    await this.fromAccountSelect.selectOption(option.value);
    // Wait for JSF AJAX to complete (networkidle lets partial updates finish).
    await this.page.waitForLoadState('networkidle').catch(() => {});
    // Use original option value; re-reading from DOM after AJAX can shift values.
    this.selectedFromAccountValue = option.value;
    this.selectedFromAccountText = await this.getSelectedOptionText(this.fromAccountSelect);
    await this.takeScreenshot(`01_from_account_${wantedType}_selected`);
  }

  async selectToAccountOption(option, wantedType) {
    await this.toAccountSelect.waitFor({ state: 'visible', timeout: 7000 });
    await this.toAccountSelect.selectOption(option.value);

    // Guard: compare by both value and normalized account number to catch same-account across differing IDs.
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const acctNum = (s) => { const m = norm(s).match(/^(\S+)/); return m ? m[1] : norm(s); };
    const selectedToText = await this.getSelectedOptionText(this.toAccountSelect);
    const selectedToValue = await this.getSelectedOptionValue(this.toAccountSelect);
    const sameByValue = selectedToValue && this.selectedFromAccountValue &&
      String(selectedToValue).trim() === String(this.selectedFromAccountValue).trim();
    const sameByAcct = acctNum(selectedToText) && acctNum(this.selectedFromAccountText) &&
      acctNum(selectedToText) === acctNum(this.selectedFromAccountText);
    if (sameByValue || sameByAcct) {
      throw new Error('From and To account resolved to the same account after selection.');
    }

    await this.takeScreenshot(`02_to_account_${wantedType}_selected`);
  }

  async clickFirstNext() {
    await this.firstNextButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.firstNextButton.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // Detect same-account validation error immediately.
    const alertMsg = this.page.locator("//*[contains(normalize-space(.),'From') and contains(normalize-space(.),'To') and contains(normalize-space(.),'same')]").first();
    if (await alertMsg.isVisible().catch(() => false)) {
      throw new Error('SAME_ACCOUNT_ERROR: From and To account are the same after Next click.');
    }
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
