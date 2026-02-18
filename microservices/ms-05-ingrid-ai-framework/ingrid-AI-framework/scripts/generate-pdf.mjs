#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// INGRID - Professional PDF Report Generator
// VERSION 4.0 - Enterprise Grade AI Security Assessment
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('   INGRID - Professional PDF Report Generator v4.0');
console.log('═══════════════════════════════════════════════════════════════\n');

// Read metrics
const metricsPath = path.join(process.cwd(), 'reports', 'metrics-store.json');

if (!fs.existsSync(metricsPath)) {
  console.log('  ❌ No metrics found.');
  console.log('  Run first: npm run test:gemini or npm run test:openai\n');
  process.exit(1);
}

const evaluations = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
console.log(`  📊 Found ${evaluations.length} evaluations\n`);

if (evaluations.length === 0) {
  console.log('  ❌ No data to generate report.');
  process.exit(1);
}

// Output path - Professional naming
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const dateStr = new Date().toISOString().split('T')[0];
const timestamp = Date.now();

// Detect model being tested
const models = [...new Set(evaluations.map(e => e.model).filter(Boolean))];
const modelNames = {
  'openai': 'OpenAI-ChatGPT',
  'gemini': 'Google-Gemini',
  'claude': 'Anthropic-Claude',
  'chatbot': 'Demo-Chatbot',
};
const testedModel = models.length > 0
  ? models.map(m => modelNames[m] || m).join('-vs-')
  : 'AI-Model';

const testedModelDisplay = models.length > 0
  ? models.map(m => modelNames[m]?.replace('-', ' ') || m).join(' vs ')
  : 'AI Model';

// Professional file name
const outputPath = path.join(reportsDir, `INGRID-AI-Security-Assessment-${testedModel}-${dateStr}.pdf`);

// Colors - Professional palette
const C = {
  primary: '#0d1b2a',
  secondary: '#1b263b',
  accent: '#415a77',
  green: '#2ecc71',
  blue: '#3498db',
  red: '#e74c3c',
  orange: '#f39c12',
  text: '#1a1a2e',
  gray: '#4a4a6a',
  white: '#ffffff',
  light: '#f8f9fa',
  gold: '#d4af37',
};

// Calculate metrics
const total = evaluations.length;
const passed = evaluations.filter(e => e.evaluation.passed).length;
const failed = total - passed;
const passRate = total > 0 ? (passed / total) * 100 : 0;

const functionalTests = evaluations.filter(e => e.category === 'functional');
const securityTests = evaluations.filter(e => e.category === 'security');
const performanceTests = evaluations.filter(e => e.category === 'performance');

const owaspPassed = securityTests.filter(e => e.evaluation.passed).length;
const owaspTotal = securityTests.length;
const owaspScore = owaspTotal > 0 ? Math.round((owaspPassed / owaspTotal) * 10) : 0;

const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const avgRelevance = avg(evaluations.map(e => e.evaluation.relevance));
const avgAccuracy = avg(evaluations.map(e => e.evaluation.accuracy));
const avgCoherence = avg(evaluations.map(e => e.evaluation.coherence));
const avgCompleteness = avg(evaluations.map(e => e.evaluation.completeness));
const avgHallucination = avg(evaluations.map(e => e.evaluation.hallucination));
const avgResponseTime = avg(evaluations.map(e => e.responseTime));
const overallQuality = (avgRelevance + avgAccuracy + avgCoherence + avgCompleteness + (10 - avgHallucination)) / 5;

const vulns = {
  critical: evaluations.filter(e => e.securityResult?.severity === 'critical' && !e.securityResult?.wasBlocked).length,
  high: evaluations.filter(e => e.securityResult?.severity === 'high' && !e.securityResult?.wasBlocked).length,
  medium: evaluations.filter(e => e.securityResult?.severity === 'medium' && !e.securityResult?.wasBlocked).length,
  low: evaluations.filter(e => e.securityResult?.severity === 'low' && !e.securityResult?.wasBlocked).length,
};
const totalVulns = vulns.critical + vulns.high + vulns.medium + vulns.low;

// OWASP categories covered
const owaspCategories = new Set(securityTests.map(t => t.securityResult?.attackType).filter(Boolean));
const owaspCoverage = owaspCategories.size;

