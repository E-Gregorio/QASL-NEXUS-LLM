// ============================================
// QASL-SENTINEL - Main Orchestrator
// ============================================
// QASL NEXUS LLM - Elyer Gregorio Maldonado

import { loadConfig, getSnapshotPath } from './config.js';
import { DOMWatcher } from './watchers/dom-watcher.js';
import { ChangeDetector } from './analyzer/change-detector.js';
import { AIAnalyzer } from './analyzer/ai-analyzer.js';
import { EmailNotifier } from './notifier/email.js';
import { MetricsReporter } from './notifier/metrics.js';
import { ZapScanner } from './security/zap-scanner.js';
import { SecurityBaseline } from './security/security-baseline.js';
import { GuardianReport, PageSnapshot, GuardianReportWithSecurity, SecurityReport, SecurityComparison } from './types.js';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

export class Sentinel {
  private config = loadConfig();
  private watcher!: DOMWatcher;
  private detector!: ChangeDetector;
  private analyzer!: AIAnalyzer;
  private notifier!: EmailNotifier;
  private metricsReporter!: MetricsReporter;
  private zapScanner!: ZapScanner;
  private securityBaseline!: SecurityBaseline;

  async run(): Promise<void> {
    const startTime = Date.now();

    this.printBanner();
    console.log(chalk.cyan('\n🛡️  QASL-SENTINEL Starting...\n'));

    try {
      // Initialize components
      await this.initialize();

      // Check VPN if required
      if (this.config.requireVpn) {
        await this.checkVPN();
      }

      // Capture snapshots
      const snapshots = await this.captureSnapshots();

      // Detect changes
      const allChanges = await this.detectChanges(snapshots);

      // Analyze with AI
      let aiAnalysis;
      if (allChanges.length > 0) {
        const testLocators = await this.analyzer.loadTestLocators();
        aiAnalysis = await this.analyzer.analyzeChanges(allChanges, testLocators);
      }

      // Execute Security Scan (OWASP ZAP)
      const securityReport = await this.zapScanner.scan();

      // Compare with security baseline (also saves new baseline internally)
      const securityComparison = await this.securityBaseline.compareWithBaseline(securityReport);

      // Generate report with security data
      const report = this.generateReportWithSecurity(allChanges, aiAnalysis, securityReport, securityComparison, startTime);

      // Send metrics to Grafana/InfluxDB (including security metrics)
      await this.metricsReporter.sendMetrics(report);

      // Send email notification
      await this.notifier.sendReport(report);

      // Print summary
      this.printSummary(report);

      // Cleanup
      await this.cleanup();

    } catch (error: any) {
      console.error(chalk.red('\n❌ Sentinel execution failed:'), error.message);

      // Send error notification
      const errorReport: GuardianReport = {
        timestamp: new Date().toISOString(),
        environment: this.config.targetUrl,
        status: 'error',
        changesCount: 0,
        changes: [],
        snapshotPaths: { previous: '', current: '' },
        executionTime: Date.now() - startTime,
      };

      // Try to send metrics even on error
      try {
        await this.metricsReporter.sendMetrics(errorReport);
      } catch {
        // Silent fail for metrics on error
      }

      await this.notifier.sendReport(errorReport);
      process.exit(1);
    }
  }

  private async initialize(): Promise<void> {
    const spinner = ora('Initializing components...').start();

    this.watcher = new DOMWatcher(this.config);
    this.detector = new ChangeDetector(this.config.verbose);
    this.analyzer = new AIAnalyzer(this.config);
    this.notifier = new EmailNotifier(this.config.verbose);
    this.metricsReporter = new MetricsReporter(this.config.verbose);
    this.zapScanner = new ZapScanner();
    this.securityBaseline = new SecurityBaseline();

    await this.watcher.initialize();

    // Ensure snapshot directory exists
    await fs.mkdir(this.config.snapshotDir, { recursive: true });

    spinner.succeed('Components initialized');
  }

