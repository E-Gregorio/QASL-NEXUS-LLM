// ============================================
// SIGMA-SENTINEL - Metrics Reporter (InfluxDB/Grafana)
// ============================================
// AGIP - Buenos Aires Ciudad

import { GuardianReport, GuardianReportWithSecurity } from '../types.js';
import chalk from 'chalk';

export class MetricsReporter {
  private influxUrl: string;
  private influxToken: string;
  private influxOrg: string;
  private influxBucket: string;
  private verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
    this.influxUrl = process.env.INFLUXDB_URL || 'http://localhost:8088';
    this.influxToken = process.env.INFLUXDB_TOKEN || 'sigma-sentinel-token-2024';
    this.influxOrg = process.env.INFLUXDB_ORG || 'sigma';
    this.influxBucket = process.env.INFLUXDB_BUCKET || 'sentinel_metrics';
  }

  async sendMetrics(report: GuardianReport | GuardianReportWithSecurity): Promise<void> {
    this.log('📊 Sending metrics to InfluxDB/Grafana...');

    const timestamp = new Date(report.timestamp).getTime() * 1000000; // nanoseconds

    // Build Line Protocol data
    const lineProtocol = this.buildLineProtocol(report, timestamp);

    try {
      const response = await fetch(
        `${this.influxUrl}/api/v2/write?org=${this.influxOrg}&bucket=${this.influxBucket}&precision=ns`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${this.influxToken}`,
            'Content-Type': 'text/plain; charset=utf-8',
          },
          body: lineProtocol,
        }
      );

      if (response.ok || response.status === 204) {
        this.log('✅ Metrics sent successfully to Grafana');
      } else {
        const errorText = await response.text();
        console.error(chalk.yellow(`⚠️ Failed to send metrics: ${response.status} - ${errorText}`));
      }
    } catch (error: any) {
      console.error(chalk.yellow(`⚠️ Could not connect to InfluxDB: ${error.message}`));
      this.log('⚠️ Metrics will be available when InfluxDB is running');
    }
  }

  private buildLineProtocol(report: GuardianReport | GuardianReportWithSecurity, timestamp: number): string {
    const lines: string[] = [];
    const extReport = report as GuardianReportWithSecurity;

    // Main scan metrics
    const statusValue = this.statusToNumber(report.status);
    const confidence = report.aiAnalysis?.confidence ?? 0;
    const impactedTests = report.aiAnalysis?.impactedTests?.length ?? 0;
    const executionTime = report.executionTime / 1000; // convert to seconds

    // Escape special characters in environment URL
    const environment = report.environment.replace(/[,= ]/g, '\\$&');

    // sentinel_scan measurement
    lines.push(
      `sentinel_scan,environment=${environment},status=${report.status} ` +
      `changes=${report.changesCount}i,` +
      `confidence=${(confidence * 100).toFixed(2)},` +
      `impacted_tests=${impactedTests}i,` +
      `execution_time=${executionTime.toFixed(2)},` +
      `status_code=${statusValue}i ` +
      `${timestamp}`
    );

    // Changes by severity
    if (report.changes.length > 0) {
      const criticalCount = report.changes.filter(c => c.severity === 'critical').length;
      const highCount = report.changes.filter(c => c.severity === 'high').length;
      const mediumCount = report.changes.filter(c => c.severity === 'medium').length;
      const lowCount = report.changes.filter(c => c.severity === 'low').length;

      lines.push(
        `sentinel_changes,environment=${environment} ` +
        `critical=${criticalCount}i,` +
        `high=${highCount}i,` +
        `medium=${mediumCount}i,` +
        `low=${lowCount}i ` +
        `${timestamp}`
      );
    }

    // AI Analysis metrics
    if (report.aiAnalysis) {
      const recommendationsCount = report.aiAnalysis.recommendations?.length ?? 0;

      lines.push(
        `sentinel_ai,environment=${environment} ` +
        `confidence=${(confidence * 100).toFixed(2)},` +
        `impacted_tests=${impactedTests}i,` +
        `recommendations=${recommendationsCount}i ` +
        `${timestamp}`
      );
    }

    // Security metrics (OWASP ZAP)
    if (extReport.securityReport?.enabled) {
      const securityStatusValue = this.securityStatusToNumber(extReport.securityStatus || 'stable');
      const regressions = extReport.securityComparison?.regressions?.length ?? 0;
      const resolved = extReport.securityComparison?.resolved?.length ?? 0;

      lines.push(
        `sentinel_security,environment=${environment},security_status=${extReport.securityStatus || 'stable'} ` +
        `high=${extReport.securityReport.summary.high}i,` +
        `medium=${extReport.securityReport.summary.medium}i,` +
        `low=${extReport.securityReport.summary.low}i,` +
        `informational=${extReport.securityReport.summary.informational}i,` +
        `total=${extReport.securityReport.summary.total}i,` +
        `regressions=${regressions}i,` +
        `resolved=${resolved}i,` +
        `security_status_code=${securityStatusValue}i ` +
        `${timestamp}`
      );

      // Individual alerts for detailed tracking
      if (extReport.securityReport.topAlerts.length > 0) {
        extReport.securityReport.topAlerts.forEach((alert, index) => {
          const alertName = alert.name.replace(/[,= ]/g, '\\$&').substring(0, 50);
          lines.push(
            `sentinel_security_alert,environment=${environment},risk=${alert.risk},alert_name=${alertName} ` +
            `instances=${alert.instances}i,` +
            `risk_code=${alert.riskCode}i,` +
            `position=${index + 1}i ` +
            `${timestamp}`
          );
        });
      }
    }

    return lines.join('\n');
  }

  private securityStatusToNumber(status: string): number {
    switch (status) {
      case 'improved': return 0;
      case 'stable': return 1;
      case 'degraded': return 2;
      case 'critical': return 3;
      default: return -1;
    }
  }

  private statusToNumber(status: string): number {
    switch (status) {
      case 'stable': return 0;
      case 'changes-detected': return 1;
      case 'critical': return 2;
      case 'error': return 3;
      default: return -1;
    }
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(chalk.magenta(`[MetricsReporter] ${message}`));
    }
  }
}