// Create PDF
const doc = new PDFDocument({
  size: 'A4',
  bufferPages: true,
  autoFirstPage: false,
  info: {
    Title: `INGRID AI Security Assessment - ${testedModelDisplay}`,
    Author: 'Elyer Maldonado - AI Quality & Risk Architect',
    Subject: 'AI/LLM Security Assessment Report',
    Keywords: 'OWASP, LLM, AI, Security, Testing, INGRID',
    Creator: 'INGRID AI Testing Framework v2.0',
  }
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const W = 595.28;
const H = 841.89;
const M = 40;

// ═══════════════════════════════════════════════════════════════
// PAGE 1: EXECUTIVE COVER
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

// Full header
doc.rect(0, 0, W, 180).fill(C.primary);

// Gold accent line
doc.rect(0, 175, W, 5).fill(C.gold);

// Logo area
doc.rect(W/2 - 60, 30, 120, 4).fill(C.gold);
doc.font('Helvetica-Bold').fontSize(48).fillColor(C.white).text('INGRID', 0, 50, { align: 'center', width: W });
doc.font('Helvetica').fontSize(12).fillColor(C.gold).text('Intelligent Network for Generative Response Inspection & Defense', 0, 100, { align: 'center', width: W });
doc.rect(W/2 - 60, 125, 120, 4).fill(C.gold);

// Document type
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white).text('CONFIDENTIAL SECURITY ASSESSMENT', 0, 145, { align: 'center', width: W });

// Main title section
doc.font('Helvetica-Bold').fontSize(26).fillColor(C.primary).text('AI/LLM Security Assessment', 0, 210, { align: 'center', width: W });
doc.font('Helvetica').fontSize(14).fillColor(C.gray).text('OWASP LLM Top 10 2025 Compliance Report', 0, 245, { align: 'center', width: W });

// Target Model Box
doc.rect(W/2 - 140, 280, 280, 45).fill(C.primary);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('TARGET SYSTEM', 0, 288, { align: 'center', width: W });
doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white).text(testedModelDisplay, 0, 303, { align: 'center', width: W });

// Executive KPIs
const kpiY = 360, kpiW = 120, kpiH = 90, kpiG = 12;
const kpiX = (W - (4 * kpiW + 3 * kpiG)) / 2;

const kpis = [
  [total.toString(), 'Tests Executed', C.primary],
  [`${passRate.toFixed(0)}%`, 'Pass Rate', passRate >= 80 ? C.green : passRate >= 60 ? C.orange : C.red],
  [`${owaspScore}/10`, 'Security Score', owaspScore >= 8 ? C.green : owaspScore >= 6 ? C.orange : C.red],
  [`${overallQuality.toFixed(1)}`, 'Quality Index', overallQuality >= 7 ? C.green : overallQuality >= 5 ? C.orange : C.red]
];

kpis.forEach((k, i) => {
  const x = kpiX + i * (kpiW + kpiG);
  doc.rect(x, kpiY, kpiW, kpiH).fill(C.light);
  doc.rect(x, kpiY, kpiW, 5).fill(k[2]);
  doc.font('Helvetica-Bold').fontSize(32).fillColor(k[2]).text(k[0], x, kpiY + 25, { width: kpiW, align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(k[1], x, kpiY + 65, { width: kpiW, align: 'center' });
});

// Executive Summary Box
doc.rect(M, 480, W - 2*M, 120).fill(C.light);
doc.rect(M, 480, W - 2*M, 5).fill(C.gold);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary).text('Executive Summary', M + 15, 495);

const riskLevel = totalVulns === 0 ? 'LOW' : vulns.critical > 0 ? 'CRITICAL' : vulns.high > 0 ? 'HIGH' : 'MEDIUM';
const riskColor = riskLevel === 'LOW' ? C.green : riskLevel === 'CRITICAL' ? C.red : riskLevel === 'HIGH' ? C.orange : C.orange;

doc.font('Helvetica').fontSize(10).fillColor(C.text)
  .text(`Assessment Date: ${dateStr}`, M + 15, 520)
  .text(`Methodology: OWASP LLM Top 10 2025 + LLM-as-Judge (Claude AI)`, M + 15, 535)
  .text(`Test Categories: Functional (${functionalTests.length}) | Security (${securityTests.length}) | Performance (${performanceTests.length})`, M + 15, 550)
  .text(`Security Categories: ${owaspCoverage} attack types evaluated (OWASP LLM Top 10 + Advanced)`, M + 15, 565);

doc.font('Helvetica-Bold').fontSize(11).fillColor(riskColor).text(`Overall Risk Level: ${riskLevel}`, M + 15, 580);

// Risk Level Clarification (ChatGPT suggestion)
doc.font('Helvetica').fontSize(7).fillColor(C.gray)
  .text('Risk level reflects identified scenarios under specific test conditions, not a general production risk classification.', M + 15, 594);

// Scope Disclaimer with Assessment Type Badge
doc.rect(M, 615, W - 2*M, 70).fill('#fff8e1');
doc.rect(M, 615, 5, 70).fill(C.orange);

// Assessment Type Badge
doc.rect(M + 15, 622, 120, 18).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gold).text('BASELINE ASSESSMENT', M + 20, 627);

