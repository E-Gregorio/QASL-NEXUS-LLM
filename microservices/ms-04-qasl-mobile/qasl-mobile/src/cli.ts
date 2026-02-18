#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// 🚀 QASL-MOBILE CLI - Command Line Interface
// ═══════════════════════════════════════════════════════════════════════════
// Usage:
//   qasl-mobile record     - Start recording session
//   qasl-mobile generate   - Generate YAML from test cases
//   qasl-mobile run        - Run Maestro tests with metrics
//   qasl-mobile analyze    - Run INGRID AI analysis
//   qasl-mobile doctor     - Check environment setup
// ═══════════════════════════════════════════════════════════════════════════

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { config } from 'dotenv';
import { MobileRecorder } from './recorder/mobile-recorder.js';
import { YAMLGenerator } from './generator/yaml-generator.js';
import { MaestroRunner } from './runner/maestro-runner.js';
import { INGRIDMobileAnalyzer } from './ingrid/mobile-analyzer.js';
import { AllureReporter } from './reporters/allure-reporter.js';
import { ScreenStreamer } from './streaming/screen-streamer.js';
import { QASLMobileConfig } from './types/index.js';

// Load environment variables
config();

const program = new Command();

// ─────────────────────────────────────────────────────────────────────────────
// CLI Header
// ─────────────────────────────────────────────────────────────────────────────

