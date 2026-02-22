// ============================================
// QASL-SENTINEL - Type Definitions
// ============================================

export interface GuardianConfig {
  targetUrl: string;
  loginUser?: string;
  loginPass?: string;
  watchUrls: string[];
  snapshotDir: string;
  anthropicApiKey: string;
  claudeModel: string;
  requireVpn: boolean;
  vpnCheckUrl?: string;
  autoHealEnabled: boolean;
  autoHealConfidenceThreshold: number;
  verbose: boolean;
}

export interface PageSnapshot {
  url: string;
  timestamp: string;
  html: string;
  dom: DOMElement[];
  interactive: InteractiveElement[];
  api?: APICall[];
  metadata: SnapshotMetadata;
}

export interface DOMElement {
  tag: string;
  id?: string;
  class?: string;
  attributes: Record<string, string>;
  text?: string;
  xpath: string;
  cssPath: string;
}

export interface InteractiveElement {
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio';
  locator: string;
  label?: string;
  placeholder?: string;
  value?: string;
  visible: boolean;
  enabled: boolean;
}

export interface APICall {
  method: string;
  url: string;
  status: number;
  timestamp: string;
}

export interface SnapshotMetadata {
  userAgent: string;
  viewport: { width: number; height: number };
  cookies?: any[];
  localStorage?: Record<string, string>;
}

export interface ChangeDetection {
  url: string;
  changeType: 'added' | 'removed' | 'modified';
  severity: 'critical' | 'high' | 'medium' | 'low';
  element: DOMElement;
  oldValue?: string;
  newValue?: string;
  affectedLocators: string[];
  description: string;
}

export interface AIAnalysis {
  summary: string;
  impactedTests: ImpactedTest[];
  recommendations: string[];
  autoHealSuggestions: AutoHealSuggestion[];
  confidence: number;
  reasoning: string;
}

export interface ImpactedTest {
  testFile: string;
  testName: string;
  lineNumber: number;
  locator: string;
  failureProbability: number;
  reason: string;
}

export interface AutoHealSuggestion {
  locator: string;
  currentValue: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
  autoApplicable: boolean;
}

export interface GuardianReport {
  timestamp: string;
  environment: string;
  status: 'stable' | 'changes-detected' | 'critical' | 'error';
  changesCount: number;
  changes: ChangeDetection[];
  aiAnalysis?: AIAnalysis;
  snapshotPaths: {
    previous: string;
    current: string;
  };
  executionTime: number;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

export interface VPNStatus {
  connected: boolean;
  checkUrl?: string;
  responseTime?: number;
  error?: string;
}

export interface TestLocator {
  name: string;
  selector: string;
  description?: string;
  page: string;
  type: 'css' | 'xpath' | 'text' | 'role' | 'testId';
}

// ============================================
// SECURITY TYPES - OWASP ZAP Integration
// ============================================

export interface ZapAlert {
  name: string;
  risk: 'High' | 'Medium' | 'Low' | 'Informational';
  riskCode: number;
  confidence: string;
  description: string;
  solution: string;
  reference: string;
  instances: number;
  cweid: string;
  wascid: string;
}

export interface ZapScanResult {
  timestamp: string;
  targetUrl: string;
  alerts: ZapAlert[];
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  scanDuration: number;
  htmlReportPath: string;
  jsonReportPath: string;
}

export interface SecurityReport {
  enabled: boolean;
  timestamp: string;
  targetUrl: string;
  scanResult: ZapScanResult | null;
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  topAlerts: ZapAlert[];
  htmlReportPath: string;
  regressions: ZapAlert[];
  resolved: ZapAlert[];
}

export interface SecurityComparison {
  hasBaseline: boolean;
  regressions: ZapAlert[];
  resolved: ZapAlert[];
  unchanged: ZapAlert[];
  summaryDiff: {
    high: { previous: number; current: number; diff: number };
    medium: { previous: number; current: number; diff: number };
    low: { previous: number; current: number; diff: number };
    informational: { previous: number; current: number; diff: number };
  };
}

export interface GuardianReportWithSecurity extends GuardianReport {
  securityReport?: SecurityReport;
  securityComparison?: SecurityComparison;
  securityStatus?: 'improved' | 'stable' | 'degraded' | 'critical';
}
