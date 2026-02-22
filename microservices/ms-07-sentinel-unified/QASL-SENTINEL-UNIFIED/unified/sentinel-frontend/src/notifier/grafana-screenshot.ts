// ============================================
// QASL-SENTINEL - Grafana Dashboard Screenshot
// ============================================
// QASL NEXUS LLM - Elyer Gregorio Maldonado

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class GrafanaScreenshot {
  private grafanaUrl: string;
  private verbose: boolean;
  private snapshotDir: string;
  private grafanaUser: string;
  private grafanaPass: string;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
    this.grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3002';
    this.snapshotDir = process.env.SNAPSHOT_DIR || './snapshots';
    this.grafanaUser = process.env.GRAFANA_USER || 'admin';
    this.grafanaPass = process.env.GRAFANA_PASS || 'sentinel2024';
  }

  async captureSnapshot(): Promise<string | null> {
    this.log('📸 Capturing Grafana dashboard screenshot...');

    let browser: Browser | null = null;

    try {
      // Ensure snapshots directory exists
      if (!fs.existsSync(this.snapshotDir)) {
        fs.mkdirSync(this.snapshotDir, { recursive: true });
      }

      // Launch browser
      browser = await chromium.launch({
        headless: true,
      });

      const context = await browser.newContext({
        viewport: { width: 1400, height: 1200 },
      });

      const page = await context.newPage();

      // First, login to Grafana
      await this.loginToGrafana(page);

      // Navigate to Grafana dashboard in kiosk mode
      const dashboardUrl = `${this.grafanaUrl}/d/qasl-sentinel-main/qasl-sentinel-command-center?orgId=1&kiosk=1`;

      this.log(`🌐 Navigating to dashboard: ${dashboardUrl}`);

      await page.goto(dashboardUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for dashboard panels to load
      await this.waitForDashboard(page);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(this.snapshotDir, `grafana-dashboard-${timestamp}.png`);

      // Capture screenshot
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        type: 'png',
      });

      this.log(`✅ Screenshot saved: ${screenshotPath}`);

      await browser.close();
      return screenshotPath;

    } catch (error: any) {
      this.log(`⚠️ Could not capture Grafana screenshot: ${error.message}`);

      if (browser) {
        await browser.close();
      }

      return null;
    }
  }

  private async loginToGrafana(page: Page): Promise<void> {
    this.log('🔐 Logging into Grafana...');

    try {
      // Navigate to login page
      await page.goto(`${this.grafanaUrl}/login`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // Check if already logged in (redirected to home)
      if (!page.url().includes('/login')) {
        this.log('✅ Already logged in to Grafana');
        return;
      }

      // Fill login form
      await page.fill('input[name="user"]', this.grafanaUser);
      await page.fill('input[name="password"]', this.grafanaPass);

      // Click login button
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForURL((url) => !url.href.includes('/login'), {
        timeout: 10000,
      });

      this.log('✅ Grafana login successful');

    } catch (error: any) {
      this.log(`⚠️ Grafana login issue: ${error.message}`);
      // Continue anyway - dashboard might be public
    }
  }

  private async waitForDashboard(page: Page): Promise<void> {
    try {
      // Wait for Grafana to finish loading
      await page.waitForTimeout(3000);

      // Try to wait for panels to render
      await page.waitForSelector('.panel-container, [data-testid="data-testid Panel header"]', { timeout: 10000 }).catch(() => {
        this.log('⚠️ Panel containers not found, continuing anyway');
      });

      // Additional wait for charts to render
      await page.waitForTimeout(3000);

    } catch (error) {
      this.log('⚠️ Dashboard may not be fully loaded');
    }
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(chalk.cyan(`[GrafanaScreenshot] ${message}`));
    }
  }
}
