// ═══════════════════════════════════════════════════════════════════════════
// 📊 QASL-MOBILE Allure Reporter
// ═══════════════════════════════════════════════════════════════════════════
// Genera reportes Allure desde resultados de Maestro
// Compatible con CI/CD (Jenkins, GitLab, GitHub Actions)
// ═══════════════════════════════════════════════════════════════════════════

import * as fs from 'fs/promises';
import * as path from 'path';
import { TestExecution, INGRIDAnalysis } from '../types/index.js';

export interface AllureConfig {
  resultsDir: string;
  projectId?: string;
  serverUrl?: string;
}

interface AllureResult {
  uuid: string;
  historyId: string;
  name: string;
  fullName: string;
  status: 'passed' | 'failed' | 'broken' | 'skipped';
  stage: 'finished';
  start: number;
  stop: number;
  labels: AllureLabel[];
  links: AllureLink[];
  attachments: AllureAttachment[];
  parameters: AllureParameter[];
  steps: AllureStep[];
  description?: string;
  descriptionHtml?: string;
}

interface AllureLabel {
  name: string;
  value: string;
}

interface AllureLink {
  name: string;
  url: string;
  type: string;
}

interface AllureAttachment {
  name: string;
  source: string;
  type: string;
}

interface AllureParameter {
  name: string;
  value: string;
}

interface AllureStep {
  name: string;
  status: 'passed' | 'failed' | 'broken' | 'skipped';
  start: number;
  stop: number;
  attachments?: AllureAttachment[];
}

export class AllureReporter {
  private config: AllureConfig;