// Confidence Badge
const confidenceLevel = owaspCoverage >= 8 ? 'HIGH' : owaspCoverage >= 5 ? 'MEDIUM' : 'LOW';
const confColor = confidenceLevel === 'HIGH' ? C.green : confidenceLevel === 'MEDIUM' ? C.orange : C.red;
doc.rect(M + 145, 622, 100, 18).fill(confColor);
doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(`CONFIDENCE: ${confidenceLevel}`, M + 150, 627);

// Coverage Badge
const coverageText = owaspCoverage <= 10 ? `${owaspCoverage}/10 OWASP` : `${owaspCoverage} CATEGORIES`;
doc.rect(M + 255, 622, 110, 18).fill(C.blue);
doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(`COVERAGE: ${coverageText}`, M + 260, 627);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.orange).text('ASSESSMENT SCOPE', M + 15, 648);
doc.font('Helvetica').fontSize(8).fillColor(C.text)
  .text(`This assessment covers ${owaspCoverage} OWASP LLM Top 10 2025 categories and is intended as a baseline security evaluation.`, M + 15, 660)
  .text('Results represent point-in-time findings. Continuous monitoring and comprehensive testing are recommended for production systems.', M + 15, 673);

// Footer
doc.rect(0, H - 80, W, 80).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white).text('Elyer Maldonado', 0, H - 65, { align: 'center', width: W });
doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('AI Quality & Risk Architect', 0, H - 50, { align: 'center', width: W });
doc.font('Helvetica').fontSize(9).fillColor(C.white).text('INGRID AI Testing Framework | Page 1 of 4', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 2: SECURITY FINDINGS
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Security Findings', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('OWASP LLM Top 10 2025 Assessment Results', M, 50);

let y = 90;

// OWASP Mapping
const omap = {
  'prompt_injection': ['LLM01', 'Prompt Injection', 'Manipulation of model behavior through crafted inputs'],
  'xss_injection': ['LLM02', 'Insecure Output Handling', 'Generation of harmful code or scripts'],
  'bias_detection': ['LLM03', 'Training Data Poisoning', 'Biased or manipulated training data'],
  'dos_attack': ['LLM04', 'Model Denial of Service', 'Resource exhaustion attacks'],
  'supply_chain': ['LLM05', 'Supply Chain Vulnerabilities', 'Compromised dependencies or plugins'],
  'system_prompt_leak': ['LLM06', 'Sensitive Information Disclosure', 'Exposure of system prompts or PII'],
  'command_injection': ['LLM07', 'Insecure Plugin Design', 'Arbitrary command execution'],
  'excessive_agency': ['LLM08', 'Excessive Agency', 'Unauthorized actions or permissions'],
  'hallucination': ['LLM09', 'Overreliance', 'Fabricated or inaccurate information'],
  'model_extraction': ['LLM10', 'Model Theft', 'Extraction of model parameters'],
};

// Table header
const cols = [50, 150, 65, 70, 70, 70];
const tw = cols.reduce((a,b) => a+b, 0);

doc.rect(M, y, tw, 28).fill(C.primary);
['ID', 'Vulnerability', 'Status', 'Severity', 'Blocked', 'Risk'].forEach((h, i) => {
  let cx = M; for(let j=0; j<i; j++) cx += cols[j];
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white).text(h, cx + 5, y + 9);
});
y += 28;

// Table rows
if (securityTests.length === 0) {
  doc.rect(M, y, tw, 30).fill(C.light);
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text('No security tests executed in this assessment', M + 10, y + 10);
  y += 30;
} else {
  securityTests.forEach((t, idx) => {
    const at = t.securityResult?.attackType || 'unknown';
    const m = omap[at] || [at.substring(0,6).toUpperCase(), at, 'Unknown attack type'];
    const st = t.evaluation.passed ? 'PASS' : 'FAIL';
    const sv = (t.securityResult?.severity || 'low').toUpperCase();
    const bl = t.securityResult?.wasBlocked ? 'YES' : 'NO';
    const risk = bl === 'YES' ? 'MITIGATED' : sv;

    doc.rect(M, y, tw, 24).fill(idx % 2 === 0 ? C.white : C.light);

    let cx = M;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.primary).text(m[0], cx + 5, y + 8); cx += cols[0];
    doc.font('Helvetica').fontSize(8).fillColor(C.text).text(m[1], cx + 5, y + 8); cx += cols[1];
    doc.font('Helvetica-Bold').fontSize(8).fillColor(st === 'PASS' ? C.green : C.red).text(st, cx + 5, y + 8); cx += cols[2];
    doc.font('Helvetica').fontSize(8).fillColor(sv === 'CRITICAL' ? C.red : sv === 'HIGH' ? C.orange : C.gray).text(sv, cx + 5, y + 8); cx += cols[3];
    doc.font('Helvetica-Bold').fontSize(8).fillColor(bl === 'YES' ? C.green : C.red).text(bl, cx + 5, y + 8); cx += cols[4];
    doc.font('Helvetica-Bold').fontSize(8).fillColor(risk === 'MITIGATED' ? C.green : C.red).text(risk, cx + 5, y + 8);
    y += 24;
  });
}

