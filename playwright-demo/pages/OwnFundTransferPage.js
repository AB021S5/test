const fs = require('fs');
const path = require('path');

class OwnFundTransferPage {
  constructor(page, testInfo = null, options = {}) {
    this.page = page;
    this.testInfo = testInfo;
    this.screenshotScenario = String(options.screenshotScenario || '').trim();
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
    // Result page: heading is "Own Account Transfer Result" (h1)
    this.transferResultHeading = page.locator("//h1[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'result')]").first();
    // Transaction reference row value cell — sits after a label cell containing 'reference'
    this.transactionReferenceNumber = page.locator("(//td[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'reference')]/following-sibling::td[1] | //td[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'reference')]/following::td[1])[1]").first();
    // 504 gateway timeout dialog that the bank server sometimes shows
    this.gatewayTimeoutDialog = page.locator("//dialog | //*[@role='dialog'] | //*[contains(@class,'dialog') or contains(@class,'modal')]").filter({ hasText: /504|gateway time/i }).first();
    this.submittedMessage = this.transferResultHeading;
  }

  async assertNo504(label = '') {
    const has504 = await this.page.evaluate(() =>
      document.body && document.body.innerText.includes('504 Gateway Time-out')
    ).catch(() => false);
    if (has504) {
      throw new Error(`SERVICE_504: Server returned 504 Gateway Time-out${label ? ' at ' + label : ''}.`);
    }
  }

  async openFundTransferForm() {
    // Detect a 504 page immediately (can happen during login/navigation)
    await this.assertNo504('openFundTransferForm start');

    if (await this.fromAccountSelect.isVisible().catch(() => false)) {
      return;
    }

    await this.transferAndPaymentMenu.waitFor({ state: 'visible', timeout: 7000 });
    await this.transferAndPaymentMenu.click({ noWaitAfter: true });
    await this.page.waitForLoadState('domcontentloaded');
    await this.assertNo504('after Transfer & Payment click');

    if (await this.fromAccountSelect.isVisible().catch(() => false)) {
      return;
    }

    if (await this.fundTransferMenu.isVisible().catch(() => false)) {
      await this.fundTransferMenu.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.assertNo504('after Fund Transfer menu click');
    }

    if (!(await this.fromAccountSelect.isVisible().catch(() => false)) && (await this.transferNowLink.isVisible().catch(() => false))) {
      await this.transferNowLink.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.assertNo504('after Transfer Now click');
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
    await this.captureStep(`01_from_account_${wantedType}_selected`);
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

    await this.captureStep(`02_to_account_${wantedType}_selected`);
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
    await this.captureStep('03_amount_screen_loaded');
  }

  async enterPaymentDetails(amount, description) {
    await this.amountInput.waitFor({ state: 'visible', timeout: 7000 });
    await this.amountInput.fill(String(amount));

    // Wait for payment description field with reduced timeout
    await this.paymentDescriptionInput.waitFor({ state: 'visible', timeout: 7000 });
    await this.paymentDescriptionInput.fill(description);

    await this.captureStep('04_payment_details_entered');
  }

  async clickSecondNext() {
    await this.secondNextButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.secondNextButton.click();
    await this.confirmButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.captureStep('05_confirmation_screen_loaded');
  }

  async confirmTransfer() {
    await this.captureStep('06_before_confirm_click');
    await this.confirmButton.waitFor({ state: 'visible', timeout: 7000 });
    await this.confirmButton.click();
    // 504 detection and result-page waiting handled in waitForSubmittedMessage()
  }

  async waitForSubmittedMessage() {
    // Poll every 1.5s for result page OR 504 overlay (max 50s)
    const maxWaitMs = 50000;
    const pollMs = 1500;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      // Check for 504 overlay — appears as text injected anywhere in the page body
      const has504 = await this.page.evaluate(() =>
        document.body.innerText.includes('504 Gateway Time-out')
      ).catch(() => false);
      if (has504) {
        await this.captureStep('07_504_gateway_timeout_error', { waitMs: 0 });
        throw new Error('SERVICE_504: Server returned 504 Gateway Time-out after Confirm click.');
      }
      // Check for the transfer result heading
      const hasResult = await this.transferResultHeading.isVisible().catch(() => false);
      if (hasResult) {
        await this.transferResultHeading.scrollIntoViewIfNeeded().catch(() => {});
        // Try to read the transaction reference — soft failure if not present
        const hasRef = await this.transactionReferenceNumber.isVisible({ timeout: 5000 }).catch(() => false);
        if (hasRef) {
          await this.transactionReferenceNumber.scrollIntoViewIfNeeded().catch(() => {});
          const transactionReferenceText = await this.transactionReferenceNumber.textContent().catch(() => '');
          if (this.testInfo) {
            await this.testInfo.attach('transaction-reference', {
              body: String(transactionReferenceText || '').trim(),
              contentType: 'text/plain',
            }).catch(() => {});
          }
        }
        await this.captureStep('07_transfer_result_page', { waitMs: 1200 });
        return;
      }
      // After 20s: if the Confirm button is still visible, server silently dropped the request
      if (Date.now() - start > 20000) {
        const confirmStillVisible = await this.confirmButton.isVisible().catch(() => false);
        if (confirmStillVisible) {
          await this.captureStep('07_504_gateway_timeout_error', { waitMs: 0 });
          throw new Error('SERVICE_504: Server did not process the Confirm click — page remained on confirmation screen after 20s.');
        }
      }
      await this.page.waitForTimeout(pollMs);
    }

    // One final check before reporting a hard timeout
    const hasResult = await this.transferResultHeading.isVisible().catch(() => false);
    if (!hasResult) {
      throw new Error(`Transfer result page did not appear after ${maxWaitMs}ms`);
    }
    await this.transferResultHeading.scrollIntoViewIfNeeded().catch(() => {});
    await this.captureStep('07_transfer_result_page', { waitMs: 1200 });
  }

  async performTransfer({ fromAccountType, toAccountType, amount, description }) {
    await this.openFundTransferForm();
    await this.captureStep('00_transfer_form_opened');

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

  sanitizePathPart(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async captureStep(name, options = {}) {
    const waitMs = Number(options.waitMs ?? 250);
    if (waitMs > 0) {
      await this.page.waitForTimeout(waitMs);
    }
    await this.takeScreenshot(name);
  }

  async takeScreenshot(name) {
    if (process.env.PW_CAPTURE_STEPS === '0') {
      return;
    }

    let suiteName = this.testInfo && this.testInfo.file
      ? path.basename(this.testInfo.file, '.spec.js')
      : 'general';

    const scenarioPart = this.sanitizePathPart(this.screenshotScenario);
    if (scenarioPart) {
      suiteName = `${suiteName}-${scenarioPart}`;
    }

    const suiteFolder = path.join('screenshots', suiteName);
    fs.mkdirSync(suiteFolder, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(suiteFolder, `${name}_${timestamp}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true });

    if (this.testInfo) {
      await this.testInfo.attach(name, { path: filePath, contentType: 'image/png' });
    }
  }
}

module.exports = { OwnFundTransferPage };
