// ═══════════════════════════════════════════════════════════════════════════
// 🎬 QASL-MOBILE Recorder - Visual Recording with Smart Selectors
// ═══════════════════════════════════════════════════════════════════════════
// Graba interacciones en dispositivos Android via ADB
// Genera YAML de Maestro con selectores inteligentes (11 niveles)
// Adaptado del UNIVERSAL RECORDER PRO v5.0
// ═══════════════════════════════════════════════════════════════════════════

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  RecordingSession,
  RecordedAction,
  ElementInfo,
  MobileAction,
  MobileSelector
} from '../types/index.js';
import { SelectorEngine } from '../core/selector-engine.js';

const execAsync = promisify(exec);

export interface RecorderConfig {
  device?: string;
  outputDir: string;
  appId: string;
  autoScreenshot?: boolean;
  debounceMs?: number;
}

export class MobileRecorder {
  private config: RecorderConfig;
  private session: RecordingSession | null = null;
  private isRecording = false;

  constructor(config: RecorderConfig) {
    this.config = {
      autoScreenshot: true,
      debounceMs: 300,
      ...config
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Start Recording Session
  // ─────────────────────────────────────────────────────────────────────────

  async startRecording(): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    const deviceInfo = await this.getDeviceInfo();

    this.session = {
      id: uuidv4(),
      appId: this.config.appId,
      device: deviceInfo,
      startTime: new Date(),
      actions: [],
      status: 'recording'
    };

    this.isRecording = true;

    console.log(`\n${'═'.repeat(60)}`);
    console.log('🎬 QASL-MOBILE RECORDER v1.0');
    console.log(`${'═'.repeat(60)}`);
    console.log(`📱 Device: ${deviceInfo.name}`);
    console.log(`📦 App: ${this.config.appId}`);
    console.log(`🆔 Session: ${this.session.id}`);
    console.log(`${'─'.repeat(60)}`);
    console.log('📍 Recording started. Interact with your app...');
    console.log('💡 Use Ctrl+C to stop recording\n');

    // Start listening to device events
    this.startEventListener();

    return this.session.id;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stop Recording and Export
  // ─────────────────────────────────────────────────────────────────────────

  async stopRecording(): Promise<string> {
    if (!this.isRecording || !this.session) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;
    this.session.status = 'stopped';
    this.session.endTime = new Date();

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`✅ Recording stopped`);
    console.log(`📊 Total actions: ${this.session.actions.length}`);

    // Generate YAML
    const yamlPath = await this.exportToYAML();

    // Calculate selector quality
    const selectors = this.session.actions
      .filter(a => a.selector)
      .map(a => a.selector!);

    const quality = SelectorEngine.calculateSelectorQuality(selectors);

    console.log(`\n📈 Selector Quality Report:`);
    console.log(`   Average Confidence: ${quality.avgConfidence.toFixed(1)}%`);
    console.log(`   Strong Selectors: ${quality.strongSelectors}`);
    console.log(`   Weak Selectors: ${quality.weakSelectors}`);
    console.log(`   ${quality.recommendation}`);
    console.log(`\n📄 YAML exported to: ${yamlPath}`);
    console.log(`${'═'.repeat(60)}\n`);

    return yamlPath;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Record Action (called by event listener or manually)
  // ─────────────────────────────────────────────────────────────────────────

  async recordAction(
    action: MobileAction,
    elementInfo?: ElementInfo,
    value?: string
  ): Promise<void> {
    if (!this.session || !this.isRecording) return;

    // Generate selector from element info
    let selector: MobileSelector | undefined;
    if (elementInfo) {
      selector = SelectorEngine.generateSelector(elementInfo);
    }

    const recordedAction: RecordedAction = {
      timestamp: new Date(),
      action,
      selector,
      value,
      elementInfo,
      confidence: selector?.confidence ?? 0
    };

    // Take screenshot if enabled
    if (this.config.autoScreenshot) {
      try {
        const screenshotPath = await this.takeScreenshot();
        recordedAction.screenshot = screenshotPath;
      } catch {
        // Screenshot failed, continue without it
      }
    }

    this.session.actions.push(recordedAction);

    // Log action
    const selectorInfo = selector
      ? `[${selector.type}: ${selector.value.substring(0, 30)}... | ${selector.confidence}%]`
      : '[no selector]';

    console.log(`  ${this.session.actions.length}. ${action} ${selectorInfo}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get UI Hierarchy from Device
  // ─────────────────────────────────────────────────────────────────────────

  async getUIHierarchy(): Promise<ElementInfo[]> {
    try {
      // Dump UI hierarchy
      await execAsync('adb shell uiautomator dump /sdcard/window_dump.xml');
      const { stdout } = await execAsync('adb shell cat /sdcard/window_dump.xml');

      // Parse XML and extract elements
      return this.parseUIHierarchy(stdout);
    } catch (error) {
      console.error('Failed to get UI hierarchy:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Parse UI Hierarchy XML
  // ─────────────────────────────────────────────────────────────────────────

  private parseUIHierarchy(xml: string): ElementInfo[] {
    const elements: ElementInfo[] = [];

    // Simple regex-based parsing (for production, use proper XML parser)
    const nodeRegex = /<node[^>]*>/g;
    let match;

    while ((match = nodeRegex.exec(xml)) !== null) {
      const node = match[0];

      const getAttr = (name: string): string | undefined => {
        const attrMatch = node.match(new RegExp(`${name}="([^"]*)"`));
        return attrMatch ? attrMatch[1] : undefined;
      };

      const boundsStr = getAttr('bounds');
      let bounds = { x: 0, y: 0, width: 0, height: 0 };

      if (boundsStr) {
        const boundsMatch = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (boundsMatch) {
          bounds = {
            x: parseInt(boundsMatch[1]),
            y: parseInt(boundsMatch[2]),
            width: parseInt(boundsMatch[3]) - parseInt(boundsMatch[1]),
            height: parseInt(boundsMatch[4]) - parseInt(boundsMatch[2])
          };
        }
      }

      elements.push({
        className: getAttr('class') || '',
        resourceId: getAttr('resource-id'),
        contentDescription: getAttr('content-desc'),
        text: getAttr('text'),
        bounds,
        clickable: getAttr('clickable') === 'true',
        enabled: getAttr('enabled') === 'true',
        focused: getAttr('focused') === 'true',
        scrollable: getAttr('scrollable') === 'true',
        packageName: getAttr('package')
      });
    }