// Vulnerability Summary
y += 30;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Vulnerability Summary', M, y);
doc.rect(M, y + 22, 100, 3).fill(C.gold);
y += 45;

[['CRITICAL', vulns.critical, '#8b0000'], ['HIGH', vulns.high, C.red], ['MEDIUM', vulns.medium, C.orange], ['LOW', vulns.low, C.green]].forEach((v, i) => {
  const bx = M + i * 128;
  doc.rect(bx, y, 120, 65).fill(C.light);
  doc.rect(bx, y, 120, 5).fill(v[2]);
  doc.font('Helvetica-Bold').fontSize(36).fillColor(v[2]).text(v[1].toString(), bx, y + 18, { width: 120, align: 'center' });
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(v[0], bx, y + 52, { width: 120, align: 'center' });
});

// Security Verdict
y += 100;
const securityVerdict = totalVulns === 0 ? 'SECURE' : vulns.critical > 0 ? 'VULNERABLE' : 'NEEDS ATTENTION';
const verdictColor = securityVerdict === 'SECURE' ? C.green : securityVerdict === 'VULNERABLE' ? C.red : C.orange;

doc.rect(M, y, W - 2*M, 50).fill(verdictColor);
doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white).text(`Security Assessment: ${securityVerdict}`, 0, y + 17, { align: 'center', width: W });

doc.font('Helvetica').fontSize(9).fillColor(C.gray).text('INGRID AI Testing Framework | Page 2 of 4', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 3: QUALITY METRICS (LLM-as-Judge)
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Quality Assessment', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('LLM-as-Judge Evaluation Metrics (Evaluated by Claude AI)', M, 50);

y = 90;

// Quality metrics with detailed bars
const qualityMetrics = [
  ['Relevance', avgRelevance, 'Response addresses the question directly'],
  ['Accuracy', avgAccuracy, 'Information is correct and verifiable'],
  ['Coherence', avgCoherence, 'Response is logical and well-structured'],
  ['Completeness', avgCompleteness, 'Response covers all important aspects'],
  ['Factual Grounding', 10 - avgHallucination, 'No fabricated or false information']
];

qualityMetrics.forEach((q, i) => {
  const by = y + i * 55;
  const pct = (q[1] / 10) * 100;
  const fw = (pct / 100) * 320;
  const bc = pct >= 70 ? C.green : pct >= 50 ? C.orange : C.red;

  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.primary).text(q[0], M, by);
  doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(q[2], M, by + 15);

  doc.rect(M, by + 30, 320, 18).fill('#e0e0e0');
  doc.rect(M, by + 30, fw, 18).fill(bc);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.text).text(`${q[1].toFixed(1)}/10`, M + 340, by + 30);
});

// Overall Quality Score
y += 300;
doc.rect(M, y, W - 2*M, 80).fill(C.light);
doc.rect(M, y, W - 2*M, 5).fill(C.gold);

doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary).text('Overall Quality Index', M + 20, y + 20);
const qualityLabel = overallQuality >= 8 ? 'EXCELLENT' : overallQuality >= 6 ? 'GOOD' : overallQuality >= 4 ? 'FAIR' : 'POOR';
const qualityColor = overallQuality >= 8 ? C.green : overallQuality >= 6 ? C.blue : overallQuality >= 4 ? C.orange : C.red;

doc.font('Helvetica-Bold').fontSize(42).fillColor(qualityColor).text(overallQuality.toFixed(1), W - 150, y + 20);
doc.font('Helvetica').fontSize(12).fillColor(qualityColor).text(qualityLabel, W - 150, y + 60);

// Test Details
y += 110;
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary).text('Sample Test Results (Individual)', M, y);
doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Showing first 5 tests - scores are per-test, not aggregated', M, y + 16);
y += 32;

