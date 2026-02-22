// Core
export { SelectorEngine } from './core/selector-engine.js';

// Types
export * from './types/index.js';

// Recorder
export { MobileRecorder } from './recorder/mobile-recorder.js';
export type { RecorderConfig } from './recorder/mobile-recorder.js';

// Generator
export { YAMLGenerator } from './generator/yaml-generator.js';

// Runner
export { MaestroRunner } from './runner/maestro-runner.js';
export type { RunOptions, RunResult } from './runner/maestro-runner.js';

// Metrics
export { MetricsCollector } from './metrics/collector.js';
export type { InfluxConfig } from './metrics/collector.js';

// INGRID Mobile
export { INGRIDMobileAnalyzer } from './ingrid/mobile-analyzer.js';
export type { INGRIDConfig } from './ingrid/mobile-analyzer.js';

// ─────────────────────────────────────────────────────────────────────────────
// Quick Start Functions
// ─────────────────────────────────────────────────────────────────────────────

import { MobileRecorder } from './recorder/mobile-recorder.js';
import { YAMLGenerator } from './generator/yaml-generator.js';
import { MaestroRunner } from './runner/maestro-runner.js';
import { INGRIDMobileAnalyzer } from './ingrid/mobile-analyzer.js';
import { QASLMobileConfig, QASLTestCase } from './types/index.js';

export function createQASLMobile(config: QASLMobileConfig) {
  return {
    recorder: new MobileRecorder({
      appId: config.appId,
      outputDir: config.flowsDir,
      device: config.device
    }),

    generator: new YAMLGenerator(config.flowsDir),

    runner: new MaestroRunner(config),

    ingrid: config.anthropicApiKey
      ? new INGRIDMobileAnalyzer({ apiKey: config.anthropicApiKey })
      : null,

    // Quick methods
    async record() {
      const recorder = new MobileRecorder({
        appId: config.appId,
        outputDir: config.flowsDir,
        device: config.device
      });
      return recorder.startRecording();
    },

    async generate(testCases: QASLTestCase[]) {
      const generator = new YAMLGenerator(config.flowsDir);
      return generator.generateFromTestCases(testCases);
    },

    async run(flowPath: string) {
      const runner = new MaestroRunner(config);
      return runner.runFlow({ flowPath });
    },

    async runAll() {
      const runner = new MaestroRunner(config);
      return runner.runDirectory(config.flowsDir);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Version Info
// ─────────────────────────────────────────────────────────────────────────────

export const VERSION = '1.0.0';
export const AUTHOR = 'Elyer Maldonado';
export const DESCRIPTION = 'Shift-Left Mobile Testing with AI Validation';