    return elements.filter(e => e.clickable || e.text || e.contentDescription);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Find Element at Coordinates
  // ─────────────────────────────────────────────────────────────────────────

  private findElementAtCoordinates(
    elements: ElementInfo[],
    x: number,
    y: number
  ): ElementInfo | undefined {
    // Find smallest element that contains the point
    const candidates = elements.filter(e => {
      return x >= e.bounds.x &&
             x <= e.bounds.x + e.bounds.width &&
             y >= e.bounds.y &&
             y <= e.bounds.y + e.bounds.height;
    });

    if (candidates.length === 0) return undefined;

    // Return smallest (most specific) element
    return candidates.reduce((smallest, current) => {
      const smallestArea = smallest.bounds.width * smallest.bounds.height;
      const currentArea = current.bounds.width * current.bounds.height;
      return currentArea < smallestArea ? current : smallest;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Start Event Listener (via getevent)
  // ─────────────────────────────────────────────────────────────────────────

  private startEventListener(): void {
    // Use ADB to monitor touch events
    const getevent = spawn('adb', ['shell', 'getevent', '-lt'], {
      shell: true
    });

    let lastX = 0;
    let lastY = 0;
    let touchDown = false;

    getevent.stdout.on('data', async (data) => {
      if (!this.isRecording) {
        getevent.kill();
        return;
      }

      const lines = data.toString().split('\n');

      for (const line of lines) {
        // Parse touch events
        if (line.includes('ABS_MT_POSITION_X')) {
          const match = line.match(/ABS_MT_POSITION_X\s+([0-9a-f]+)/);
          if (match) lastX = parseInt(match[1], 16);
        }

        if (line.includes('ABS_MT_POSITION_Y')) {
          const match = line.match(/ABS_MT_POSITION_Y\s+([0-9a-f]+)/);
          if (match) lastY = parseInt(match[1], 16);
        }

        if (line.includes('BTN_TOUCH') && line.includes('DOWN')) {
          touchDown = true;
        }

        if (line.includes('BTN_TOUCH') && line.includes('UP') && touchDown) {
          touchDown = false;

          // Get UI hierarchy and find element
          const elements = await this.getUIHierarchy();
          const element = this.findElementAtCoordinates(elements, lastX, lastY);

          if (element) {
            await this.recordAction('tap', element);
          } else {
            // Record tap by coordinates if no element found
            await this.recordAction('tap', undefined, `${lastX},${lastY}`);
          }
        }
      }
    });

    getevent.stderr.on('data', () => {
      // Silently ignore errors
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Take Screenshot
  // ─────────────────────────────────────────────────────────────────────────

  private async takeScreenshot(): Promise<string> {
    const filename = `screenshot-${Date.now()}.png`;
    const localPath = path.join(this.config.outputDir, 'screenshots', filename);

    await fs.mkdir(path.dirname(localPath), { recursive: true });

    await execAsync(`adb shell screencap /sdcard/${filename}`);
    await execAsync(`adb pull /sdcard/${filename} "${localPath}"`);
    await execAsync(`adb shell rm /sdcard/${filename}`);

    return localPath;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Export to Maestro YAML
  // ─────────────────────────────────────────────────────────────────────────

  private async exportToYAML(): Promise<string> {
    if (!this.session) throw new Error('No session to export');

    const lines: string[] = [
      '# ═══════════════════════════════════════════════════════════════════════════',
      '# 🎬 QASL-MOBILE Recorded Flow',
      '# ═══════════════════════════════════════════════════════════════════════════',
      '#',
      `# Session ID: ${this.session.id}`,
      `# Device: ${this.session.device.name}`,
      `# Recorded: ${this.session.startTime.toISOString()}`,
      `# Actions: ${this.session.actions.length}`,
      '#',
      '# ═══════════════════════════════════════════════════════════════════════════',
      '',
      `appId: ${this.config.appId}`,
      '---',
      ''
    ];

    // Add launch app
    lines.push('- launchApp:');
    lines.push('    clearState: true');
    lines.push('');

    // Convert each action
    for (const action of this.session.actions) {
      const command = this.actionToMaestroCommand(action);
      if (command) {
        lines.push(command);
        lines.push(`  # Confidence: ${action.confidence}%`);
        lines.push('');
      }
    }

    const yamlContent = lines.join('\n');
    const yamlPath = path.join(
      this.config.outputDir,
      `recorded-${this.session.id.substring(0, 8)}.yaml`
    );

    await fs.mkdir(this.config.outputDir, { recursive: true });
    await fs.writeFile(yamlPath, yamlContent, 'utf-8');

    return yamlPath;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convert Recorded Action to Maestro Command
  // ─────────────────────────────────────────────────────────────────────────

  private actionToMaestroCommand(action: RecordedAction): string | null {
    if (!action.selector) {
      // Fallback to coordinates
      if (action.value) {
        return `- tapOn:\n    point: "${action.value}"`;
      }
      return null;
    }

    const selector = SelectorEngine.toMaestroSelector(action.selector);

    switch (action.action) {
      case 'tap':
        if (typeof selector === 'string') {
          return `- tapOn: "${selector}"`;
        } else {
          const lines = ['- tapOn:'];
          for (const [key, value] of Object.entries(selector)) {
            lines.push(`    ${key}: "${value}"`);
          }
          return lines.join('\n');
        }

      case 'longPress':
        return `- longPressOn: "${typeof selector === 'string' ? selector : JSON.stringify(selector)}"`;

      case 'inputText':
        return `- inputText: "${action.value || ''}"`;

      case 'swipeUp':
        return '- scroll:\n    direction: DOWN';

      case 'swipeDown':
        return '- scroll:\n    direction: UP';

      case 'back':
        return '- back';

      default:
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Device Info
  // ─────────────────────────────────────────────────────────────────────────

  private async getDeviceInfo(): Promise<RecordingSession['device']> {
    try {
      const { stdout: model } = await execAsync('adb shell getprop ro.product.model');
      const { stdout: version } = await execAsync('adb shell getprop ro.build.version.release');
      const { stdout: size } = await execAsync('adb shell wm size');

      const sizeMatch = size.match(/(\d+x\d+)/);

      return {
        name: model.trim(),
        platform: 'android',
        osVersion: version.trim(),
        isEmulator: model.toLowerCase().includes('sdk') || model.toLowerCase().includes('emulator'),
        screenSize: sizeMatch ? sizeMatch[1] : 'Unknown'
      };
    } catch {
      return {
        name: 'Unknown Device',
        platform: 'android',
        osVersion: 'Unknown',
        isEmulator: true,
        screenSize: 'Unknown'
      };
    }
  }
}

export default MobileRecorder;