functionalTests.slice(0, 5).forEach((t, i) => {
  const by = y + i * 35;
  doc.rect(M, by, W - 2*M, 30).fill(i % 2 === 0 ? C.white : C.light);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary).text(t.testName, M + 10, by + 5);
  doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(`Score: ${((t.evaluation.relevance + t.evaluation.accuracy) / 2).toFixed(1)}/10 | Response: ${t.responseTime}ms`, M + 10, by + 18);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(t.evaluation.passed ? C.green : C.red).text(t.evaluation.passed ? 'PASS' : 'FAIL', W - M - 40, by + 10);
});

doc.font('Helvetica').fontSize(9).fillColor(C.gray).text('INGRID AI Testing Framework | Page 3 of 4', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 4: CONCLUSIONS & RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Conclusions & Recommendations', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('Assessment Summary and Next Steps', M, 50);

y = 90;

// Key Findings
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Key Findings', M, y);
doc.rect(M, y + 22, 80, 3).fill(C.gold);
y += 45;

const findings = [
  ['1', 'Security Posture', `${owaspPassed}/${owaspTotal} OWASP tests passed. ${totalVulns === 0 ? 'No vulnerabilities detected.' : `${totalVulns} potential vulnerabilities identified.`}`, totalVulns === 0 ? C.green : C.red],
  ['2', 'Response Quality', `Average quality score: ${overallQuality.toFixed(1)}/10. ${qualityLabel} performance across all metrics.`, qualityColor],
  ['3', 'Performance', `Average response time: ${Math.round(avgResponseTime)}ms across all test types. ${avgResponseTime < 2000 ? 'Excellent' : avgResponseTime < 5000 ? 'Good' : 'Needs optimization'} performance.`, avgResponseTime < 3000 ? C.green : C.orange],
  ['4', 'Reliability', `Hallucination rate: ${avgHallucination.toFixed(1)}/10 (lower is better). ${avgHallucination < 2 ? 'Highly reliable' : avgHallucination < 5 ? 'Moderate reliability' : 'Needs improvement'}.`, avgHallucination < 3 ? C.green : C.orange]
];

findings.forEach((f, i) => {
  const by = y + i * 55;
  doc.rect(M, by, W - 2*M, 48).fill(C.light);
  doc.rect(M, by, 35, 48).fill(f[3]);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white).text(f[0], M, by + 15, { width: 35, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.primary).text(f[1], M + 45, by + 10);
  doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(f[2], M + 45, by + 27, { width: W - 2*M - 60 });
});

// Recommendations
y += 250;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Recommendations', M, y);
doc.rect(M, y + 22, 80, 3).fill(C.gold);
y += 45;

const recommendations = totalVulns === 0
  ? ['Continue regular security assessments', 'Implement continuous monitoring', 'Document security best practices', 'Consider expanding test coverage']
  : ['Address identified vulnerabilities immediately', 'Implement input validation and sanitization', 'Review and strengthen security controls', 'Schedule follow-up assessment'];

recommendations.forEach((r, i) => {
  doc.font('Helvetica').fontSize(10).fillColor(C.green).text('✓', M, y + i * 18);
  doc.fillColor(C.text).text(r, M + 15, y + i * 18);
});

// Standards & Methodology
y += 100;
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary).text('Standards & Methodology', M, y);
y += 22;

['OWASP LLM Top 10 2025', 'LLM-as-Judge Evaluation Framework', 'ISO/IEC 27001 Alignment', 'NIST AI Risk Management Framework'].forEach((s, i) => {
  doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('▸', M, y + i * 16);
  doc.fillColor(C.text).text(s, M + 15, y + i * 16);
});

// Final footer
doc.rect(0, H - 100, W, 100).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white).text('INGRID AI Testing Framework', 0, H - 85, { align: 'center', width: W });
doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('Enterprise-Grade AI Security & Quality Assessment', 0, H - 68, { align: 'center', width: W });
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white).text('Elyer Maldonado', 0, H - 48, { align: 'center', width: W });
doc.font('Helvetica').fontSize(9).fillColor(C.gold).text('AI Quality & Risk Architect | github.com/E-Gregorio/ingrid-AI-framework', 0, H - 35, { align: 'center', width: W });
doc.font('Helvetica').fontSize(9).fillColor(C.white).text('Page 4 of 4', 0, H - 18, { align: 'center', width: W });

// Finalize
doc.end();

stream.on('finish', () => {
  console.log('  ✅ Professional PDF Report generated successfully!');
  console.log(`  📄 File: ${outputPath}`);
  console.log('  📑 Total: 4 pages\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Open PDF
  import('child_process').then(({ exec }) => {
    const cmd = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${cmd} "${outputPath}"`);
  });
});
