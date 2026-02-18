// ═══════════════════════════════════════════════════════════════════════════
// 🏃 QASL-MOBILE Runner - Maestro Execution with Metrics
// ═══════════════════════════════════════════════════════════════════════════
// Wrapper sobre Maestro CLI que:
// - Ejecuta tests con retry automático
// - Captura métricas de ejecución
// - Envía datos a InfluxDB
// - Genera reportes
// ═══════════════════════════════════════════════════════════════════════════

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  TestExecution,
  DeviceInfo,
  ExecutionMetrics,
  QASLMobileConfig
} from '../types/index.js';
import { MetricsCollector } from '../metrics/collector.js';

const execAsync = promisify(exec);

export interface RunOptions {
  flowPath: string;
  device?: string;
  retryCount?: number;
  timeout?: number;
  env?: Record<string, string>;
  captureScreenshots?: boolean;
  recordVideo?: boolean;
}

export interface RunResult {
  success: boolean;
  execution: TestExecution;
  output: string;
  error?: string;
}

export class MaestroRunner {
  private config: QASLMobileConfig;
  private metricsCollector?: MetricsCollector;

  constructor(config: QASLMobileConfig) {
    this.config = config;

    if (config.influxdb) {
      this.metricsCollector = new MetricsCollector(config.influxdb);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Run Single Flow
  // ─────────────────────────────────────────────────────────────────────────

  async runFlow(options: RunOptions): Promise<RunResult> {
    const executionId = uuidv4();
    const startTime = new Date();

    const execution: TestExecution = {
      id: executionId,
      testCaseId: this.extractTestCaseId(options.flowPath),
      flowFile: options.flowPath,
      startTime,
      status: 'running',
      device: await this.getDeviceInfo(options.device),
      steps: [],
      screenshots: [],
      metrics: {
        totalSteps: 0,
        passedSteps: 0,
        failedSteps: 0,
        avgStepDuration: 0,
        selectorConfidence: 0
      }
    };

    console.log(`\n🚀 Starting test execution: ${executionId}`);
    console.log(`📱 Device: ${execution.device.name}`);
    console.log(`📄 Flow: ${options.flowPath}\n`);

    // Capture screenshot before test
    const testName = path.basename(options.flowPath, '.yaml');
    const beforeScreenshot = await this.captureTestScreenshots(testName, 'before');
    if (beforeScreenshot) execution.screenshots.push(beforeScreenshot);

    // Start video recording if enabled
    let videoPath: string | null = null;
    let videoProcess: ReturnType<typeof spawn> | null = null;
    if (options.recordVideo || this.config.recordVideo) {
      const videoResult = await this.startVideoRecording(testName);
      videoPath = videoResult.path;
      videoProcess = videoResult.process;
    }

    let attempt = 0;
    const maxRetries = options.retryCount ?? this.config.retryCount ?? 3;
    let lastError = '';
    let output = '';

    while (attempt < maxRetries) {
      attempt++;
      console.log(`⏳ Attempt ${attempt}/${maxRetries}...`);

      try {
        const result = await this.executeMaestro(options);
        output = result.stdout;

        if (result.success) {
          execution.status = 'passed';
          execution.endTime = new Date();
          execution.duration = execution.endTime.getTime() - startTime.getTime();

          // Capture screenshot after successful test
          const afterScreenshot = await this.captureTestScreenshots(testName, 'after');
          if (afterScreenshot) execution.screenshots.push(afterScreenshot);

          console.log(`✅ Test PASSED in ${execution.duration}ms`);
          break;
        } else {
          lastError = result.stderr;
          console.log(`❌ Attempt ${attempt} failed: ${lastError.substring(0, 100)}...`);

          if (attempt < maxRetries) {
            console.log(`🔄 Retrying in 2 seconds...`);
            await this.sleep(2000);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`💥 Error: ${lastError}`);
      }
    }

    if (execution.status !== 'passed') {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - startTime.getTime();
      execution.errorMessage = lastError;

      // Capture screenshot on error
      const errorScreenshot = await this.captureTestScreenshots(testName, 'error');
      if (errorScreenshot) execution.screenshots.push(errorScreenshot);

      console.log(`\n❌ Test FAILED after ${maxRetries} attempts`);
    }

    // Stop video recording if started
    if (videoProcess) {
      const finalVideoPath = await this.stopVideoRecording(videoProcess, videoPath!);
      if (finalVideoPath) {
        execution.videoPath = finalVideoPath;
      }
    }

    // Collect screenshots
    execution.screenshots = await this.collectScreenshots(options.flowPath);

    // Parse metrics from output
    execution.metrics = this.parseMetricsFromOutput(output);

    // Send metrics to InfluxDB
    if (this.metricsCollector) {
      await this.metricsCollector.recordExecution(execution);
    }

    return {
      success: execution.status === 'passed',
      execution,
      output,
      error: lastError || undefined
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Run Multiple Flows
  // ─────────────────────────────────────────────────────────────────────────

  async runFlows(flowPaths: string[], options?: Partial<RunOptions>): Promise<RunResult[]> {
    const results: RunResult[] = [];

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🧪 QASL-MOBILE Test Suite`);
    console.log(`📊 Total flows: ${flowPaths.length}`);
    console.log(`${'═'.repeat(60)}\n`);

    const startTime = Date.now();

    for (let i = 0; i < flowPaths.length; i++) {
      console.log(`\n[${i + 1}/${flowPaths.length}] Running: ${path.basename(flowPaths[i])}`);
      console.log(`${'─'.repeat(40)}`);

      const result = await this.runFlow({
        flowPath: flowPaths[i],
        ...options
      });

      results.push(result);
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESULTS SUMMARY`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`${'═'.repeat(60)}\n`);

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Run All Flows in Directory
  // ─────────────────────────────────────────────────────────────────────────

  async runDirectory(dirPath: string, options?: Partial<RunOptions>): Promise<RunResult[]> {
    const files = await fs.readdir(dirPath);
    const yamlFiles = files
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .filter(f => !f.startsWith('_')) // Ignorar archivos que empiezan con _
      .map(f => path.join(dirPath, f));

    return this.runFlows(yamlFiles, options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Execute Maestro CLI
  // ─────────────────────────────────────────────────────────────────────────

  private async executeMaestro(options: RunOptions): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve) => {
      const args = ['test', options.flowPath];

      // Add device if specified
      if (options.device) {
        args.push('--device', options.device);
      }

      // Add format for parseable output
      args.push('--format', 'junit');

      // Environment variables
      const env = {
        ...process.env,
        ...options.env,
        APP_ID: this.config.appId
      };

      let stdout = '';
      let stderr = '';

      const maestro = spawn('maestro', args, {
        env,
        shell: true,
        timeout: options.timeout ?? this.config.maestroTimeout ?? 300000
      });

      maestro.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text); // Stream output
      });

      maestro.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });

      maestro.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr
        });
      });

      maestro.on('error', (error) => {
        resolve({
          success: false,
          stdout,
          stderr: error.message
        });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Device Info
  // ─────────────────────────────────────────────────────────────────────────

  private async getDeviceInfo(deviceName?: string): Promise<DeviceInfo> {
    try {
      // Get connected devices via ADB
      const { stdout } = await execAsync('adb devices -l');
      const lines = stdout.split('\n').filter(l => l.includes('device') && !l.includes('List'));

      if (lines.length === 0) {
        throw new Error('No devices connected');
      }

      // Parse first device or find specified device
      const deviceLine = deviceName
        ? lines.find(l => l.includes(deviceName))
        : lines[0];

      if (!deviceLine) {
        throw new Error(`Device not found: ${deviceName}`);
      }

      const isEmulator = deviceLine.includes('emulator');
      const modelMatch = deviceLine.match(/model:(\S+)/);
      const model = modelMatch ? modelMatch[1] : 'Unknown';

      // Get Android version
      const { stdout: versionOut } = await execAsync(
        'adb shell getprop ro.build.version.release'
      );

      // Get screen size
      const { stdout: sizeOut } = await execAsync(
        'adb shell wm size'
      );
      const sizeMatch = sizeOut.match(/(\d+x\d+)/);

      return {
        name: model,
        platform: 'android',
        osVersion: versionOut.trim(),
        isEmulator,
        screenSize: sizeMatch ? sizeMatch[1] : 'Unknown'
      };
    } catch {
      // Return default if can't get device info
      return {
        name: deviceName || this.config.device || 'Unknown',
        platform: this.config.platform,
        osVersion: 'Unknown',
        isEmulator: true,
        screenSize: 'Unknown'
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Parse Metrics from Maestro Output
  // ─────────────────────────────────────────────────────────────────────────

  private parseMetricsFromOutput(output: string): ExecutionMetrics {
    // Parse JUnit output or Maestro logs
    const stepMatches = output.match(/Step \d+/g) || [];
    const passedMatches = output.match(/✓|PASSED|passed/g) || [];
    const failedMatches = output.match(/✗|FAILED|failed/g) || [];

    return {
      totalSteps: stepMatches.length || passedMatches.length + failedMatches.length,
      passedSteps: passedMatches.length,
      failedSteps: failedMatches.length,
      avgStepDuration: 0, // Would need more detailed parsing
      selectorConfidence: 85 // Default, would need selector analysis
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Take Screenshot via ADB (guarda en tu proyecto)
  // ─────────────────────────────────────────────────────────────────────────

  async takeScreenshot(name: string): Promise<string> {
    const screenshotsDir = path.join(this.config.screenshotsDir || './screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(screenshotsDir, filename);

    try {
      // Captura screenshot via ADB y guarda directamente en tu proyecto
      await execAsync(`adb exec-out screencap -p > "${filepath}"`);
      console.log(`📸 Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot: ${error}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Take Screenshots Before and After Test
  // ─────────────────────────────────────────────────────────────────────────

  private async captureTestScreenshots(
    testName: string,
    phase: 'before' | 'after' | 'error'
  ): Promise<string | null> {
    try {
      const screenshotName = `${testName}-${phase}`;
      return await this.takeScreenshot(screenshotName);
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Collect Screenshots from Directory
  // ─────────────────────────────────────────────────────────────────────────

  private async collectScreenshots(flowPath: string): Promise<string[]> {
    const screenshotsDir = this.config.screenshotsDir || './screenshots';
    const testName = path.basename(flowPath, '.yaml');

    try {
      const files = await fs.readdir(screenshotsDir);
      return files
        .filter(f => f.startsWith(testName) && (f.endsWith('.png') || f.endsWith('.jpg')))
        .map(f => path.join(screenshotsDir, f));
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: Extract Test Case ID from Flow Path
  // ─────────────────────────────────────────────────────────────────────────

  private extractTestCaseId(flowPath: string): string {
    const fileName = path.basename(flowPath, path.extname(flowPath));
    return fileName.toUpperCase().replace(/-/g, '-');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: Sleep
  // ─────────────────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Start Video Recording via ADB
  // ─────────────────────────────────────────────────────────────────────────

  private async startVideoRecording(testName: string): Promise<{
    path: string;
    process: ReturnType<typeof spawn>;
  }> {
    const videosDir = path.join(this.config.screenshotsDir || './screenshots', 'videos');
    await fs.mkdir(videosDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testName}-${timestamp}.mp4`;
    const devicePath = `/sdcard/${filename}`;
    const localPath = path.join(videosDir, filename);

    console.log(`🎬 Starting video recording: ${filename}`);

    // Start screenrecord on device (max 180 seconds by default)
    const videoProcess = spawn('adb', ['shell', 'screenrecord', '--time-limit', '180', devicePath], {
      shell: true,
      detached: false
    });

    videoProcess.on('error', (error) => {
      console.error(`❌ Video recording error: ${error.message}`);
    });

    // Store paths for later retrieval
    (videoProcess as any).__devicePath = devicePath;
    (videoProcess as any).__localPath = localPath;

    return {
      path: localPath,
      process: videoProcess
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stop Video Recording and Pull from Device
  // ─────────────────────────────────────────────────────────────────────────

  private async stopVideoRecording(
    videoProcess: ReturnType<typeof spawn>,
    localPath: string
  ): Promise<string | null> {
    try {
      const devicePath = (videoProcess as any).__devicePath;

      // Send SIGINT to stop recording gracefully
      if (process.platform === 'win32') {
        // On Windows, kill the process
        spawn('taskkill', ['/pid', String(videoProcess.pid), '/f'], { shell: true });
      } else {
        videoProcess.kill('SIGINT');
      }

      // Wait for recording to finalize
      await this.sleep(2000);

      // Pull video from device
      console.log(`📥 Pulling video from device...`);
      await execAsync(`adb pull "${devicePath}" "${localPath}"`);

      // Clean up device file
      await execAsync(`adb shell rm "${devicePath}"`);

      console.log(`🎬 Video saved: ${localPath}`);
      return localPath;
    } catch (error) {
      console.error(`❌ Failed to stop/pull video: ${error}`);
      return null;
    }
  }
}

export default MaestroRunner;
