// ============================================
// SIGMA-SENTINEL - DOM Watcher
// ============================================
// AGIP - Buenos Aires Ciudad
// Sin login requerido - Usuario ya autenticado via VPN

import { chromium, Browser, Page } from '@playwright/test';
import { GuardianConfig, PageSnapshot, DOMElement, InteractiveElement } from '../types.js';
import chalk from 'chalk';

export class DOMWatcher {
  private browser?: Browser;
  private config: GuardianConfig;

  constructor(config: GuardianConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.log('🌐 Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
      ],
    });
  }

  async captureSnapshot(url: string): Promise<PageSnapshot> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = `${this.config.targetUrl}${url}`;
    this.log(`📸 Capturing snapshot: ${fullUrl}`);

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'SIGMA-SENTINEL/1.0 (QA Monitoring - AGIP)',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    try {
      // SIGMA: Sin login requerido - Usuario ya autenticado via VPN
      // El frontend tiene datos mockeados y no requiere autenticación

      // Navigate to target page
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000); // Extra wait for dynamic content (Angular/React)

      const timestamp = new Date().toISOString();

      // Capture full HTML
      const html = await page.content();

      // Extract DOM structure
      const dom = await this.extractDOMStructure(page);

      // Extract interactive elements
      const interactive = await this.extractInteractiveElements(page);

      // Get metadata
      const metadata = {
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: { width: 1920, height: 1080 },
        cookies: await context.cookies(),
        localStorage: await page.evaluate(() => ({ ...localStorage })),
      };

      const snapshot: PageSnapshot = {
        url,
        timestamp,
        html,
        dom,
        interactive,
        metadata,
      };

      this.log(`✅ Snapshot captured: ${dom.length} DOM elements, ${interactive.length} interactive`);

      await context.close();
      return snapshot;

    } catch (error) {
      await context.close();
      throw error;
    }
  }

  // NOTA: Login deshabilitado para SIGMA
  // El ambiente de test no requiere autenticación (datos mockeados)
  // Usuario accede directamente via VPN

  private async extractDOMStructure(page: Page): Promise<DOMElement[]> {
    return await page.evaluate(`(() => {
      const elements = [];
      const allElements = document.querySelectorAll('*');
      const relevantTags = ['button', 'input', 'select', 'a', 'form', 'table', 'h1', 'h2', 'h3', 'div[id]', 'div[class]'];

      allElements.forEach((el) => {
        const tag = el.tagName.toLowerCase();

        if (!relevantTags.some(t => tag.match(t.split('[')[0]))) return;
        if (tag === 'script' || tag === 'style') return;

        const attributes = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          attributes[attr.name] = attr.value;
        }

        const getXPath = (element) => {
          if (element.id) return '//*[@id="' + element.id + '"]';

          let path = '';
          let current = element;

          while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousElementSibling;

            while (sibling) {
              if (sibling.tagName === current.tagName) index++;
              sibling = sibling.previousElementSibling;
            }

            path = '/' + current.tagName.toLowerCase() + '[' + index + ']' + path;
            current = current.parentElement;
          }

          return path;
        };

        const getCSSPath = (element) => {
          if (element.id) return '#' + element.id;

          const classes = Array.from(element.classList).join('.');
          const tagName = element.tagName.toLowerCase();

          return classes ? tagName + '.' + classes : tagName;
        };

        elements.push({
          tag,
          id: el.id || undefined,
          class: el.className || undefined,
          attributes,
          text: el.textContent ? el.textContent.trim().substring(0, 100) : '',
          xpath: getXPath(el),
          cssPath: getCSSPath(el),
        });
      });

      return elements;
    })()`);
  }

  private async extractInteractiveElements(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(`(() => {
      const interactive = [];

      // Buttons
      document.querySelectorAll('button').forEach((btn) => {
        interactive.push({
          type: 'button',
          locator: btn.id ? '#' + btn.id : btn.className ? '.' + btn.className.split(' ')[0] : 'button:has-text("' + (btn.textContent ? btn.textContent.trim() : '') + '")',
          label: btn.textContent ? btn.textContent.trim() : '',
          visible: btn.offsetParent !== null,
          enabled: !btn.disabled,
        });
      });

      // Inputs
      document.querySelectorAll('input').forEach((input) => {
        interactive.push({
          type: input.type === 'checkbox' ? 'checkbox' : input.type === 'radio' ? 'radio' : 'input',
          locator: input.id ? '#' + input.id : input.name ? 'input[name="' + input.name + '"]' : 'input[type="' + input.type + '"]',
          placeholder: input.placeholder,
          value: input.value,
          visible: input.offsetParent !== null,
          enabled: !input.disabled,
        });
      });

      // Links
      document.querySelectorAll('a[href]').forEach((link) => {
        interactive.push({
          type: 'link',
          locator: link.id ? '#' + link.id : 'a:has-text("' + (link.textContent ? link.textContent.trim() : '') + '")',
          label: link.textContent ? link.textContent.trim() : '',
          visible: link.offsetParent !== null,
          enabled: true,
        });
      });

      // Selects
      document.querySelectorAll('select').forEach((select) => {
        interactive.push({
          type: 'select',
          locator: select.id ? '#' + select.id : select.name ? 'select[name="' + select.name + '"]' : 'select',
          visible: select.offsetParent !== null,
          enabled: !select.disabled,
        });
      });

      return interactive;
    })()`);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.log('🔒 Browser closed');
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(chalk.cyan(`[DOMWatcher] ${message}`));
    }
  }
}