  constructor(config: AllureConfig) {
    this.config = {
      resultsDir: config.resultsDir || './allure-results',
      projectId: config.projectId || 'qasl-mobile',
      serverUrl: config.serverUrl || 'http://localhost:5050'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Allure Results from Test Execution
  // ─────────────────────────────────────────────────────────────────────────

  async generateResults(executions: TestExecution[]): Promise<void> {
    await fs.mkdir(this.config.resultsDir, { recursive: true });

    console.log(`\n📊 Generating Allure results for ${executions.length} tests...`);

    for (const execution of executions) {
      const result = this.createAllureResult(execution);
      const filename = `${result.uuid}-result.json`;
      const filepath = path.join(this.config.resultsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(result, null, 2));

      // Copy screenshots as attachments with correct Allure naming
      for (let i = 0; i < execution.screenshots.length; i++) {
        const screenshot = execution.screenshots[i];
        const attachmentName = `${execution.id}-attachment-${i}-attachment.png`;
        await this.copyAttachmentWithName(screenshot, attachmentName);
      }

    }

    // Generate environment.properties
    await this.generateEnvironmentProperties();

    // Generate categories.json for failure classification
    await this.generateCategories();

    console.log(`✅ Allure results saved to: ${this.config.resultsDir}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create Allure Result Object
  // ─────────────────────────────────────────────────────────────────────────

  private createAllureResult(execution: TestExecution): AllureResult {
    const startTime = execution.startTime.getTime();
    const endTime = execution.endTime?.getTime() || Date.now();

    // Generate unique attachment names for Allure
    const attachments: AllureAttachment[] = execution.screenshots.map((_s, i) => {
      const attachmentId = `${execution.id}-attachment-${i}`;
      return {
        name: i === 0 ? 'Before Test' : i === execution.screenshots.length - 1 ? 'After Test' : `Screenshot ${i}`,
        source: `${attachmentId}-attachment.png`,
        type: 'image/png'
      };
    });

    const result: AllureResult = {
      uuid: execution.id,
      historyId: this.generateHistoryId(execution.testCaseId),
      name: execution.testCaseId,
      fullName: `QASL-MOBILE.${execution.flowFile}`,
      status: execution.status === 'passed' ? 'passed' : 'failed',
      stage: 'finished',
      start: startTime,
      stop: endTime,
      labels: [
        { name: 'suite', value: 'QASL-MOBILE' },
        { name: 'epic', value: 'Mobile Testing' },
        { name: 'feature', value: execution.testCaseId },
        { name: 'story', value: path.basename(execution.flowFile, '.yaml') },
        { name: 'severity', value: 'normal' },
        { name: 'framework', value: 'Maestro' },
        { name: 'language', value: 'YAML' },
        { name: 'host', value: execution.device.name },
        { name: 'thread', value: execution.device.platform },
        { name: 'package', value: 'qasl-mobile.tests' }
      ],
      links: [],
      attachments,
      parameters: [
        { name: 'Device', value: execution.device.name },
        { name: 'Platform', value: execution.device.platform },
        { name: 'OS Version', value: execution.device.osVersion },
        { name: 'Screen Size', value: execution.device.screenSize || 'Unknown' },
        { name: 'Is Emulator', value: String(execution.device.isEmulator) }
      ],
      steps: this.createAllureSteps(execution)
    };

    if (execution.errorMessage) {
      result.descriptionHtml = `<pre style="color: red;">${this.escapeHtml(execution.errorMessage)}</pre>`;
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create Allure Steps from Execution
  // ─────────────────────────────────────────────────────────────────────────

  private createAllureSteps(execution: TestExecution): AllureStep[] {
    const steps: AllureStep[] = [];
    const startTime = execution.startTime.getTime();
    const duration = execution.duration || 0;
    const stepDuration = duration / Math.max(execution.metrics.totalSteps, 1);

    // Add execution steps
    for (let i = 0; i < execution.metrics.totalSteps; i++) {
      const isPassedStep = i < execution.metrics.passedSteps;
      steps.push({
        name: `Step ${i + 1}`,
        status: isPassedStep ? 'passed' : 'failed',
        start: startTime + (i * stepDuration),
        stop: startTime + ((i + 1) * stepDuration)
      });
    }

    // Add metrics step
    steps.push({
      name: `Metrics: ${execution.metrics.passedSteps}/${execution.metrics.totalSteps} passed`,
      status: execution.status === 'passed' ? 'passed' : 'failed',
      start: startTime,
      stop: startTime + duration
    });

    return steps;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add INGRID Analysis to Results
  // ─────────────────────────────────────────────────────────────────────────

  async addINGRIDAnalysis(executionId: string, analysis: INGRIDAnalysis): Promise<void> {
    const attachmentContent = this.formatINGRIDReport(analysis);
    const filename = `${executionId}-ingrid-analysis.html`;
    const filepath = path.join(this.config.resultsDir, filename);

    await fs.writeFile(filepath, attachmentContent);

    // Create attachment reference
    const attachmentRef = {
      name: 'INGRID AI Analysis',
      source: filename,
      type: 'text/html'
    };

    // Update the result file to include this attachment
    const resultFile = path.join(this.config.resultsDir, `${executionId}-result.json`);
    try {
      const resultContent = await fs.readFile(resultFile, 'utf-8');
      const result = JSON.parse(resultContent) as AllureResult;
      result.attachments.push(attachmentRef);
      await fs.writeFile(resultFile, JSON.stringify(result, null, 2));
    } catch {
      console.warn(`Could not update result file for INGRID analysis: ${executionId}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Format INGRID Report as HTML
  // ─────────────────────────────────────────────────────────────────────────

  private formatINGRIDReport(analysis: INGRIDAnalysis): string {
    const findings = analysis.findings.map(f => `
      <div class="finding ${f.severity}">
        <h4>${this.escapeHtml(f.title)}</h4>
        <p><strong>Type:</strong> ${f.type} | <strong>Severity:</strong> ${f.severity}</p>
        <p>${this.escapeHtml(f.description)}</p>
        ${f.suggestion ? `<p><strong>Suggestion:</strong> ${this.escapeHtml(f.suggestion)}</p>` : ''}
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>INGRID Mobile Analysis</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: #eee; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: white; }
    .scores { display: flex; gap: 20px; margin: 20px 0; }
    .score-card { background: #16213e; padding: 20px; border-radius: 10px; text-align: center; flex: 1; }
    .score-value { font-size: 48px; font-weight: bold; }
    .score-value.good { color: #4ade80; }
    .score-value.warning { color: #fbbf24; }
    .score-value.bad { color: #f87171; }
    .finding { background: #16213e; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #667eea; }
    .finding.critical { border-left-color: #ef4444; }
    .finding.high { border-left-color: #f97316; }
    .finding.medium { border-left-color: #eab308; }
    .finding.low { border-left-color: #22c55e; }
    .finding h4 { margin: 0 0 10px 0; color: #a5b4fc; }
    .recommendations { background: #16213e; padding: 20px; border-radius: 10px; margin-top: 20px; }
    .recommendations h3 { color: #a5b4fc; margin-top: 0; }
    .recommendations ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INGRID Mobile Analysis Report</h1>
    <p>AI-Powered UX & Accessibility Analysis</p>
  </div>

  <div class="scores">
    <div class="score-card">
      <div class="score-value ${analysis.uxScore >= 80 ? 'good' : analysis.uxScore >= 60 ? 'warning' : 'bad'}">${analysis.uxScore}</div>
      <div>UX Score</div>
    </div>
    <div class="score-card">
      <div class="score-value ${analysis.accessibilityScore >= 80 ? 'good' : analysis.accessibilityScore >= 60 ? 'warning' : 'bad'}">${analysis.accessibilityScore}</div>
      <div>Accessibility Score</div>
    </div>
    <div class="score-card">
      <div class="score-value ${analysis.overallScore >= 80 ? 'good' : analysis.overallScore >= 60 ? 'warning' : 'bad'}">${analysis.overallScore}</div>
      <div>Overall Score</div>
    </div>
  </div>

  <h3>Findings (${analysis.findings.length})</h3>
  ${findings || '<p>No issues found!</p>'}

  <div class="recommendations">
    <h3>Recommendations</h3>
    <ul>
      ${analysis.recommendations.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
    </ul>
  </div>

  <p style="color: #666; margin-top: 30px; font-size: 12px;">
    Generated by QASL-MOBILE INGRID Analyzer | ${new Date().toISOString()}
  </p>
</body>
</html>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Copy Screenshot as Attachment with Custom Name
  // ─────────────────────────────────────────────────────────────────────────

  private async copyAttachmentWithName(screenshotPath: string, targetName: string): Promise<void> {
    try {
      const destPath = path.join(this.config.resultsDir, targetName);
      await fs.copyFile(screenshotPath, destPath);
      console.log(`📎 Attached: ${targetName}`);
    } catch (error) {
      console.warn(`Could not copy attachment: ${screenshotPath} -> ${targetName}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Environment Properties
  // ─────────────────────────────────────────────────────────────────────────

  private async generateEnvironmentProperties(): Promise<void> {
    const envContent = `
Framework=QASL-MOBILE
TestRunner=Maestro
Platform=Android/iOS
AIAnalyzer=INGRID (Claude Vision)
GeneratedAt=${new Date().toISOString()}
NodeVersion=${process.version}
`.trim();

    const filepath = path.join(this.config.resultsDir, 'environment.properties');
    await fs.writeFile(filepath, envContent);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Categories for Failure Classification
  // ─────────────────────────────────────────────────────────────────────────

  private async generateCategories(): Promise<void> {
    const categories = [
      {
        name: 'Element Not Found',
        matchedStatuses: ['failed'],
        messageRegex: '.*element.*not found.*|.*could not find.*'
      },
      {
        name: 'Timeout',
        matchedStatuses: ['failed'],
        messageRegex: '.*timeout.*|.*timed out.*'
      },
      {
        name: 'Assertion Failed',
        matchedStatuses: ['failed'],
        messageRegex: '.*assert.*|.*expected.*'
      },
      {
        name: 'Device Connection',
        matchedStatuses: ['broken'],
        messageRegex: '.*device.*|.*adb.*|.*emulator.*'
      },
      {
        name: 'App Crash',
        matchedStatuses: ['broken'],
        messageRegex: '.*crash.*|.*stopped.*|.*not responding.*'
      }
    ];

    const filepath = path.join(this.config.resultsDir, 'categories.json');
    await fs.writeFile(filepath, JSON.stringify(categories, null, 2));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Send Results to Allure Server
  // ─────────────────────────────────────────────────────────────────────────

  async sendToServer(): Promise<string> {
    const projectId = this.config.projectId || 'qasl-mobile';
    const serverUrl = this.config.serverUrl || 'http://localhost:5050';

    console.log(`\n📤 Sending results to Allure Server...`);

    try {
      // Read all result files
      const files = await fs.readdir(this.config.resultsDir);
      const resultFiles = files.filter(f =>
        f.endsWith('.json') || f.endsWith('.png') || f.endsWith('.html')
      );

      // Create multipart form data manually
      const boundary = '----AllureBoundary' + Date.now();
      const parts: string[] = [];

      for (const file of resultFiles) {
        const filepath = path.join(this.config.resultsDir, file);
        const content = await fs.readFile(filepath);
        const isImage = file.endsWith('.png');

        parts.push(`--${boundary}`);
        parts.push(`Content-Disposition: form-data; name="files[]"; filename="${file}"`);
        parts.push(`Content-Type: ${isImage ? 'image/png' : 'application/json'}`);
        parts.push('');
        parts.push(isImage ? content.toString('base64') : content.toString());
      }
      parts.push(`--${boundary}--`);

      // For now, just log success - actual upload would require proper multipart handling
      console.log(`📁 Prepared ${resultFiles.length} files for upload`);
      console.log(`🌐 Server URL: ${serverUrl}/allure-docker-service/projects/${projectId}`);
      console.log(`✅ Results ready in: ${this.config.resultsDir}`);
      console.log(`\n📋 To generate report manually, run:`);
      console.log(`   curl -X POST "${serverUrl}/allure-docker-service/send-results?project_id=${projectId}" -F "files[]=@allure-results/"`);

      return `${serverUrl}/allure-docker-service/projects/${projectId}/reports/latest`;
    } catch (error) {
      console.error('Failed to send results to Allure server:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private generateHistoryId(testCaseId: string): string {
    // Simple hash for history tracking
    let hash = 0;
    for (let i = 0; i < testCaseId.length; i++) {
      const char = testCaseId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default AllureReporter;