function printHeader(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ██████╗  █████╗ ███████╗██╗         ███╗   ███╗ ██████╗ ██████╗        ║
║  ██╔═══██╗██╔══██╗██╔════╝██║         ████╗ ████║██╔═══██╗██╔══██╗       ║
║  ██║   ██║███████║███████╗██║         ██╔████╔██║██║   ██║██████╔╝       ║
║  ██║▄▄ ██║██╔══██║╚════██║██║         ██║╚██╔╝██║██║   ██║██╔══██╗       ║
║  ╚██████╔╝██║  ██║███████║███████╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝       ║
║   ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝        ║
║                                                                           ║
║   Shift-Left Mobile Testing with AI Validation                           ║
║   v1.0.0 | By Elyer Maldonado                                            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `));
}

// ─────────────────────────────────────────────────────────────────────────────
// Load Configuration
// ─────────────────────────────────────────────────────────────────────────────

async function loadConfig(): Promise<QASLMobileConfig> {
  const configPath = path.join(process.cwd(), 'qasl-mobile.config.json');

  let fileConfig = {};
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    fileConfig = JSON.parse(content);
  } catch {
    // Config file not found, use defaults
  }

  return {
    appId: process.env.APP_PACKAGE || '',
    appPath: process.env.APP_APK_PATH,
    device: process.env.MAESTRO_DEVICE || 'Pixel_6',
    platform: 'android',
    maestroTimeout: parseInt(process.env.MAESTRO_TIMEOUT || '30000'),
    retryCount: 3,
    autoScreenshot: true,
    recordVideo: false,
    influxdb: process.env.INFLUXDB_URL ? {
      url: process.env.INFLUXDB_URL,
      database: process.env.INFLUXDB_DATABASE || 'qasl_mobile',
      username: process.env.INFLUXDB_USERNAME,
      password: process.env.INFLUXDB_PASSWORD
    } : undefined,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    enableINGRID: !!process.env.ANTHROPIC_API_KEY,
    outputDir: './output',
    flowsDir: './flows',
    screenshotsDir: './screenshots',
    reportsDir: './reports',
    ...fileConfig
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Command - Check Environment
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('doctor')
  .description('Check if your environment is properly configured')
  .action(async () => {
    printHeader();
    console.log(chalk.yellow('\n🩺 Running environment diagnostics...\n'));

    const checks = [
      { name: 'Maestro CLI', cmd: 'maestro --version' },
      { name: 'ADB', cmd: 'adb version' },
      { name: 'Android Emulator', cmd: 'emulator -list-avds' },
      { name: 'Java', cmd: 'java -version' },
      { name: 'Node.js', cmd: 'node --version' }
    ];

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    for (const check of checks) {
      const spinner = ora(`Checking ${check.name}...`).start();
      try {
        const { stdout } = await execAsync(check.cmd);
        const version = stdout.split('\n')[0].trim();
        spinner.succeed(`${check.name}: ${chalk.green(version)}`);
      } catch {
        spinner.fail(`${check.name}: ${chalk.red('Not found')}`);
      }
    }

    // Check for connected devices
    console.log('');
    const deviceSpinner = ora('Checking connected devices...').start();
    try {
      const { stdout } = await execAsync('adb devices');
      const devices = stdout.split('\n')
        .filter(l => l.includes('device') && !l.includes('List'))
        .map(l => l.split('\t')[0]);

      if (devices.length > 0) {
        deviceSpinner.succeed(`Connected devices: ${chalk.green(devices.join(', '))}`);
      } else {
        deviceSpinner.warn('No devices connected. Start an emulator or connect a device.');
      }
    } catch {
      deviceSpinner.fail('Could not check devices');
    }

    // Check environment variables
    console.log(chalk.yellow('\n📋 Environment Variables:\n'));
    const envVars = [
      { name: 'APP_PACKAGE', value: process.env.APP_PACKAGE },
      { name: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set' },
      { name: 'INFLUXDB_URL', value: process.env.INFLUXDB_URL },
      { name: 'MAESTRO_DEVICE', value: process.env.MAESTRO_DEVICE }
    ];

    for (const env of envVars) {
      const status = env.value ? chalk.green(env.value) : chalk.gray('Not configured');
      console.log(`   ${env.name}: ${status}`);
    }

    console.log(chalk.cyan('\n✅ Doctor check complete!\n'));
  });

// ─────────────────────────────────────────────────────────────────────────────
// Record Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('record')
  .description('Start recording mobile interactions')
  .option('-a, --app <appId>', 'Application package ID')
  .option('-d, --device <device>', 'Device name or ID')
  .option('-o, --output <dir>', 'Output directory', './flows')
  .action(async (options) => {
    printHeader();

    const config = await loadConfig();
    const appId = options.app || config.appId;

    if (!appId) {
      console.error(chalk.red('Error: App ID is required. Use --app or set APP_PACKAGE env var.'));
      process.exit(1);
    }

    const recorder = new MobileRecorder({
      appId,
      device: options.device || config.device,
      outputDir: options.output
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n⏹️  Stopping recording...'));
      try {
        const yamlPath = await recorder.stopRecording();
        console.log(chalk.green(`\n✅ Flow saved to: ${yamlPath}`));
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
      process.exit(0);
    });

    try {
      await recorder.startRecording();
    } catch (error) {
      console.error(chalk.red('Recording failed:'), error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Generate Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('generate')
  .description('Generate Maestro YAML from QASL test cases')
  .option('-i, --input <file>', 'Input test cases JSON file')
  .option('-o, --output <dir>', 'Output directory for YAML files', './flows')
  .action(async (options) => {
    printHeader();

    if (!options.input) {
      console.error(chalk.red('Error: Input file is required. Use --input'));
      process.exit(1);
    }

    const spinner = ora('Generating Maestro flows...').start();

    try {
      const generator = new YAMLGenerator(options.output);
      const testCases = await generator.importFromJSON(options.input);

      spinner.text = `Processing ${testCases.length} test cases...`;

      const files = await generator.generateFromTestCases(testCases);

      spinner.succeed(`Generated ${files.length} Maestro flows`);

      console.log(chalk.cyan('\n📄 Generated files:'));
      for (const file of files) {
        console.log(`   ${chalk.green('✓')} ${file}`);
      }
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Run Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('run')
  .description('Run Maestro tests with metrics collection')
  .option('-f, --flow <path>', 'Flow file or directory to run')
  .option('-d, --device <device>', 'Device name or ID')
  .option('-r, --retries <count>', 'Number of retries on failure', '3')
  .option('--no-metrics', 'Disable metrics collection')
  .action(async (options) => {
    printHeader();

    const config = await loadConfig();

    if (!options.flow) {
      console.error(chalk.red('Error: Flow path is required. Use --flow'));
      process.exit(1);
    }

    const runner = new MaestroRunner({
      ...config,
      device: options.device || config.device,
      retryCount: parseInt(options.retries),
      influxdb: options.metrics ? config.influxdb : undefined
    });

    try {
      const stats = await fs.stat(options.flow);

      if (stats.isDirectory()) {
        await runner.runDirectory(options.flow);
      } else {
        await runner.runFlow({ flowPath: options.flow });
      }
    } catch (error) {
      console.error(chalk.red('Run failed:'), error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Command (INGRID)
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('analyze')
  .description('Run INGRID AI analysis on screenshots')
  .option('-s, --screenshots <dir>', 'Screenshots directory')
  .option('-b, --baseline <dir>', 'Baseline screenshots for visual regression')
  .option('-t, --threshold <percent>', 'Visual diff threshold', '5')
  .action(async (options) => {
    printHeader();

    const config = await loadConfig();

    if (!config.anthropicApiKey) {
      console.error(chalk.red('Error: ANTHROPIC_API_KEY is required for INGRID analysis'));
      process.exit(1);
    }

    if (!options.screenshots) {
      console.error(chalk.red('Error: Screenshots directory is required. Use --screenshots'));
      process.exit(1);
    }

    const analyzer = new INGRIDMobileAnalyzer({
      apiKey: config.anthropicApiKey
    });

    const spinner = ora('Running INGRID AI analysis...').start();

    try {
      const files = await fs.readdir(options.screenshots);
      const screenshots = files
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
        .map(f => path.join(options.screenshots, f));

      spinner.text = `Analyzing ${screenshots.length} screenshots...`;

      let totalScore = 0;
      const results = [];

      for (const screenshot of screenshots) {
        const result = await analyzer.quickCheck(screenshot);
        totalScore += result.score;
        results.push({ file: path.basename(screenshot), ...result });
      }

      spinner.succeed('Analysis complete');

      console.log(chalk.cyan('\n📊 INGRID Analysis Results:\n'));

      for (const result of results) {
        const status = result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
        const score = result.score >= 80
          ? chalk.green(result.score + '%')
          : result.score >= 60
            ? chalk.yellow(result.score + '%')
            : chalk.red(result.score + '%');

        console.log(`   ${status} ${result.file} - Score: ${score}`);

        if (result.criticalIssues.length > 0) {
          for (const issue of result.criticalIssues) {
            console.log(chalk.red(`      ⚠️  ${issue}`));
          }
        }
      }

      const avgScore = totalScore / screenshots.length;
      console.log(chalk.cyan(`\n📈 Average Score: ${avgScore.toFixed(1)}%\n`));

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Report Command - Generate Allure Reports
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('report')
  .description('Generate and publish Allure reports from test results')
  .option('-f, --flow <path>', 'Flow file or directory to run and report')
  .option('-o, --output <dir>', 'Allure results output directory', './allure-results')
  .option('-s, --server <url>', 'Allure server URL', 'http://localhost:5050')
  .option('-p, --project <id>', 'Allure project ID', 'qasl-mobile')
  .option('--with-ingrid', 'Include INGRID AI analysis in report')
  .option('--send', 'Send results to Allure server')
  .action(async (options) => {
    printHeader();

    const config = await loadConfig();

    if (!options.flow) {
      console.error(chalk.red('Error: Flow path is required. Use --flow'));
      process.exit(1);
    }

    const runner = new MaestroRunner(config);
    const reporter = new AllureReporter({
      resultsDir: options.output,
      projectId: options.project,
      serverUrl: options.server
    });

    console.log(chalk.cyan('\n📊 QASL-MOBILE Report Generator\n'));

    try {
      // Run tests
      const spinner = ora('Running tests...').start();
      const stats = await fs.stat(options.flow);
      let results;

      if (stats.isDirectory()) {
        results = await runner.runDirectory(options.flow);
      } else {
        const result = await runner.runFlow({ flowPath: options.flow });
        results = [result];
      }

      spinner.succeed(`Tests completed: ${results.filter(r => r.success).length}/${results.length} passed`);

      // Generate Allure results
      const reportSpinner = ora('Generating Allure results...').start();
      const executions = results.map(r => r.execution);
      await reporter.generateResults(executions);
      reportSpinner.succeed('Allure results generated');

      // Run INGRID analysis if requested
      if (options.withIngrid && config.anthropicApiKey) {
        const ingridSpinner = ora('Running INGRID AI analysis...').start();
        const analyzer = new INGRIDMobileAnalyzer({ apiKey: config.anthropicApiKey });

        for (const execution of executions) {
          if (execution.screenshots.length > 0) {
            const analysis = await analyzer.analyzeExecution(execution);
            await reporter.addINGRIDAnalysis(execution.id, analysis);
          }
        }
        ingridSpinner.succeed('INGRID analysis added to report');
      }

      // Send to server if requested
      if (options.send) {
        const sendSpinner = ora('Sending to Allure server...').start();
        const reportUrl = await reporter.sendToServer();
        sendSpinner.succeed('Results sent to Allure server');
        console.log(chalk.cyan(`\n🔗 View report at: ${reportUrl}\n`));
      } else {
        console.log(chalk.yellow('\n💡 To view report locally, run:'));
        console.log(`   allure serve ${options.output}\n`);
        console.log(chalk.yellow('💡 To send to Allure server, add --send flag\n'));
      }

      // Summary
      const passed = results.filter(r => r.success).length;
      const failed = results.length - passed;
      const passRate = ((passed / results.length) * 100).toFixed(1);

      console.log(chalk.cyan('═'.repeat(60)));
      console.log(chalk.cyan('📊 REPORT SUMMARY'));
      console.log(chalk.cyan('═'.repeat(60)));
      console.log(`   Total Tests:  ${results.length}`);
      console.log(`   ${chalk.green('✓ Passed:')}     ${passed}`);
      console.log(`   ${chalk.red('✗ Failed:')}     ${failed}`);
      console.log(`   Pass Rate:    ${passRate}%`);
      console.log(`   Results Dir:  ${options.output}`);
      console.log(chalk.cyan('═'.repeat(60) + '\n'));

    } catch (error) {
      console.error(chalk.red('Report generation failed:'), error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Stream Command - Real-time device screen streaming
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('stream')
  .description('Start real-time device screen streaming for Grafana')
  .option('-p, --port <port>', 'Server port', '8765')
  .option('--fps <fps>', 'Frames per second', '15')
  .option('--quality <quality>', 'Image quality (1-100)', '80')
  .option('--width <width>', 'Stream width', '360')
  .option('--height <height>', 'Stream height', '640')
  .action(async (options) => {
    printHeader();

    console.log(chalk.cyan('\n📺 Starting QASL-MOBILE Screen Streamer...\n'));

    const streamer = new ScreenStreamer({
      port: parseInt(options.port),
      fps: parseInt(options.fps),
      quality: parseInt(options.quality),
      width: parseInt(options.width),
      height: parseInt(options.height)
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n⏹️  Stopping streamer...'));
      await streamer.stop();
      process.exit(0);
    });

    try {
      await streamer.start();
      console.log(chalk.green('✅ Streamer is running. Press Ctrl+C to stop.\n'));
      console.log(chalk.cyan('📊 For Grafana, add a Text panel with HTML mode:'));
      console.log(chalk.gray(`   <iframe src="http://localhost:${options.port}/stream" width="380" height="680" frameborder="0"></iframe>\n`));
    } catch (error) {
      console.error(chalk.red('Stream failed:'), error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Init Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize QASL-MOBILE in current directory')
  .action(async () => {
    printHeader();

    const spinner = ora('Initializing QASL-MOBILE...').start();

    try {
      // Create directories
      const dirs = ['flows', 'screenshots', 'reports', 'test-cases'];
      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      // Create example config
      const exampleConfig = {
        appId: 'com.example.app',
        device: 'Pixel_6',
        platform: 'android',
        maestroTimeout: 30000,
        retryCount: 3,
        autoScreenshot: true,
        enableINGRID: true,
        outputDir: './output',
        flowsDir: './flows',
        screenshotsDir: './screenshots',
        reportsDir: './reports'
      };

      await fs.writeFile(
        'qasl-mobile.config.json',
        JSON.stringify(exampleConfig, null, 2)
      );

      // Create example test case
      const exampleTestCase = {
        testCases: [
          {
            id: 'TC-MOBILE-001',
            epic: 'EPIC-001',
            userStory: 'HU-001',
            title: 'Login with valid credentials',
            priority: 'high',
            platform: 'both',
            steps: [
              { order: 1, action: 'launchApp', description: 'Launch the application' },
              { order: 2, action: 'tap', description: 'Tap on email field', value: 'Email' },
              { order: 3, action: 'inputText', description: 'Enter email', value: 'test@example.com' },
              { order: 4, action: 'tap', description: 'Tap on password field', value: 'Password' },
              { order: 5, action: 'inputText', description: 'Enter password', value: 'password123' },
              { order: 6, action: 'tap', description: 'Tap login button', value: 'Login' }
            ],
            expectedResults: ['Welcome message is displayed', 'User is on home screen'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };

      await fs.writeFile(
        'test-cases/example.json',
        JSON.stringify(exampleTestCase, null, 2)
      );

      // Create .env.example
      await fs.copyFile(
        path.join(__dirname, '..', '.env.example'),
        '.env.example'
      ).catch(() => {
        // If source doesn't exist, create basic .env.example
        return fs.writeFile('.env.example', `# QASL-MOBILE Configuration
APP_PACKAGE=com.example.app
ANTHROPIC_API_KEY=sk-ant-xxxxx
MAESTRO_DEVICE=Pixel_6
`);
      });

      spinner.succeed('QASL-MOBILE initialized successfully');

      console.log(chalk.cyan('\n📁 Created structure:'));
      console.log('   flows/              - Maestro YAML flows');
      console.log('   screenshots/        - Test screenshots');
      console.log('   reports/            - Test reports');
      console.log('   test-cases/         - QASL test cases');
      console.log('   qasl-mobile.config.json');
      console.log('   .env.example');

      console.log(chalk.yellow('\n📝 Next steps:'));
      console.log('   1. Copy .env.example to .env and configure');
      console.log('   2. Update qasl-mobile.config.json with your app ID');
      console.log('   3. Run: qasl-mobile doctor');
      console.log('   4. Run: qasl-mobile record --app com.your.app\n');

    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(error);
      process.exit(1);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

program
  .name('qasl-mobile')
  .description('QASL-MOBILE: Shift-Left Mobile Testing with AI Validation')
  .version('1.0.0');

program.parse();
