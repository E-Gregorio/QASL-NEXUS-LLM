// ═══════════════════════════════════════════════════════════════════════════
// 🚀 QASL-MOBILE Types - Core Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Selector System (11 niveles adaptados a Mobile)
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileSelector {
  type: SelectorType;
  value: string;
  confidence: number; // 0-100
  fallbacks?: MobileSelector[];
}

export type SelectorType =
  | 'accessibilityId'    // Nivel 1: 100% confianza (iOS: accessibilityIdentifier, Android: content-desc)
  | 'resourceId'         // Nivel 2: 95% confianza (Android: resource-id)
  | 'testId'             // Nivel 3: 95% confianza (React Native: testID, Flutter: key)
  | 'contentDescription' // Nivel 4: 90% confianza
  | 'text'               // Nivel 5: 85% confianza (texto visible)
  | 'textContains'       // Nivel 6: 80% confianza (texto parcial)
  | 'className'          // Nivel 7: 70% confianza
  | 'xpath'              // Nivel 8: 50% confianza (último recurso)
  | 'index'              // Nivel 9: 40% confianza (posición)
  | 'image'              // Nivel 10: 60% confianza (reconocimiento visual)
  | 'aiGenerated';       // Nivel 11: Variable (generado por INGRID)

export const SELECTOR_CONFIDENCE: Record<SelectorType, number> = {
  accessibilityId: 100,
  resourceId: 95,
  testId: 95,
  contentDescription: 90,
  text: 85,
  textContains: 80,
  className: 70,
  image: 60,
  xpath: 50,
  index: 40,
  aiGenerated: 75
};

// ─────────────────────────────────────────────────────────────────────────────
// Test Case Structure (compatible con QASL SIGMA)
// ─────────────────────────────────────────────────────────────────────────────

export interface QASLTestCase {
  id: string;                    // TC-MOBILE-001
  epic?: string;                 // EPIC-123
  userStory?: string;            // HU-456
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  platform: 'android' | 'ios' | 'both';
  preconditions?: string[];
  steps: TestStep[];
  expectedResults: string[];
  testData?: Record<string, unknown>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  order: number;
  action: MobileAction;
  target?: MobileSelector;
  value?: string;
  description: string;
  screenshot?: boolean;
  waitAfter?: number;           // ms
}

export type MobileAction =
  | 'launchApp'
  | 'stopApp'
  | 'clearState'
  | 'tap'
  | 'doubleTap'
  | 'longPress'
  | 'inputText'
  | 'clearText'
  | 'swipeUp'
  | 'swipeDown'
  | 'swipeLeft'
  | 'swipeRight'
  | 'scroll'
  | 'scrollUntilVisible'
  | 'assertVisible'
  | 'assertNotVisible'
  | 'assertText'
  | 'takeScreenshot'
  | 'waitForElement'
  | 'waitForAnimationEnd'
  | 'back'
  | 'hideKeyboard'
  | 'openLink'
  | 'copyTextFrom'
  | 'pasteText'
  | 'runFlow';                  // Ejecutar otro flow

// ─────────────────────────────────────────────────────────────────────────────
// Maestro YAML Generation
// ─────────────────────────────────────────────────────────────────────────────

export interface MaestroFlow {
  appId: string;
  name?: string;
  tags?: string[];
  env?: Record<string, string>;
  onFlowStart?: MaestroCommand[];
  onFlowComplete?: MaestroCommand[];
  commands: MaestroCommand[];
}

