// ═══════════════════════════════════════════════════════════════════════════
// 🔄 QASL-MOBILE YAML Generator - Test Cases → Maestro YAML
// ═══════════════════════════════════════════════════════════════════════════
// Genera YAML de Maestro automáticamente desde Test Cases QASL
// Incluye trazabilidad Epic → HU → Test Case
// ═══════════════════════════════════════════════════════════════════════════

import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  QASLTestCase,
  TestStep,
  MaestroFlow,
  MaestroCommand
} from '../types/index.js';
import { SelectorEngine } from '../core/selector-engine.js';

export class YAMLGenerator {
  private outputDir: string;

  constructor(outputDir: string = './flows') {
    this.outputDir = outputDir;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Maestro YAML from QASL Test Case
  // ─────────────────────────────────────────────────────────────────────────

  async generateFromTestCase(testCase: QASLTestCase): Promise<string> {
    const flow = this.buildMaestroFlow(testCase);
    const yamlContent = this.flowToYAML(flow, testCase);

    // Guardar archivo
    const fileName = `${testCase.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}.yaml`;
    const filePath = path.join(this.outputDir, fileName);

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(filePath, yamlContent, 'utf-8');

    return filePath;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build Maestro Flow Object
  // ─────────────────────────────────────────────────────────────────────────

  private buildMaestroFlow(testCase: QASLTestCase): MaestroFlow {
    const commands: MaestroCommand[] = [];

    // Agregar comandos de cada step
    for (const step of testCase.steps) {
      const command = this.stepToMaestroCommand(step);
      if (command) {
        commands.push(command);
      }

      // Screenshot automático si está habilitado
      if (step.screenshot) {
        commands.push({
          takeScreenshot: `step-${step.order}-${step.action}`
        });
      }

      // Wait after si está configurado
      if (step.waitAfter) {
        commands.push({
          evalScript: `sleep(${step.waitAfter})`
        });
      }
    }

    // Agregar assertions de expected results
    for (const expected of testCase.expectedResults) {
      commands.push({
        assertVisible: expected
      });
    }

    return {
      appId: '${APP_ID}', // Variable de entorno
      name: testCase.title,
      tags: testCase.tags,
      commands
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convert Test Step to Maestro Command
  // ─────────────────────────────────────────────────────────────────────────

  private stepToMaestroCommand(step: TestStep): MaestroCommand | null {
    const selector = step.target
      ? SelectorEngine.toMaestroSelector(step.target)
      : undefined;

    switch (step.action) {
      case 'launchApp':
        return { launchApp: { clearState: true } };

      case 'stopApp':
        return { stopApp: {} };

      case 'clearState':
        return { clearState: {} };

      case 'tap':
        return { tapOn: selector || step.value || '' };

      case 'doubleTap':
        return { doubleTapOn: selector || step.value || '' };

      case 'longPress':
        return { longPressOn: selector || step.value || '' };

      case 'inputText':
        return { inputText: step.value || '' };

      case 'clearText':
        return { eraseText: 100 }; // Borra hasta 100 caracteres

      case 'swipeUp':
        return { scroll: { direction: 'down' } }; // Scroll down = swipe up

      case 'swipeDown':
        return { scroll: { direction: 'up' } };

      case 'swipeLeft':
        return { swipe: { start: '90%,50%', end: '10%,50%' } };

      case 'swipeRight':
        return { swipe: { start: '10%,50%', end: '90%,50%' } };

      case 'scroll':
        return { scroll: {} };

      case 'scrollUntilVisible':
        return {
          scrollUntilVisible: {
            element: typeof selector === 'string' ? selector : step.value || '',
            direction: 'DOWN',
            timeout: 30000
          }
        };

      case 'assertVisible':
        return { assertVisible: selector || step.value || '' };

      case 'assertNotVisible':
        return { assertNotVisible: selector || step.value || '' };

      case 'assertText':
        return { assertTrue: `${selector} contains "${step.value}"` };

      case 'takeScreenshot':
        return { takeScreenshot: step.value || 'screenshot' };

      case 'waitForElement':
        return {
          extendedWaitUntil: {
            visible: typeof selector === 'string' ? selector : step.value || '',
            timeout: 30000
          }
        };

      case 'waitForAnimationEnd':
        return { waitForAnimationToEnd: { timeout: 5000 } };

      case 'back':
        return { back: true };

      case 'hideKeyboard':
        return { hideKeyboard: true };

      case 'openLink':
        return { openLink: step.value || '' };

      case 'copyTextFrom':
        return { copyTextFrom: selector || step.value || '' };

      case 'pasteText':
        return { pasteText: true };

      case 'runFlow':
        return { runFlow: step.value || '' };

      default:
        console.warn(`Unknown action: ${step.action}`);
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convert Flow to YAML String with Traceability Header
  // ─────────────────────────────────────────────────────────────────────────

  private flowToYAML(flow: MaestroFlow, testCase: QASLTestCase): string {
    const header = this.generateHeader(testCase);
    const yamlBody = yaml.dump(flow, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });

    return header + yamlBody;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Traceability Header
  // ─────────────────────────────────────────────────────────────────────────

  private generateHeader(testCase: QASLTestCase): string {
    const lines = [
      '# ═══════════════════════════════════════════════════════════════════════════',
      `# 🧪 ${testCase.id}: ${testCase.title}`,
      '# ═══════════════════════════════════════════════════════════════════════════',
      '#',
      '# QASL-MOBILE Generated Flow',
      '# DO NOT EDIT MANUALLY - Regenerate from Test Case if changes needed',
      '#',
      `# Epic:        ${testCase.epic || 'N/A'}`,
      `# User Story:  ${testCase.userStory || 'N/A'}`,
      `# Priority:    ${testCase.priority}`,
      `# Platform:    ${testCase.platform}`,
      `# Generated:   ${new Date().toISOString()}`,
      '#',
      '# ═══════════════════════════════════════════════════════════════════════════',
      '',
    ];

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Multiple Flows from Test Cases
  // ─────────────────────────────────────────────────────────────────────────

  async generateFromTestCases(testCases: QASLTestCase[]): Promise<string[]> {
    const generatedFiles: string[] = [];

    for (const testCase of testCases) {
      const filePath = await this.generateFromTestCase(testCase);
      generatedFiles.push(filePath);
      console.log(`Generated: ${filePath}`);
    }

    // Generar archivo índice
    await this.generateIndexFlow(testCases);

    return generatedFiles;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Index Flow (runs all tests)
  // ─────────────────────────────────────────────────────────────────────────

  private async generateIndexFlow(testCases: QASLTestCase[]): Promise<void> {
    const commands: MaestroCommand[] = testCases.map(tc => ({
      runFlow: `./${tc.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}.yaml`
    }));

    const indexContent = [
      '# ═══════════════════════════════════════════════════════════════════════════',
      '# 🚀 QASL-MOBILE Test Suite Index',
      '# ═══════════════════════════════════════════════════════════════════════════',
      '#',
      `# Total Tests: ${testCases.length}`,
      `# Generated: ${new Date().toISOString()}`,
      '#',
      '# ═══════════════════════════════════════════════════════════════════════════',
      '',
      `appId: \${APP_ID}`,
      '',
      ...commands.map(c => `- runFlow: ${(c.runFlow as string)}`)
    ].join('\n');

    const indexPath = path.join(this.outputDir, '_suite.yaml');
    await fs.writeFile(indexPath, indexContent, 'utf-8');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Import Test Cases from JSON File
  // ─────────────────────────────────────────────────────────────────────────

  async importFromJSON(jsonPath: string): Promise<QASLTestCase[]> {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    // Soportar array directo o objeto con propiedad testCases
    return Array.isArray(data) ? data : data.testCases || [];
  }
}

export default YAMLGenerator;
