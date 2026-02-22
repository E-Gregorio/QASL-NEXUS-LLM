/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QASL-SENTINEL - Security Baseline Manager
 * ═══════════════════════════════════════════════════════════════════════════
 * Gestiona baselines de seguridad para detectar regresiones
 *
 * Funcionalidades:
 *   - Guarda el baseline del último scan
 *   - Compara scans actuales vs anteriores
 *   - Detecta nuevas vulnerabilidades (regresiones)
 *   - Detecta vulnerabilidades resueltas
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { SecurityReport, ZapAlert, SecurityComparison } from '../types.js';

export class SecurityBaseline {
  private baselineDir: string;
  private baselineFile: string;
  private verbose: boolean;

  constructor() {
    this.baselineDir = process.env.SECURITY_BASELINE_DIR || './security-baselines';
    this.baselineFile = path.join(this.baselineDir, 'latest-baseline.json');
    this.verbose = process.env.VERBOSE_LOGGING === 'true';
  }

  /**
   * Compara el scan actual con el baseline anterior
   */
  async compareWithBaseline(currentReport: SecurityReport): Promise<SecurityComparison> {
    const previousBaseline = await this.loadBaseline();

    if (!previousBaseline) {
      this.log('No existe baseline anterior, este será el primero');
      await this.saveBaseline(currentReport);
      return {
        hasBaseline: false,
        regressions: [],
        resolved: [],
        unchanged: currentReport.topAlerts,
        summaryDiff: {
          high: { previous: 0, current: currentReport.summary.high, diff: currentReport.summary.high },
          medium: { previous: 0, current: currentReport.summary.medium, diff: currentReport.summary.medium },
          low: { previous: 0, current: currentReport.summary.low, diff: currentReport.summary.low },
          informational: { previous: 0, current: currentReport.summary.informational, diff: currentReport.summary.informational }
        }
      };
    }

    // Detectar regresiones (nuevas vulnerabilidades)
    const regressions = this.findRegressions(previousBaseline.topAlerts, currentReport.topAlerts);

    // Detectar resueltas
    const resolved = this.findResolved(previousBaseline.topAlerts, currentReport.topAlerts);

    // Sin cambios
    const unchanged = this.findUnchanged(previousBaseline.topAlerts, currentReport.topAlerts);

    // Guardar nuevo baseline
    await this.saveBaseline(currentReport);

    return {
      hasBaseline: true,
      regressions,
      resolved,
      unchanged,
      summaryDiff: {
        high: {
          previous: previousBaseline.summary.high,
          current: currentReport.summary.high,
          diff: currentReport.summary.high - previousBaseline.summary.high
        },
        medium: {
          previous: previousBaseline.summary.medium,
          current: currentReport.summary.medium,
          diff: currentReport.summary.medium - previousBaseline.summary.medium
        },
        low: {
          previous: previousBaseline.summary.low,
          current: currentReport.summary.low,
          diff: currentReport.summary.low - previousBaseline.summary.low
        },
        informational: {
          previous: previousBaseline.summary.informational,
          current: currentReport.summary.informational,
          diff: currentReport.summary.informational - previousBaseline.summary.informational
        }
      }
    };
  }

  /**
   * Encuentra nuevas vulnerabilidades (regresiones)
   */
  private findRegressions(previous: ZapAlert[], current: ZapAlert[]): ZapAlert[] {
    const previousNames = new Set(previous.map(a => this.alertKey(a)));
    return current.filter(alert => !previousNames.has(this.alertKey(alert)));
  }

  /**
   * Encuentra vulnerabilidades resueltas
   */
  private findResolved(previous: ZapAlert[], current: ZapAlert[]): ZapAlert[] {
    const currentNames = new Set(current.map(a => this.alertKey(a)));
    return previous.filter(alert => !currentNames.has(this.alertKey(alert)));
  }

  /**
   * Encuentra vulnerabilidades sin cambios
   */
  private findUnchanged(previous: ZapAlert[], current: ZapAlert[]): ZapAlert[] {
    const previousNames = new Set(previous.map(a => this.alertKey(a)));
    return current.filter(alert => previousNames.has(this.alertKey(alert)));
  }

  /**
   * Genera clave única para una alerta
   */
  private alertKey(alert: ZapAlert): string {
    return `${alert.name}:${alert.risk}:${alert.cweid}`;
  }

  /**
   * Carga el baseline anterior
   */
  private async loadBaseline(): Promise<SecurityReport | null> {
    try {
      const content = await fs.readFile(this.baselineFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Guarda el nuevo baseline
   */
  private async saveBaseline(report: SecurityReport): Promise<void> {
    try {
      await fs.mkdir(this.baselineDir, { recursive: true });
      await fs.writeFile(this.baselineFile, JSON.stringify(report, null, 2));

      // También guardar histórico con timestamp
      const historyFile = path.join(
        this.baselineDir,
        `baseline-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
      );
      await fs.writeFile(historyFile, JSON.stringify(report, null, 2));

      this.log('Baseline guardado');
    } catch (error) {
      this.log(`Error guardando baseline: ${error}`);
    }
  }

  /**
   * Obtiene el estado de seguridad basado en la comparación
   */
  getSecurityStatus(comparison: SecurityComparison): 'improved' | 'stable' | 'degraded' | 'critical' {
    // Si hay nuevas vulnerabilidades HIGH, es crítico
    if (comparison.regressions.some(a => a.risk === 'High')) {
      return 'critical';
    }

    // Si hay nuevas vulnerabilidades Medium, está degradado
    if (comparison.regressions.some(a => a.risk === 'Medium')) {
      return 'degraded';
    }

    // Si se resolvieron vulnerabilidades, mejoró
    if (comparison.resolved.length > 0 && comparison.regressions.length === 0) {
      return 'improved';
    }

    // Sin cambios significativos
    return 'stable';
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(chalk.cyan(`[SecurityBaseline] ${message}`));
    }
  }
}