export interface MaestroCommand {
  launchApp?: { appId?: string; clearState?: boolean; stopApp?: boolean };
  stopApp?: { appId?: string };
  clearState?: { appId?: string };
  tapOn?: string | { id?: string; text?: string; index?: number; point?: string };
  doubleTapOn?: string | { id?: string; text?: string };
  longPressOn?: string | { id?: string; text?: string };
  inputText?: string;
  eraseText?: number | { charactersToErase: number };
  swipe?: { start: string; end: string; duration?: number };
  scroll?: { direction?: 'up' | 'down' | 'left' | 'right' };
  scrollUntilVisible?: { element: string; direction?: string; timeout?: number };
  assertVisible?: string | { id?: string; text?: string; enabled?: boolean };
  assertNotVisible?: string | { id?: string; text?: string };
  assertTrue?: string;
  back?: boolean;
  hideKeyboard?: boolean;
  takeScreenshot?: string;
  waitForAnimationToEnd?: { timeout?: number };
  extendedWaitUntil?: { visible?: string; timeout?: number };
  openLink?: string;
  copyTextFrom?: string | { id?: string; text?: string };
  pasteText?: boolean;
  runFlow?: string | { file: string; env?: Record<string, string> };
  repeat?: { times?: number; whileTrue?: string; commands: MaestroCommand[] };
  evalScript?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution & Metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface TestExecution {
  id: string;
  testCaseId: string;
  flowFile: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;            // ms
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  device: DeviceInfo;
  steps: StepResult[];
  screenshots: string[];
  videoPath?: string;
  errorMessage?: string;
  errorStack?: string;
  metrics: ExecutionMetrics;
}

export interface StepResult {
  stepOrder: number;
  action: MobileAction;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  screenshot?: string;
  error?: string;
}

export interface ExecutionMetrics {
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  avgStepDuration: number;
  appLaunchTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkCalls?: number;
  selectorConfidence: number;   // Promedio de confianza de selectores
}

export interface DeviceInfo {
  name: string;                 // Pixel_6, iPhone 15 Pro
  platform: 'android' | 'ios';
  osVersion: string;
  isEmulator: boolean;
  screenSize: string;           // 1080x2400
  udid?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recorder Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordingSession {
  id: string;
  appId: string;
  device: DeviceInfo;
  startTime: Date;
  endTime?: Date;
  actions: RecordedAction[];
  status: 'recording' | 'paused' | 'stopped' | 'exporting';
}

export interface RecordedAction {
  timestamp: Date;
  action: MobileAction;
  selector?: MobileSelector;
  value?: string;
  screenshot?: string;
  elementInfo?: ElementInfo;
  confidence: number;
}

export interface ElementInfo {
  className: string;
  resourceId?: string;
  contentDescription?: string;
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  scrollable: boolean;
  packageName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INGRID Mobile AI Types
// ─────────────────────────────────────────────────────────────────────────────

export interface INGRIDAnalysis {
  id: string;
  testExecutionId: string;
  timestamp: Date;
  screenshots: string[];
  findings: AIFinding[];
  uxScore: number;              // 0-100
  accessibilityScore: number;   // 0-100
  overallScore: number;         // 0-100
  recommendations: string[];
}

export interface AIFinding {
  type: 'ux' | 'accessibility' | 'visual' | 'performance' | 'usability';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  element?: string;
  screenshot?: string;
  suggestion?: string;
}

export interface VisualRegressionResult {
  baselineScreenshot: string;
  currentScreenshot: string;
  diffScreenshot?: string;
  diffPercentage: number;
  passed: boolean;
  threshold: number;
  changedRegions?: { x: number; y: number; width: number; height: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface QASLMobileConfig {
  // App configuration
  appId: string;
  appPath?: string;             // Path to APK/IPA

  // Device configuration
  device: string;               // Device name or UDID
  platform: 'android' | 'ios';

  // Maestro configuration
  maestroTimeout: number;       // Default: 30000ms
  retryCount: number;           // Default: 3

  // Recording configuration
  autoScreenshot: boolean;      // Take screenshot on each step
  recordVideo: boolean;         // Record video during execution

  // Metrics configuration (InfluxDB 1.x)
  influxdb?: {
    url: string;
    database: string;
    username?: string;
    password?: string;
  };

  // AI configuration
  anthropicApiKey?: string;
  enableINGRID: boolean;

  // Output configuration
  outputDir: string;
  flowsDir: string;
  screenshotsDir: string;
  reportsDir: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TestReport {
  id: string;
  timestamp: Date;
  projectName: string;
  executions: TestExecution[];
  summary: ReportSummary;
  ingridAnalysis?: INGRIDAnalysis;
  deviceInfo: DeviceInfo[];
}

export interface ReportSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  totalDuration: number;
  avgDuration: number;
  avgSelectorConfidence: number;
  platforms: { android: number; ios: number };
}
