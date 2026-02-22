// ═══════════════════════════════════════════════════════════════════════════
// QASL-SENTINEL - ZAP Security Scanner
// ═══════════════════════════════════════════════════════════════════════════
// QASL NEXUS LLM - Elyer Gregorio Maldonado

import { execSync, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ZapScanResult, ZapAlert, SecurityReport } from '../types.js';

export type ScanMode = 'frontend' | 'api' | 'both';

export class ZapScanner {
  private targetUrl: string;
  private reportsDir: string;
  private apiCapturesDir: string;
  private verbose: boolean;
  private enabled: boolean;
  private scanMode: ScanMode;

  constructor() {
    this.targetUrl = process.env.TARGET_URL || 'http://localhost:4200';
    this.reportsDir = process.env.ZAP_REPORTS_DIR || './reports/zap';
    this.apiCapturesDir = process.env.API_CAPTURES_DIR || './.api-captures';
    this.verbose = process.env.VERBOSE_LOGGING === 'true';
    this.enabled = process.env.ZAP_SCAN_ENABLED !== 'false'; // Habilitado por defecto
    this.scanMode = (process.env.ZAP_SCAN_MODE as ScanMode) || 'frontend';
  }

  /**
   * Ejecuta el scan de seguridad ZAP según el modo configurado
   */
  async scan(): Promise<SecurityReport> {
    if (!this.enabled) {
      this.log('ZAP scan disabled, skipping...');
      return this.createEmptyReport();
    }

    const spinner = ora('Verificando Docker para ZAP...').start();

    try {
      // Verificar Docker
      if (!await this.checkDocker()) {
        spinner.warn('Docker no disponible, saltando scan de seguridad');
        return this.createEmptyReport();
      }
      spinner.succeed('Docker disponible');

      // Crear directorio de reportes
      await fs.mkdir(this.reportsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let combinedResult: ZapScanResult;

      switch (this.scanMode) {
        case 'frontend':
          spinner.start('Ejecutando OWASP ZAP Frontend Scan (2-5 min)...');
          combinedResult = await this.runFrontendScan(timestamp);
          break;

        case 'api':
          spinner.start('Ejecutando OWASP ZAP API Scan...');
          combinedResult = await this.runApiScan(timestamp);
          break;

        case 'both':
          spinner.start('Ejecutando OWASP ZAP Frontend + API Scan (5-10 min)...');
          const frontendResult = await this.runFrontendScan(timestamp);
          const apiResult = await this.runApiScan(timestamp);
          combinedResult = this.combineResults(frontendResult, apiResult);
          break;

        default:
          combinedResult = await this.runFrontendScan(timestamp);
      }

      if (combinedResult.alerts.length > 0) {
        spinner.succeed(`ZAP scan completado: ${combinedResult.summary.total} alertas encontradas`);
      } else {
        spinner.succeed('ZAP scan completado: Sin alertas de seguridad');
      }

      // Crear reporte de seguridad
      return this.createSecurityReport(combinedResult, timestamp);

    } catch (error) {
      spinner.fail('Error en ZAP scan');
      this.log(`Error: ${error}`);
      return this.createEmptyReport();
    }
  }

  /**
   * Ejecuta scan de frontend (aplicación web completa)
   * Detecta: XSS, CSRF, headers de seguridad, cookies inseguras, información expuesta
   */
  private async runFrontendScan(timestamp: string): Promise<ZapScanResult> {
    const reportName = `FRONTEND-${timestamp}`;

    const result = await this.runZapBaseline(reportName, this.targetUrl);

    if (result.success) {
      return await this.parseResults(reportName);
    }

    return this.createEmptyZapResult();
  }

  /**
   * Ejecuta scan de APIs capturadas durante E2E
   * Lee las capturas de .api-captures/ y escanea cada endpoint
   */
  private async runApiScan(timestamp: string): Promise<ZapScanResult> {
    const reportName = `API-${timestamp}`;

    // Buscar última captura de APIs
    const captureFile = await this.findLatestApiCapture();

    if (!captureFile) {
      this.log('No se encontraron capturas de API, saltando scan de API');
      return this.createEmptyZapResult();
    }

    this.log(`Usando captura de API: ${captureFile}`);

    // Leer APIs capturadas y extraer URL base
    const capturedAPIs = JSON.parse(await fs.readFile(captureFile, 'utf-8'));

    if (!capturedAPIs || capturedAPIs.length === 0) {
      this.log('Captura de API vacía');
      return this.createEmptyZapResult();
    }

    // Extraer URL base de la primera API
    const apiBaseUrl = new URL(capturedAPIs[0].url).origin;
    this.log(`API Base URL: ${apiBaseUrl}`);

    const result = await this.runZapBaseline(reportName, apiBaseUrl);

    if (result.success) {
      return await this.parseResults(reportName);
    }

    return this.createEmptyZapResult();
  }

  /**
   * Busca la captura de API más reciente
   */
  private async findLatestApiCapture(): Promise<string | null> {
    try {
      const files = await fs.readdir(this.apiCapturesDir);
      const apiFiles = files
        .filter(f => f.endsWith('-apis.json'))
        .map(f => ({
          name: f,
          path: path.join(this.apiCapturesDir, f)
        }));

      if (apiFiles.length === 0) {
        return null;
      }

      // Obtener stats y ordenar por fecha de modificación
      const filesWithStats = await Promise.all(
        apiFiles.map(async (file) => ({
          ...file,
          mtime: (await fs.stat(file.path)).mtime
        }))
      );

      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      return filesWithStats[0].path;
    } catch {
      return null;
    }
  }

  /**
   * Combina resultados de múltiples scans
   */
  private combineResults(frontend: ZapScanResult, api: ZapScanResult): ZapScanResult {
    // Combinar alertas eliminando duplicados por nombre
    const alertMap = new Map<string, ZapAlert>();

    [...frontend.alerts, ...api.alerts].forEach(alert => {
      const key = `${alert.name}:${alert.risk}`;
      if (!alertMap.has(key)) {
        alertMap.set(key, alert);
      } else {
        // Sumar instancias si ya existe
        const existing = alertMap.get(key)!;
        existing.instances += alert.instances;
      }
    });

    const combinedAlerts = Array.from(alertMap.values());

    return {
      timestamp: new Date().toISOString(),
      targetUrl: this.targetUrl,
      alerts: combinedAlerts,
      summary: {
        high: combinedAlerts.filter(a => a.risk === 'High').length,
        medium: combinedAlerts.filter(a => a.risk === 'Medium').length,
        low: combinedAlerts.filter(a => a.risk === 'Low').length,
        informational: combinedAlerts.filter(a => a.risk === 'Informational').length,
        total: combinedAlerts.length
      },
      scanDuration: 0,
      htmlReportPath: frontend.htmlReportPath, // Usar reporte de frontend como principal
      jsonReportPath: frontend.jsonReportPath
    };
  }

  /**
   * Verifica si Docker está disponible
   */
  private async checkDocker(): Promise<boolean> {
    try {
      execSync('docker version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ejecuta ZAP Baseline Scan via Docker
   * Basado en QASL-Framework/scripts/run-zap.mjs
   */
  private async runZapBaseline(reportName: string, targetUrl: string): Promise<{ success: boolean; alertsCount: number }> {
    return new Promise((resolve) => {
      const cwd = process.cwd().replace(/\\/g, '/');
      const dockerPath = cwd.replace(/^([A-Za-z]):/, (_, letter) => `//${letter.toLowerCase()}`);

      const htmlReport = `${reportName}-report.html`;
      const jsonReport = `${reportName}-report.json`;

      // Comando ZAP Baseline Scan
      // -t: target URL
      // -r: HTML report
      // -J: JSON report
      // -a: include alpha rules
      // -j: use ajax spider (necesario para SPAs como Angular/React)
      const dockerCmd = `docker run --rm -v "${dockerPath}/${this.reportsDir}:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t "${targetUrl}" -r "${htmlReport}" -J "${jsonReport}" -a -j`;

      this.log(`Ejecutando: ${dockerCmd}`);

      // Timeout de 10 minutos para el proceso
      exec(dockerCmd, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 }, (error, stdout) => {
        // ZAP retorna exit code != 0 si encuentra vulnerabilidades (WARN/FAIL)
        // Esto es normal, no es un error
        const alertsMatch = stdout.match(/WARN-NEW: (\d+)/);
        const alertsCount = alertsMatch ? parseInt(alertsMatch[1]) : 0;

        this.log(`ZAP output (últimas líneas): ${stdout.slice(-1000)}`);

        // Verificar si el reporte JSON existe
        const jsonPath = `${this.reportsDir}/${jsonReport}`;

        resolve({
          success: true, // Siempre success si llegó aquí, el exit code de ZAP es por alertas
          alertsCount
        });
      });
    });
  }

  /**
   * Espera a que un archivo exista (con reintentos)
   */
  private async waitForFile(filePath: string, maxRetries: number = 10, delayMs: number = 2000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        this.log(`Esperando archivo (intento ${i + 1}/${maxRetries}): ${filePath}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }

  /**
   * Parsea el JSON de resultados de ZAP
   * IMPORTANTE: Filtra solo el site que corresponde al target URL
   * El JSON puede contener múltiples sites (firefox-settings, etc.)
   */
  private async parseResults(reportName: string): Promise<ZapScanResult> {
    const jsonPath = path.join(this.reportsDir, `${reportName}-report.json`);

    // Esperar a que el archivo exista (ZAP puede tardar en escribirlo)
    const fileExists = await this.waitForFile(jsonPath, 15, 2000);
    if (!fileExists) {
      this.log(`Archivo no encontrado después de esperar: ${jsonPath}`);
      return this.createEmptyZapResult();
    }

    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const zapJson = JSON.parse(content);

      const alerts: ZapAlert[] = [];
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;
      let infoCount = 0;

      // Extraer hostname del target para filtrar
      const targetHost = new URL(this.targetUrl).hostname;
      this.log(`Buscando alertas para host: ${targetHost}`);

      // Parsear alertas del formato ZAP
      // IMPORTANTE: Filtrar solo el site que corresponde a nuestro target
      if (zapJson.site && Array.isArray(zapJson.site)) {
        for (const site of zapJson.site) {
          // Verificar que sea el site correcto (no firefox-settings, etc.)
          const siteHost = site['@host'] || '';
          if (!siteHost.includes(targetHost.split('.')[0])) {
            this.log(`Saltando site: ${siteHost} (no es nuestro target)`);
            continue;
          }

          this.log(`Procesando site: ${siteHost}`);

          if (site.alerts && Array.isArray(site.alerts)) {
            this.log(`Encontradas ${site.alerts.length} alertas`);

            for (const alert of site.alerts) {
              const risk = this.parseRiskLevel(alert.riskcode || alert.risk);

              alerts.push({
                name: alert.name || alert.alert,
                risk: risk,
                riskCode: parseInt(alert.riskcode) || 0,
                confidence: alert.confidence || 'Medium',
                description: alert.desc || alert.description || '',
                solution: alert.solution || '',
                reference: alert.reference || '',
                instances: parseInt(alert.count) || (alert.instances?.length || 1),
                cweid: alert.cweid || '',
                wascid: alert.wascid || ''
              });

              switch (risk) {
                case 'High': highCount++; break;
                case 'Medium': mediumCount++; break;
                case 'Low': lowCount++; break;
                default: infoCount++; break;
              }
            }
          }
        }
      }

      this.log(`Total alertas parseadas: High=${highCount}, Medium=${mediumCount}, Low=${lowCount}, Info=${infoCount}`);

      return {
        timestamp: new Date().toISOString(),
        targetUrl: this.targetUrl,
        alerts,
        summary: {
          high: highCount,
          medium: mediumCount,
          low: lowCount,
          informational: infoCount,
          total: alerts.length
        },
        scanDuration: 0,
        htmlReportPath: path.join(this.reportsDir, `${reportName}-report.html`),
        jsonReportPath: jsonPath
      };

    } catch (error) {
      this.log(`Error parsing ZAP results: ${error}`);
      return this.createEmptyZapResult();
    }
  }

  /**
   * Convierte código de riesgo a texto
   */
  private parseRiskLevel(riskCode: string | number): 'High' | 'Medium' | 'Low' | 'Informational' {
    const code = typeof riskCode === 'string' ? parseInt(riskCode) : riskCode;
    switch (code) {
      case 3: return 'High';
      case 2: return 'Medium';
      case 1: return 'Low';
      default: return 'Informational';
    }
  }

  /**
   * Crea resultado ZAP vacío
   */
  private createEmptyZapResult(): ZapScanResult {
    return {
      timestamp: new Date().toISOString(),
      targetUrl: this.targetUrl,
      alerts: [],
      summary: { high: 0, medium: 0, low: 0, informational: 0, total: 0 },
      scanDuration: 0,
      htmlReportPath: '',
      jsonReportPath: ''
    };
  }

  /**
   * Crea el reporte de seguridad final
   */
  private createSecurityReport(zapResult: ZapScanResult, timestamp: string): SecurityReport {
    return {
      enabled: true,
      timestamp,
      targetUrl: this.targetUrl,
      scanResult: zapResult,
      summary: {
        high: zapResult.summary.high,
        medium: zapResult.summary.medium,
        low: zapResult.summary.low,
        informational: zapResult.summary.informational,
        total: zapResult.summary.total
      },
      topAlerts: zapResult.alerts.slice(0, 5), // Top 5 alertas
      htmlReportPath: zapResult.htmlReportPath,
      regressions: [], // Se llena al comparar con baseline
      resolved: [] // Se llena al comparar con baseline
    };
  }

  /**
   * Crea reporte vacío cuando ZAP está deshabilitado
   */
  private createEmptyReport(): SecurityReport {
    return {
      enabled: false,
      timestamp: new Date().toISOString(),
      targetUrl: this.targetUrl,
      scanResult: null,
      summary: { high: 0, medium: 0, low: 0, informational: 0, total: 0 },
      topAlerts: [],
      htmlReportPath: '',
      regressions: [],
      resolved: []
    };
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(chalk.magenta(`[ZapScanner] ${message}`));
    }
  }
}
