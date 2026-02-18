// ═══════════════════════════════════════════════════════════════════════════
// 📊 QASL-MOBILE Metrics Collector - InfluxDB 1.x Integration
// ═══════════════════════════════════════════════════════════════════════════
// Envía métricas de ejecución a InfluxDB para visualizar en Grafana
// Compatible con InfluxDB 1.x (InfluxQL)
// ═══════════════════════════════════════════════════════════════════════════

import { InfluxDB, IPoint } from 'influx';
import {
  TestExecution,
  INGRIDAnalysis,
  ReportSummary,
  DeviceInfo
} from '../types/index.js';

export interface InfluxConfig {
  url: string;
  database: string;
  username?: string;
  password?: string;
}

export class MetricsCollector {
  private client: InfluxDB;
  private database: string;

  constructor(config: InfluxConfig) {
    // Parse URL to get host and port
    const urlObj = new URL(config.url);

    this.database = config.database || 'qasl_mobile';

    this.client = new InfluxDB({
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || 8086,
      database: this.database,
      username: config.username || 'admin',
      password: config.password || 'admin'
    });

    // Ensure database exists
    this.ensureDatabase();
  }

  private async ensureDatabase(): Promise<void> {
    try {
      const databases = await this.client.getDatabaseNames();
      if (!databases.includes(this.database)) {
        await this.client.createDatabase(this.database);
        console.log(`📊 Created InfluxDB database: ${this.database}`);
      }
    } catch (error) {
      console.error('Failed to ensure database:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Record Test Execution
  // ─────────────────────────────────────────────────────────────────────────

  async recordExecution(execution: TestExecution): Promise<void> {
    try {
      const points: IPoint[] = [{
        measurement: 'test_execution',
        tags: {
          test_id: execution.testCaseId,
          flow_file: execution.flowFile,
          status: execution.status,
          device: execution.device.name,
          platform: execution.device.platform,
          os_version: execution.device.osVersion,
          is_emulator: String(execution.device.isEmulator),
          framework: 'qasl-mobile'
        },
        fields: {
          duration_ms: execution.duration || 0,
          total_steps: execution.metrics.totalSteps,
          passed_steps: execution.metrics.passedSteps,
          failed_steps: execution.metrics.failedSteps,
          avg_step_duration: execution.metrics.avgStepDuration,
          selector_confidence: execution.metrics.selectorConfidence,
          screenshots_count: execution.screenshots.length,
          passed: execution.status === 'passed' ? 1 : 0,
          failed: execution.status === 'failed' ? 1 : 0,
          device_name: execution.device.name  // Also store as field for Grafana display
        },
        timestamp: execution.startTime
      }];

      await this.client.writePoints(points);
      console.log(`📊 Metrics sent to InfluxDB: ${execution.testCaseId}`);
    } catch (error) {
      console.error('Failed to record execution metrics:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Record INGRID Analysis
  // ─────────────────────────────────────────────────────────────────────────

  async recordINGRIDAnalysis(analysis: INGRIDAnalysis): Promise<void> {
    try {
      const points: IPoint[] = [{
        measurement: 'ingrid_analysis',
        tags: {
          execution_id: analysis.testExecutionId,
          framework: 'qasl-mobile'
        },
        fields: {
          ux_score: analysis.uxScore,
          accessibility_score: analysis.accessibilityScore,
          overall_score: analysis.overallScore,
          findings_count: analysis.findings.length,
          critical_findings: analysis.findings.filter(f => f.severity === 'critical').length,
          high_findings: analysis.findings.filter(f => f.severity === 'high').length,
          medium_findings: analysis.findings.filter(f => f.severity === 'medium').length
        },
        timestamp: analysis.timestamp
      }];

      await this.client.writePoints(points);
      console.log(`📊 INGRID metrics sent to InfluxDB`);
    } catch (error) {
      console.error('Failed to record INGRID metrics:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Record Suite Summary
  // ─────────────────────────────────────────────────────────────────────────

  async recordSuiteSummary(summary: ReportSummary, suiteName: string): Promise<void> {
    try {
      const points: IPoint[] = [{
        measurement: 'test_suite',
        tags: {
          suite_name: suiteName,
          framework: 'qasl-mobile'
        },
        fields: {
          total_tests: summary.totalTests,
          passed: summary.passed,
          failed: summary.failed,
          skipped: summary.skipped,
          pass_rate: summary.passRate,
          total_duration_ms: summary.totalDuration,
          avg_duration_ms: summary.avgDuration,
          avg_selector_confidence: summary.avgSelectorConfidence,
          android_tests: summary.platforms.android,
          ios_tests: summary.platforms.ios
        },
        timestamp: new Date()
      }];

      await this.client.writePoints(points);
      console.log(`📊 Suite summary sent to InfluxDB: ${suiteName}`);
    } catch (error) {
      console.error('Failed to record suite summary:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Record Device Metrics
  // ─────────────────────────────────────────────────────────────────────────

  async recordDeviceMetrics(device: DeviceInfo, metrics: {
    batteryLevel?: number;
    memoryFree?: number;
    cpuTemp?: number;
  }): Promise<void> {
    try {
      const fields: Record<string, number> = {};

      if (metrics.batteryLevel !== undefined) {
        fields.battery_level = metrics.batteryLevel;
      }
      if (metrics.memoryFree !== undefined) {
        fields.memory_free_mb = metrics.memoryFree;
      }
      if (metrics.cpuTemp !== undefined) {
        fields.cpu_temp = metrics.cpuTemp;
      }

      if (Object.keys(fields).length === 0) return;

      const points: IPoint[] = [{
        measurement: 'device_metrics',
        tags: {
          device_name: device.name,
          platform: device.platform,
          os_version: device.osVersion,
          framework: 'qasl-mobile'
        },
        fields,
        timestamp: new Date()
      }];

      await this.client.writePoints(points);
    } catch (error) {
      console.error('Failed to record device metrics:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Record Custom Event
  // ─────────────────────────────────────────────────────────────────────────

  async recordEvent(
    measurement: string,
    tags: Record<string, string>,
    fields: Record<string, number | string | boolean>
  ): Promise<void> {
    try {
      const points: IPoint[] = [{
        measurement,
        tags: { ...tags, framework: 'qasl-mobile' },
        fields,
        timestamp: new Date()
      }];

      await this.client.writePoints(points);
    } catch (error) {
      console.error('Failed to record event:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Query helpers
  // ─────────────────────────────────────────────────────────────────────────

  async query(q: string): Promise<any[]> {
    try {
      return await this.client.query(q);
    } catch (error) {
      console.error('Query failed:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    // InfluxDB 1.x client doesn't need explicit close
  }
}

export default MetricsCollector;
