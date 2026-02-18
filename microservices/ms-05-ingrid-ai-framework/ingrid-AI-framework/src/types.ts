// ═══════════════════════════════════════════════════════════════
// INGRID - AI TESTING FRAMEWORK
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// TEST CASE STRUCTURE
// ───────────────────────────────────────────────────────────────
export interface TestCase {
  id: string;
  name: string;
  category: 'functional' | 'security' | 'performance';
  prompt: string;
  expectedResponse?: string;
  keywords?: string[];
  forbiddenWords?: string[];
  maxResponseTime?: number;
  metadata?: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────
// EXPECTED RESPONSE VALIDATION (from expected.json)
// ───────────────────────────────────────────────────────────────
export interface ExpectedValidation {
  mustContain?: string[];
  mustNotContain?: string[];
  mustContainAny?: string[];
  pattern?: string;
  tone?: string;
  structure?: 'list' | 'sequential' | 'paragraph';
  minLength?: number;
  maxLength?: number;
}

// ───────────────────────────────────────────────────────────────
// CHATBOT INTERACTION
// ───────────────────────────────────────────────────────────────
export interface ChatbotResponse {
  prompt: string;
  response: string;
  responseTime: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// ───────────────────────────────────────────────────────────────
// EVALUATION METRICS
// ───────────────────────────────────────────────────────────────
export interface MetricScore {
  name: string;
  score: number;        // 0-10
  passed: boolean;
  reasoning: string;
}

export interface EvaluationResult {
  testCaseId: string;
  prompt: string;
  response: string;
  expectedResponse?: string;
  metrics: {
    relevance: MetricScore;
    accuracy: MetricScore;
    coherence: MetricScore;
    completeness: MetricScore;
    hallucination: MetricScore;
  };
  overallScore: number;
  passed: boolean;
  evaluatedAt: Date;
}

// ───────────────────────────────────────────────────────────────
// SECURITY ATTACK RESULTS
// ───────────────────────────────────────────────────────────────
export type AttackType =
  // OWASP LLM Top 10 2025
  | 'prompt_injection'      // LLM01
  | 'xss_injection'         // LLM02
  | 'bias_detection'        // LLM03
  | 'dos_attack'            // LLM04
  | 'supply_chain'          // LLM05
  | 'system_prompt_leak'    // LLM06
  | 'command_injection'     // LLM07
  | 'excessive_agency'      // LLM08
  | 'hallucination'         // LLM09
  | 'model_extraction'      // LLM10
  // Legacy types
  | 'jailbreak'
  | 'pii_leak'
  | 'toxicity'
  | 'bias'
  // Advanced security
  | 'fuzzing'
  | 'rate_limit_test';

export interface AttackResult {
  attackType: AttackType;
  attackPrompt: string;
  response: string;
  vulnerable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence?: string;
  recommendation?: string;
}

export interface SecurityReport {
  totalAttacks: number;
  vulnerabilitiesFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  results: AttackResult[];
  passedSecurityCheck: boolean;
}

// ───────────────────────────────────────────────────────────────
// PERFORMANCE METRICS
// ───────────────────────────────────────────────────────────────
export interface PerformanceResult {
  testCaseId: string;
  responseTime: number;
  tokensGenerated?: number;
  tokensPerSecond?: number;
  withinThreshold: boolean;
}

// ───────────────────────────────────────────────────────────────
// FINAL REPORT
// ───────────────────────────────────────────────────────────────
export interface TestRunReport {
  runId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  projectName: string;
  chatbotUrl: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  functional: EvaluationResult[];
  security: SecurityReport;
  performance: PerformanceResult[];
}

// ───────────────────────────────────────────────────────────────
// GRAFANA METRICS
// ───────────────────────────────────────────────────────────────
export interface GrafanaMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

// ───────────────────────────────────────────────────────────────
// CUSTOM ATTACK (from attacks.json)
// ───────────────────────────────────────────────────────────────
export interface CustomAttack {
  id: string;
  type: AttackType;
  name: string;
  prompt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

export interface EscalationPath {
  id: string;
  name: string;
  steps: string[];
  notes?: string;
}

export interface CustomAttacksConfig {
  custom_attacks: CustomAttack[];
  domain_specific: Record<string, CustomAttack[]>;
  escalation_paths: EscalationPath[];
}