  private async checkVPN(): Promise<void> {
    const spinner = ora('Checking VPN connection...').start();

    try {
      const url = new URL(this.config.vpnCheckUrl!);

      const result = await new Promise<boolean>((resolve) => {
        const req = https.request({
          hostname: url.hostname,
          port: 443,
          path: url.pathname || '/',
          method: 'GET',
          rejectUnauthorized: false, // Ignorar certificados SSL auto-firmados
          timeout: 10000,
        }, (res) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
      });

      if (result) {
        spinner.succeed('VPN connected');
      } else {
        spinner.fail('VPN check failed');
        throw new Error('VPN connection required but not available');
      }
    } catch (error) {
      spinner.fail('VPN check failed');
      throw new Error('VPN connection required but not available');
    }
  }

  private async captureSnapshots(): Promise<Map<string, { current: PageSnapshot; previous?: PageSnapshot }>> {
    const spinner = ora('Capturing page snapshots...').start();
    const snapshots = new Map();

    for (const url of this.config.watchUrls) {
      spinner.text = `Capturing: ${url}`;

      try {
        // Capture current snapshot
        const current = await this.watcher.captureSnapshot(url);

        // Save current snapshot
        const currentPath = getSnapshotPath(url, current.timestamp);
        await fs.writeFile(currentPath, JSON.stringify(current, null, 2));

        // Load previous snapshot
        const previous = await this.loadPreviousSnapshot(url);

        snapshots.set(url, { current, previous });

      } catch (error: any) {
        spinner.warn(`Failed to capture ${url}: ${error.message}`);
      }
    }

    spinner.succeed(`Captured ${snapshots.size} snapshots`);
    return snapshots;
  }

  private async loadPreviousSnapshot(url: string): Promise<PageSnapshot | undefined> {
    try {
      // Find most recent snapshot for this URL
      const files = await fs.readdir(this.config.snapshotDir);
      const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_');

      const matching = files
        .filter(f => f.includes(sanitizedUrl) && f.endsWith('.json'))
        .sort()
        .reverse();

      if (matching.length > 1) {
        // Load second most recent (skip current)
        const previousPath = path.join(this.config.snapshotDir, matching[1]);
        const content = await fs.readFile(previousPath, 'utf-8');
        return JSON.parse(content);
      }

      return undefined;

    } catch (error) {
      return undefined;
    }
  }

  private async detectChanges(
    snapshots: Map<string, { current: PageSnapshot; previous?: PageSnapshot }>
  ): Promise<any[]> {
    const spinner = ora('Detecting changes...').start();
    const allChanges: any[] = [];

    for (const [url, { current, previous }] of snapshots) {
      if (!previous) {
        spinner.info(`No previous snapshot for ${url}, skipping comparison`);
        continue;
      }

      const changes = this.detector.detectChanges(previous, current);

      changes.forEach(change => {
        change.url = url;
        allChanges.push(change);
      });
    }

    if (allChanges.length === 0) {
      spinner.succeed('No changes detected - environment stable');
    } else {
      spinner.warn(`Detected ${allChanges.length} changes`);
    }

    return allChanges;
  }

  private generateReport(changes: any[], aiAnalysis: any, startTime: number): GuardianReport {
    const status = changes.length === 0
      ? 'stable'
      : changes.some(c => c.severity === 'critical')
        ? 'critical'
        : 'changes-detected';

    return {
      timestamp: new Date().toISOString(),
      environment: this.config.targetUrl,
      status,
      changesCount: changes.length,
      changes,
      aiAnalysis,
      snapshotPaths: {
        previous: '',
        current: this.config.snapshotDir,
      },
      executionTime: Date.now() - startTime,
    };
  }

  private generateReportWithSecurity(
    changes: any[],
    aiAnalysis: any,
    securityReport: SecurityReport,
    securityComparison: SecurityComparison,
    startTime: number
  ): GuardianReportWithSecurity {
    // Determine DOM change status
    const domStatus = changes.length === 0
      ? 'stable'
      : changes.some(c => c.severity === 'critical')
        ? 'critical'
        : 'changes-detected';

    // Determine security status
    const securityStatus = this.securityBaseline.getSecurityStatus(securityComparison);

    // Overall status - worst of both
    let status: 'stable' | 'changes-detected' | 'critical' | 'error' = domStatus;
    if (securityStatus === 'critical') {
      status = 'critical';
    } else if (securityStatus === 'degraded' && status !== 'critical') {
      status = 'changes-detected';
    }

    return {
      timestamp: new Date().toISOString(),
      environment: this.config.targetUrl,
      status,
      changesCount: changes.length,
      changes,
      aiAnalysis,
      snapshotPaths: {
        previous: '',
        current: this.config.snapshotDir,
      },
      executionTime: Date.now() - startTime,
      securityReport,
      securityComparison,
      securityStatus,
    };
  }

  private printSummary(report: GuardianReportWithSecurity): void {
    const statusEmoji = {
      'stable': '✅',
      'changes-detected': '⚠️',
      'critical': '❌',
      'error': '🔥',
    };

    const statusColor = {
      'stable': chalk.green,
      'changes-detected': chalk.yellow,
      'critical': chalk.red,
      'error': chalk.red,
    };

    // Security status display
    const securityEmoji = {
      'improved': '🛡️',
      'stable': '✅',
      'degraded': '⚠️',
      'critical': '🚨',
    };

    const securityInfo = report.securityReport?.enabled
      ? `\n\n🔒 SEGURIDAD: ${securityEmoji[report.securityStatus || 'stable']} ${(report.securityStatus || 'stable').toUpperCase()}` +
        `\n   High: ${report.securityReport.summary.high} | Medium: ${report.securityReport.summary.medium} | Low: ${report.securityReport.summary.low}`
      : '\n\n🔒 Seguridad: Deshabilitada';

    console.log('\n' + boxen(
      statusColor[report.status].bold(`${statusEmoji[report.status]} ${report.status.toUpperCase()}\n\n`) +
      `Environment: ${report.environment}\n` +
      `Changes: ${report.changesCount}\n` +
      `Execution: ${(report.executionTime / 1000).toFixed(2)}s\n` +
      (report.aiAnalysis ? `\nImpacted Tests: ${report.aiAnalysis.impactedTests.length}` : '') +
      securityInfo +
      '\n\n📊 Metrics sent to Grafana',
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: report.status === 'stable' ? 'green' : 'yellow',
      }
    ));

    if (report.changesCount > 0) {
      console.log(chalk.yellow('\n📊 Top Changes:\n'));
      report.changes.slice(0, 5).forEach(change => {
        console.log(chalk.gray(`  • [${change.severity}] ${change.description}`));
      });
    }

    // Security alerts
    if (report.securityReport?.enabled && report.securityReport.topAlerts.length > 0) {
      console.log(chalk.magenta('\n🔐 Top Security Alerts:\n'));
      report.securityReport.topAlerts.slice(0, 5).forEach(alert => {
        const riskColor = alert.risk === 'High' ? chalk.red : alert.risk === 'Medium' ? chalk.yellow : chalk.gray;
        console.log(riskColor(`  • [${alert.risk}] ${alert.name}`));
      });
    }

    // Security regressions (new vulnerabilities)
    if (report.securityComparison?.regressions && report.securityComparison.regressions.length > 0) {
      console.log(chalk.red('\n🚨 NUEVAS VULNERABILIDADES DETECTADAS:\n'));
      report.securityComparison.regressions.forEach(alert => {
        console.log(chalk.red(`  ⚠ [${alert.risk}] ${alert.name}`));
      });
    }

    // Resolved vulnerabilities
    if (report.securityComparison?.resolved && report.securityComparison.resolved.length > 0) {
      console.log(chalk.green('\n✅ Vulnerabilidades Resueltas:\n'));
      report.securityComparison.resolved.forEach(alert => {
        console.log(chalk.green(`  ✓ [${alert.risk}] ${alert.name}`));
      });
    }

    if (report.aiAnalysis && report.aiAnalysis.recommendations.length > 0) {
      console.log(chalk.cyan('\n💡 Recommendations:\n'));
      report.aiAnalysis.recommendations.forEach(rec => {
        console.log(chalk.gray(`  ✓ ${rec}`));
      });
    }
  }

