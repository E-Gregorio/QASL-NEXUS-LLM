// ═══════════════════════════════════════════════════════════════
// INGRID - AI TESTING FRAMEWORK
// Main Entry Point - Export all modules
// ═══════════════════════════════════════════════════════════════

// Core modules
export { ChatbotClient } from './client';
export { Judge } from './judge';
export { MetricsCalculator, pushToPrometheus, saveAndPushMetrics } from './metrics';
export { TestRunner } from './runner';

// Attack library
export {
  ATTACK_LIBRARY,
  Attack,
  getAllAttacks,
  getAttacksByType,
  getAttacksBySeverity,
  getCriticalAttacks,
  getHighSeverityAttacks,
  getQuickTestAttacks,
  getCustomAttacks,
  getDomainAttacks,
  getEscalationPaths,
  getAttackStats,
  loadCustomAttacks,
} from './attacks';

// Types
export type {
  TestCase,
  ChatbotResponse,
  MetricScore,
  EvaluationResult,
  AttackType,
  AttackResult,
  SecurityReport,
  PerformanceResult,
  TestRunReport,
  GrafanaMetric,
  ExpectedValidation,
  CustomAttack,
  EscalationPath,
  CustomAttacksConfig,
} from './types';

// Configuration
export { CONFIG, validateConfig, printConfig } from '../config';
