// ============================================
// SIGMA-SENTINEL - Configuration Loader
// ============================================
// AGIP - Administración Gubernamental de Ingresos Públicos
// Buenos Aires Ciudad

import dotenv from 'dotenv';
import { GuardianConfig } from './types.js';
import path from 'path';

dotenv.config();

export function loadConfig(): GuardianConfig {
  const requiredEnvVars = ['TARGET_URL', 'ANTHROPIC_API_KEY'];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`❌ Missing required environment variable: ${envVar}`);
    }
  }

  // SIGMA modules: Dashboard + 3 módulos activos
  const watchUrls = process.env.WATCH_URLS?.split(',').map(u => u.trim()) || ['/'];

  return {
    targetUrl: process.env.TARGET_URL!,
    loginUser: process.env.LOGIN_USER,  // No requerido para SIGMA
    loginPass: process.env.LOGIN_PASS,  // No requerido para SIGMA
    watchUrls,
    snapshotDir: process.env.SNAPSHOT_DIR || './snapshots',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    requireVpn: process.env.REQUIRE_VPN === 'true',
    vpnCheckUrl: process.env.VPN_CHECK_URL,
    autoHealEnabled: process.env.AUTO_HEAL_ENABLED === 'true',
    autoHealConfidenceThreshold: parseFloat(process.env.AUTO_HEAL_CONFIDENCE_THRESHOLD || '0.85'),
    verbose: process.env.VERBOSE_LOGGING === 'true',
  };
}

export function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
}

export function getNotificationConfig() {
  return {
    alertEmail: process.env.ALERT_EMAIL || '',
    fromEmail: process.env.FROM_EMAIL || 'sigma-sentinel@agip.gob.ar',
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    teamsWebhook: process.env.TEAMS_WEBHOOK_URL,
  };
}

export function getSnapshotPath(url: string, timestamp: string): string {
  const config = loadConfig();
  const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date(timestamp).toISOString().split('T')[0];
  return path.join(config.snapshotDir, `${dateStr}_${sanitizedUrl}.json`);
}