  private async cleanup(): Promise<void> {
    await this.watcher.close();

    // Clean old snapshots (retention policy)
    const retentionDays = parseInt(process.env.RETENTION_DAYS || '30');
    await this.cleanOldSnapshots(retentionDays);
  }

  private async cleanOldSnapshots(retentionDays: number): Promise<void> {
    try {
      const files = await fs.readdir(this.config.snapshotDir);
      const now = Date.now();
      const maxAge = retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.config.snapshotDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          console.log(chalk.gray(`  Deleted old snapshot: ${file}`));
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  private printBanner(): void {
    console.clear();
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   ███████╗██╗ ██████╗ ███╗   ███╗ █████╗                              ║
║   ██╔════╝██║██╔════╝ ████╗ ████║██╔══██╗                             ║
║   ███████╗██║██║  ███╗██╔████╔██║███████║                             ║
║   ╚════██║██║██║   ██║██║╚██╔╝██║██╔══██║                             ║
║   ███████║██║╚██████╔╝██║ ╚═╝ ██║██║  ██║                             ║
║   ╚══════╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝                             ║
║                                                                       ║
║   ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗         ║
║   ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║         ║
║   ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║         ║
║   ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║         ║
║   ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗    ║
║   ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝    ║
║                                                                       ║
║              QASL NEXUS LLM - Elyer Gregorio Maldonado                ║
║                    Plataforma QA Multi-LLM                            ║
║                                                                       ║
║              Autonomous Environment Monitoring System                 ║
║           Frontend Change Detection & Regression Prevention           ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
    `));
    console.log(chalk.gray('    Version: 1.0.0 | QASL NEXUS LLM\n'));
  }
}

// Run Sentinel if executed directly
const sentinel = new Sentinel();
sentinel.run();
