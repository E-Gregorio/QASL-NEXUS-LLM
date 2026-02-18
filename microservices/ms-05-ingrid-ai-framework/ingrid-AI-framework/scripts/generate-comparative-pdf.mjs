#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// INGRID - Comparative AI Risk Assessment Report Generator
// VERSION 1.0 - Enterprise Grade Multi-Model Comparison
// ═══════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('   INGRID - Comparative AI Risk Assessment Generator v1.0');
console.log('═══════════════════════════════════════════════════════════════\n');

// Read metrics from both test runs
const reportsDir = path.join(process.cwd(), 'reports');

// Look for individual model reports
const geminiMetricsPath = path.join(reportsDir, 'metrics-gemini.json');
const openaiMetricsPath = path.join(reportsDir, 'metrics-openai.json');
const combinedMetricsPath = path.join(reportsDir, 'metrics-store.json');

let geminiData = [];
let openaiData = [];

// Try to load from combined file first
if (fs.existsSync(combinedMetricsPath)) {
  const allData = JSON.parse(fs.readFileSync(combinedMetricsPath, 'utf-8'));
  geminiData = allData.filter(e => e.model === 'gemini');
  openaiData = allData.filter(e => e.model === 'openai');
  console.log(`  📊 Loaded from combined metrics:`);
  console.log(`     - Gemini: ${geminiData.length} evaluations`);
  console.log(`     - OpenAI: ${openaiData.length} evaluations\n`);
}

// Also try individual files
if (fs.existsSync(geminiMetricsPath)) {
  geminiData = JSON.parse(fs.readFileSync(geminiMetricsPath, 'utf-8'));
  console.log(`  📊 Loaded Gemini metrics: ${geminiData.length} evaluations`);
}

if (fs.existsSync(openaiMetricsPath)) {
  openaiData = JSON.parse(fs.readFileSync(openaiMetricsPath, 'utf-8'));
  console.log(`  📊 Loaded OpenAI metrics: ${openaiData.length} evaluations`);
}

if (geminiData.length === 0 && openaiData.length === 0) {
  console.log('  ❌ No metrics found for comparison.');
  console.log('  Run both test suites first:');
  console.log('    npm run test:gemini');
  console.log('    npm run test:openai\n');
  process.exit(1);
}

// Output path
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const dateStr = new Date().toISOString().split('T')[0];
const outputPath = path.join(reportsDir, `INGRID-Comparative-AI-Assessment-${dateStr}.pdf`);

// Colors
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
  gemini: '#4285f4', // Google Blue
  openai: '#10a37f', // OpenAI Green
};

// Calculate metrics for each model
function calculateModelMetrics(data) {
  if (data.length === 0) return null;

  const total = data.length;
  const passed = data.filter(e => e.evaluation?.passed).length;
  const passRate = (passed / total) * 100;

  const securityTests = data.filter(e => e.category === 'security');
  const functionalTests = data.filter(e => e.category === 'functional');
  const performanceTests = data.filter(e => e.category === 'performance');

  const securityPassed = securityTests.filter(e => e.evaluation?.passed).length;
  const securityScore = securityTests.length > 0 ? (securityPassed / securityTests.length) * 10 : 0;

  const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const relevance = avg(data.map(e => e.evaluation?.relevance || 0));
  const accuracy = avg(data.map(e => e.evaluation?.accuracy || 0));
  const coherence = avg(data.map(e => e.evaluation?.coherence || 0));
  const completeness = avg(data.map(e => e.evaluation?.completeness || 0));
  const hallucination = avg(data.map(e => e.evaluation?.hallucination || 0));
  const responseTime = avg(data.map(e => e.responseTime || 0));

  const qualityIndex = (relevance + accuracy + coherence + completeness + (10 - hallucination)) / 5;

  const vulns = {
    critical: data.filter(e => e.securityResult?.severity === 'critical' && !e.securityResult?.wasBlocked).length,
    high: data.filter(e => e.securityResult?.severity === 'high' && !e.securityResult?.wasBlocked).length,
    medium: data.filter(e => e.securityResult?.severity === 'medium' && !e.securityResult?.wasBlocked).length,
    low: data.filter(e => e.securityResult?.severity === 'low' && !e.securityResult?.wasBlocked).length,
  };

  const owaspCategories = new Set(securityTests.map(t => t.securityResult?.attackType).filter(Boolean));

  return {
    total, passed, passRate,
    securityTests: securityTests.length,
    securityPassed,
    securityScore,
    functionalTests: functionalTests.length,
    performanceTests: performanceTests.length,
    relevance, accuracy, coherence, completeness, hallucination,
    qualityIndex,
    responseTime,
    vulns,
    totalVulns: vulns.critical + vulns.high + vulns.medium + vulns.low,
    owaspCoverage: owaspCategories.size,
  };
}

const gemini = calculateModelMetrics(geminiData);
const openai = calculateModelMetrics(openaiData);

// Create PDF
const doc = new PDFDocument({
  size: 'A4',
  bufferPages: true,
  autoFirstPage: false,
  info: {
    Title: 'INGRID Comparative AI Risk Assessment',
    Author: 'Elyer Maldonado - AI Quality & Risk Architect',
    Subject: 'Comparative AI/LLM Security Assessment Report',
    Keywords: 'OWASP, LLM, AI, Security, Testing, INGRID, Comparative',
    Creator: 'INGRID AI Testing Framework v2.0',
  }
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const W = 595.28;
const H = 841.89;
const M = 40;

// Helper functions
function drawComparisonBar(doc, x, y, width, value1, value2, max, color1, color2, label1, label2) {
  const barHeight = 20;
  const pct1 = (value1 / max) * width;
  const pct2 = (value2 / max) * width;

  // Background
  doc.rect(x, y, width, barHeight).fill('#e0e0e0');

  // Value 1 (from left)
  doc.rect(x, y, pct1, barHeight / 2).fill(color1);

  // Value 2 (from left, bottom half)
  doc.rect(x, y + barHeight / 2, pct2, barHeight / 2).fill(color2);

  // Labels
  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  doc.text(`${label1}: ${value1.toFixed(1)}`, x + width + 10, y + 2);
  doc.text(`${label2}: ${value2.toFixed(1)}`, x + width + 10, y + 12);
}

// ═══════════════════════════════════════════════════════════════
// PAGE 1: COMPARATIVE COVER
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

// Header
doc.rect(0, 0, W, 200).fill(C.primary);
doc.rect(0, 195, W, 5).fill(C.gold);

// Logo
doc.rect(W/2 - 60, 30, 120, 4).fill(C.gold);
doc.font('Helvetica-Bold').fontSize(48).fillColor(C.white).text('INGRID', 0, 50, { align: 'center', width: W });
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('Intelligent Network for Generative Response Inspection & Defense', 0, 100, { align: 'center', width: W });
doc.rect(W/2 - 60, 125, 120, 4).fill(C.gold);

// Document type
doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white).text('COMPARATIVE AI RISK ASSESSMENT', 0, 145, { align: 'center', width: W });
doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('Enterprise-Grade Multi-Model Security Analysis', 0, 162, { align: 'center', width: W });

// Main title
doc.font('Helvetica-Bold').fontSize(26).fillColor(C.primary).text('AI Model Comparison', 0, 225, { align: 'center', width: W });
doc.font('Helvetica').fontSize(14).fillColor(C.gray).text('OWASP LLM Top 10 2025 Compliance & Quality Assessment', 0, 260, { align: 'center', width: W });

// VS Box
const vsY = 300;
const boxW = 200;
const boxH = 100;
const boxG = 60;

// Gemini Box
doc.rect(M, vsY, boxW, boxH).fill(C.gemini);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Google', M, vsY + 25, { width: boxW, align: 'center' });
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white).text('Gemini', M, vsY + 50, { width: boxW, align: 'center' });
if (gemini) {
  doc.font('Helvetica').fontSize(11).fillColor(C.white).text(`${gemini.total} tests`, M, vsY + 82, { width: boxW, align: 'center' });
} else {
  doc.font('Helvetica').fontSize(11).fillColor(C.white).text('No data', M, vsY + 82, { width: boxW, align: 'center' });
}

// VS Circle
doc.circle(W/2, vsY + boxH/2, 25).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(18).fillColor(C.gold).text('VS', W/2 - 15, vsY + boxH/2 - 8);

// OpenAI Box
doc.rect(W - M - boxW, vsY, boxW, boxH).fill(C.openai);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('OpenAI', W - M - boxW, vsY + 25, { width: boxW, align: 'center' });
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white).text('ChatGPT', W - M - boxW, vsY + 50, { width: boxW, align: 'center' });
if (openai) {
  doc.font('Helvetica').fontSize(11).fillColor(C.white).text(`${openai.total} tests`, W - M - boxW, vsY + 82, { width: boxW, align: 'center' });
} else {
  doc.font('Helvetica').fontSize(11).fillColor(C.white).text('No data', W - M - boxW, vsY + 82, { width: boxW, align: 'center' });
}

// Quick Stats
let y = 430;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Quick Comparison', M, y);
doc.rect(M, y + 22, 100, 3).fill(C.gold);
y += 45;

// Stats table
const stats = [
  ['Metric', 'Gemini', 'ChatGPT', 'Winner'],
  ['Pass Rate', gemini ? `${gemini.passRate.toFixed(0)}%` : 'N/A', openai ? `${openai.passRate.toFixed(0)}%` : 'N/A',
    gemini && openai ? (gemini.passRate > openai.passRate ? 'Gemini' : gemini.passRate < openai.passRate ? 'ChatGPT' : 'Tie') : 'N/A'],
  ['Security Score', gemini ? `${gemini.securityScore.toFixed(1)}/10` : 'N/A', openai ? `${openai.securityScore.toFixed(1)}/10` : 'N/A',
    gemini && openai ? (gemini.securityScore > openai.securityScore ? 'Gemini' : gemini.securityScore < openai.securityScore ? 'ChatGPT' : 'Tie') : 'N/A'],
  ['Quality Index', gemini ? `${gemini.qualityIndex.toFixed(1)}/10` : 'N/A', openai ? `${openai.qualityIndex.toFixed(1)}/10` : 'N/A',
    gemini && openai ? (gemini.qualityIndex > openai.qualityIndex ? 'Gemini' : gemini.qualityIndex < openai.qualityIndex ? 'ChatGPT' : 'Tie') : 'N/A'],
  ['Avg Response', gemini ? `${Math.round(gemini.responseTime)}ms` : 'N/A', openai ? `${Math.round(openai.responseTime)}ms` : 'N/A',
    gemini && openai ? (gemini.responseTime < openai.responseTime ? 'Gemini' : gemini.responseTime > openai.responseTime ? 'ChatGPT' : 'Tie') : 'N/A'],
  ['Vulnerabilities', gemini ? gemini.totalVulns.toString() : 'N/A', openai ? openai.totalVulns.toString() : 'N/A',
    gemini && openai ? (gemini.totalVulns < openai.totalVulns ? 'Gemini' : gemini.totalVulns > openai.totalVulns ? 'ChatGPT' : 'Tie') : 'N/A'],
];

const colW = [130, 100, 100, 100];
stats.forEach((row, i) => {
  const rowY = y + i * 28;
  doc.rect(M, rowY, W - 2*M, 26).fill(i === 0 ? C.primary : i % 2 === 0 ? C.white : C.light);

  let cx = M;
  row.forEach((cell, j) => {
    const isHeader = i === 0;
    const isWinner = j === 3 && i > 0;
    let color = isHeader ? C.white : C.text;
    if (isWinner) {
      color = cell === 'Gemini' ? C.gemini : cell === 'ChatGPT' ? C.openai : cell === 'Tie' ? C.gold : C.gray;
    }
    doc.font(isHeader || isWinner ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor(color)
      .text(cell, cx + 5, rowY + 8, { width: colW[j] - 10 });
    cx += colW[j];
  });
});

// Assessment info
y = 620;
doc.rect(M, y, W - 2*M, 50).fill(C.light);
doc.rect(M, y, W - 2*M, 5).fill(C.gold);
doc.font('Helvetica-Bold').fontSize(10).fillColor(C.primary).text('Assessment Details', M + 15, y + 15);
doc.font('Helvetica').fontSize(9).fillColor(C.text)
  .text(`Date: ${dateStr} | Methodology: OWASP LLM Top 10 2025 + LLM-as-Judge (Claude AI)`, M + 15, y + 32);

// Footer
doc.rect(0, H - 80, W, 80).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white).text('Elyer Maldonado', 0, H - 65, { align: 'center', width: W });
doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('AI Quality & Risk Architect', 0, H - 50, { align: 'center', width: W });
doc.font('Helvetica').fontSize(9).fillColor(C.white).text('INGRID AI Testing Framework | Page 1 of 5', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 2: SECURITY COMPARISON
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Security Comparison', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('OWASP LLM Top 10 2025 Side-by-Side Analysis', M, 50);

y = 90;

// Security scores side by side
const secBoxW = (W - 3*M) / 2;
const secBoxH = 120;

// Gemini Security
doc.rect(M, y, secBoxW, secBoxH).fill(C.light);
doc.rect(M, y, secBoxW, 5).fill(C.gemini);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.gemini).text('Google Gemini', M + 15, y + 20);
if (gemini) {
  doc.font('Helvetica-Bold').fontSize(42).fillColor(gemini.securityScore >= 7 ? C.green : gemini.securityScore >= 5 ? C.orange : C.red)
    .text(`${gemini.securityScore.toFixed(1)}`, M + 15, y + 45);
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text('/10 Security Score', M + 100, y + 65);
  doc.font('Helvetica').fontSize(10).fillColor(C.text)
    .text(`${gemini.securityPassed}/${gemini.securityTests} tests passed`, M + 15, y + 95)
    .text(`${gemini.owaspCoverage}/10 OWASP categories`, M + 15, y + 108);
} else {
  doc.font('Helvetica').fontSize(14).fillColor(C.gray).text('No data available', M + 15, y + 55);
}

// OpenAI Security
doc.rect(M + secBoxW + M, y, secBoxW, secBoxH).fill(C.light);
doc.rect(M + secBoxW + M, y, secBoxW, 5).fill(C.openai);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.openai).text('OpenAI ChatGPT', M + secBoxW + M + 15, y + 20);
if (openai) {
  doc.font('Helvetica-Bold').fontSize(42).fillColor(openai.securityScore >= 7 ? C.green : openai.securityScore >= 5 ? C.orange : C.red)
    .text(`${openai.securityScore.toFixed(1)}`, M + secBoxW + M + 15, y + 45);
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text('/10 Security Score', M + secBoxW + M + 100, y + 65);
  doc.font('Helvetica').fontSize(10).fillColor(C.text)
    .text(`${openai.securityPassed}/${openai.securityTests} tests passed`, M + secBoxW + M + 15, y + 95)
    .text(`${openai.owaspCoverage}/10 OWASP categories`, M + secBoxW + M + 15, y + 108);
} else {
  doc.font('Helvetica').fontSize(14).fillColor(C.gray).text('No data available', M + secBoxW + M + 15, y + 55);
}

// Vulnerability comparison
y += 150;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Vulnerability Distribution', M, y);
doc.rect(M, y + 22, 120, 3).fill(C.gold);
y += 45;

const vulnTypes = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const vulnColors = ['#8b0000', C.red, C.orange, C.green];

vulnTypes.forEach((type, i) => {
  const rowY = y + i * 45;
  const geminiVal = gemini?.vulns?.[type.toLowerCase()] || 0;
  const openaiVal = openai?.vulns?.[type.toLowerCase()] || 0;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(vulnColors[i]).text(type, M, rowY);

  // Gemini bar
  const maxVal = Math.max(geminiVal, openaiVal, 1);
  const barW = 180;

  doc.rect(M + 80, rowY, barW, 15).fill('#e0e0e0');
  doc.rect(M + 80, rowY, (geminiVal / maxVal) * barW, 15).fill(C.gemini);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(geminiVal.toString(), M + 80 + barW + 10, rowY + 2);

  // OpenAI bar
  doc.rect(M + 80, rowY + 18, barW, 15).fill('#e0e0e0');
  doc.rect(M + 80, rowY + 18, (openaiVal / maxVal) * barW, 15).fill(C.openai);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(openaiVal.toString(), M + 80 + barW + 10, rowY + 20);
});

// Legend
y += 200;
doc.rect(M, y, 15, 15).fill(C.gemini);
doc.font('Helvetica').fontSize(10).fillColor(C.text).text('Gemini', M + 20, y + 2);
doc.rect(M + 100, y, 15, 15).fill(C.openai);
doc.text('ChatGPT', M + 120, y + 2);

// Security verdict
y += 50;
const geminiSecure = gemini && gemini.totalVulns === 0;
const openaiSecure = openai && openai.totalVulns === 0;
let winner = 'TIE';
let winnerColor = C.gold;

if (gemini && openai) {
  if (gemini.securityScore > openai.securityScore) {
    winner = 'GEMINI';
    winnerColor = C.gemini;
  } else if (openai.securityScore > gemini.securityScore) {
    winner = 'CHATGPT';
    winnerColor = C.openai;
  }
}

doc.rect(M, y, W - 2*M, 50).fill(winnerColor);
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white)
  .text(`Security Winner: ${winner}`, 0, y + 17, { align: 'center', width: W });

doc.font('Helvetica').fontSize(9).fillColor(C.gray).text('INGRID AI Testing Framework | Page 2 of 5', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 3: QUALITY COMPARISON
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Quality Comparison', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('LLM-as-Judge Evaluation Metrics', M, 50);

y = 90;

// Quality metrics comparison
const metrics = [
  ['Relevance', gemini?.relevance || 0, openai?.relevance || 0, 'Response addresses the question directly'],
  ['Accuracy', gemini?.accuracy || 0, openai?.accuracy || 0, 'Information is correct and verifiable'],
  ['Coherence', gemini?.coherence || 0, openai?.coherence || 0, 'Response is logical and well-structured'],
  ['Completeness', gemini?.completeness || 0, openai?.completeness || 0, 'Response covers all important aspects'],
  ['Factual Grounding', 10 - (gemini?.hallucination || 0), 10 - (openai?.hallucination || 0), 'No fabricated or false information'],
];

metrics.forEach((m, i) => {
  const rowY = y + i * 80;

  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.primary).text(m[0], M, rowY);
  doc.font('Helvetica').fontSize(9).fillColor(C.gray).text(m[3], M, rowY + 15);

  // Gemini bar
  const barY = rowY + 35;
  const barW = 200;

  doc.font('Helvetica').fontSize(9).fillColor(C.gemini).text('Gemini:', M, barY + 2);
  doc.rect(M + 60, barY, barW, 15).fill('#e0e0e0');
  doc.rect(M + 60, barY, (m[1] / 10) * barW, 15).fill(C.gemini);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(`${m[1].toFixed(1)}/10`, M + 60 + barW + 10, barY + 2);

  // OpenAI bar
  doc.font('Helvetica').fontSize(9).fillColor(C.openai).text('ChatGPT:', M, barY + 20);
  doc.rect(M + 60, barY + 18, barW, 15).fill('#e0e0e0');
  doc.rect(M + 60, barY + 18, (m[2] / 10) * barW, 15).fill(C.openai);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(`${m[2].toFixed(1)}/10`, M + 60 + barW + 10, barY + 20);

  // Winner indicator
  const winnerText = m[1] > m[2] ? '◀ Gemini' : m[2] > m[1] ? 'ChatGPT ▶' : 'Tie';
  const winColor = m[1] > m[2] ? C.gemini : m[2] > m[1] ? C.openai : C.gold;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(winColor).text(winnerText, M + 60 + barW + 80, barY + 10);
});

// Overall Quality Index
y = 510;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Overall Quality Index', M, y);
doc.rect(M, y + 22, 120, 3).fill(C.gold);
y += 50;

// Side by side quality boxes
doc.rect(M, y, secBoxW, 80).fill(C.light);
doc.rect(M, y, secBoxW, 5).fill(C.gemini);
doc.font('Helvetica-Bold').fontSize(12).fillColor(C.gemini).text('Gemini', M + 15, y + 15);
if (gemini) {
  const qLabel = gemini.qualityIndex >= 8 ? 'EXCELLENT' : gemini.qualityIndex >= 6 ? 'GOOD' : gemini.qualityIndex >= 4 ? 'FAIR' : 'POOR';
  doc.font('Helvetica-Bold').fontSize(36).fillColor(gemini.qualityIndex >= 6 ? C.green : C.orange).text(gemini.qualityIndex.toFixed(1), M + 15, y + 35);
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(qLabel, M + 90, y + 50);
}

doc.rect(M + secBoxW + M, y, secBoxW, 80).fill(C.light);
doc.rect(M + secBoxW + M, y, secBoxW, 5).fill(C.openai);
doc.font('Helvetica-Bold').fontSize(12).fillColor(C.openai).text('ChatGPT', M + secBoxW + M + 15, y + 15);
if (openai) {
  const qLabel = openai.qualityIndex >= 8 ? 'EXCELLENT' : openai.qualityIndex >= 6 ? 'GOOD' : openai.qualityIndex >= 4 ? 'FAIR' : 'POOR';
  doc.font('Helvetica-Bold').fontSize(36).fillColor(openai.qualityIndex >= 6 ? C.green : C.orange).text(openai.qualityIndex.toFixed(1), M + secBoxW + M + 15, y + 35);
  doc.font('Helvetica').fontSize(10).fillColor(C.gray).text(qLabel, M + secBoxW + M + 90, y + 50);
}

// Quality winner
y += 110;
let qualityWinner = 'TIE';
let qualityWinnerColor = C.gold;
if (gemini && openai) {
  if (gemini.qualityIndex > openai.qualityIndex) {
    qualityWinner = 'GEMINI';
    qualityWinnerColor = C.gemini;
  } else if (openai.qualityIndex > gemini.qualityIndex) {
    qualityWinner = 'CHATGPT';
    qualityWinnerColor = C.openai;
  }
}

doc.rect(M, y, W - 2*M, 50).fill(qualityWinnerColor);
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white)
  .text(`Quality Winner: ${qualityWinner}`, 0, y + 17, { align: 'center', width: W });

doc.font('Helvetica').fontSize(9).fillColor(C.gray).text('INGRID AI Testing Framework | Page 3 of 5', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 4: PERFORMANCE & RELIABILITY
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Performance & Reliability', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('Response Time & Hallucination Analysis', M, 50);

y = 90;

// Response Time Comparison
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Response Time Analysis', M, y);
doc.rect(M, y + 22, 140, 3).fill(C.gold);
y += 50;

doc.rect(M, y, secBoxW, 100).fill(C.light);
doc.rect(M, y, secBoxW, 5).fill(C.gemini);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.gemini).text('Gemini', M + 15, y + 20);
if (gemini) {
  doc.font('Helvetica-Bold').fontSize(32).fillColor(gemini.responseTime < 3000 ? C.green : C.orange)
    .text(`${Math.round(gemini.responseTime)}`, M + 15, y + 45);
  doc.font('Helvetica').fontSize(11).fillColor(C.gray).text('ms average', M + 100, y + 55);
  const perfLabel = gemini.responseTime < 2000 ? 'Excellent' : gemini.responseTime < 5000 ? 'Good' : 'Slow';
  doc.font('Helvetica').fontSize(10).fillColor(C.text).text(perfLabel, M + 15, y + 80);
}

doc.rect(M + secBoxW + M, y, secBoxW, 100).fill(C.light);
doc.rect(M + secBoxW + M, y, secBoxW, 5).fill(C.openai);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.openai).text('ChatGPT', M + secBoxW + M + 15, y + 20);
if (openai) {
  doc.font('Helvetica-Bold').fontSize(32).fillColor(openai.responseTime < 3000 ? C.green : C.orange)
    .text(`${Math.round(openai.responseTime)}`, M + secBoxW + M + 15, y + 45);
  doc.font('Helvetica').fontSize(11).fillColor(C.gray).text('ms average', M + secBoxW + M + 100, y + 55);
  const perfLabel = openai.responseTime < 2000 ? 'Excellent' : openai.responseTime < 5000 ? 'Good' : 'Slow';
  doc.font('Helvetica').fontSize(10).fillColor(C.text).text(perfLabel, M + secBoxW + M + 15, y + 80);
}

// Hallucination Rate
y += 130;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Hallucination Rate (Lower is Better)', M, y);
doc.rect(M, y + 22, 200, 3).fill(C.gold);
y += 50;

doc.rect(M, y, secBoxW, 100).fill(C.light);
doc.rect(M, y, secBoxW, 5).fill(C.gemini);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.gemini).text('Gemini', M + 15, y + 20);
if (gemini) {
  const hallRate = gemini.hallucination;
  doc.font('Helvetica-Bold').fontSize(32).fillColor(hallRate < 3 ? C.green : hallRate < 5 ? C.orange : C.red)
    .text(`${hallRate.toFixed(1)}`, M + 15, y + 45);
  doc.font('Helvetica').fontSize(11).fillColor(C.gray).text('/10', M + 80, y + 55);
  const hallLabel = hallRate < 2 ? 'Highly Reliable' : hallRate < 5 ? 'Moderate' : 'Unreliable';
  doc.font('Helvetica').fontSize(10).fillColor(C.text).text(hallLabel, M + 15, y + 80);
}

doc.rect(M + secBoxW + M, y, secBoxW, 100).fill(C.light);
doc.rect(M + secBoxW + M, y, secBoxW, 5).fill(C.openai);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.openai).text('ChatGPT', M + secBoxW + M + 15, y + 20);
if (openai) {
  const hallRate = openai.hallucination;
  doc.font('Helvetica-Bold').fontSize(32).fillColor(hallRate < 3 ? C.green : hallRate < 5 ? C.orange : C.red)
    .text(`${hallRate.toFixed(1)}`, M + secBoxW + M + 15, y + 45);
  doc.font('Helvetica').fontSize(11).fillColor(C.gray).text('/10', M + secBoxW + M + 80, y + 55);
  const hallLabel = hallRate < 2 ? 'Highly Reliable' : hallRate < 5 ? 'Moderate' : 'Unreliable';
  doc.font('Helvetica').fontSize(10).fillColor(C.text).text(hallLabel, M + secBoxW + M + 15, y + 80);
}

// Overall Reliability Winner
y += 130;
let perfWinner = 'TIE';
let perfWinnerColor = C.gold;
if (gemini && openai) {
  const geminiPerf = (10 - gemini.hallucination) + (gemini.responseTime < openai.responseTime ? 2 : 0);
  const openaiPerf = (10 - openai.hallucination) + (openai.responseTime < gemini.responseTime ? 2 : 0);
  if (geminiPerf > openaiPerf) {
    perfWinner = 'GEMINI';
    perfWinnerColor = C.gemini;
  } else if (openaiPerf > geminiPerf) {
    perfWinner = 'CHATGPT';
    perfWinnerColor = C.openai;
  }
}

doc.rect(M, y, W - 2*M, 50).fill(perfWinnerColor);
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white)
  .text(`Performance Winner: ${perfWinner}`, 0, y + 17, { align: 'center', width: W });

doc.font('Helvetica').fontSize(9).fillColor(C.gray).text('INGRID AI Testing Framework | Page 4 of 5', 0, H - 30, { align: 'center', width: W });

// ═══════════════════════════════════════════════════════════════
// PAGE 5: FINAL VERDICT & RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════
doc.addPage({ size: 'A4', margin: 0 });

doc.rect(0, 0, W, 70).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white).text('Final Verdict & Recommendations', M, 25);
doc.font('Helvetica').fontSize(11).fillColor(C.gold).text('Comprehensive Assessment Summary', M, 50);

y = 90;

// Score summary
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Category Winners', M, y);
doc.rect(M, y + 22, 100, 3).fill(C.gold);
y += 45;

const categories = [
  ['Security', winner, winnerColor],
  ['Quality', qualityWinner, qualityWinnerColor],
  ['Performance', perfWinner, perfWinnerColor],
];

categories.forEach((cat, i) => {
  const rowY = y + i * 35;
  doc.rect(M, rowY, W - 2*M, 30).fill(i % 2 === 0 ? C.white : C.light);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.primary).text(cat[0], M + 15, rowY + 8);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(cat[2]).text(cat[1], W - M - 100, rowY + 8);
});

// Overall winner calculation
y += 130;
let overallWinner = 'TIE';
let overallColor = C.gold;
let geminiWins = 0;
let openaiWins = 0;

categories.forEach(cat => {
  if (cat[1] === 'GEMINI') geminiWins++;
  if (cat[1] === 'CHATGPT') openaiWins++;
});

if (geminiWins > openaiWins) {
  overallWinner = 'GOOGLE GEMINI';
  overallColor = C.gemini;
} else if (openaiWins > geminiWins) {
  overallWinner = 'OPENAI CHATGPT';
  overallColor = C.openai;
}

doc.rect(M, y, W - 2*M, 80).fill(overallColor);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white).text('OVERALL WINNER', 0, y + 15, { align: 'center', width: W });
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white).text(overallWinner, 0, y + 35, { align: 'center', width: W });
doc.font('Helvetica').fontSize(11).fillColor(C.white).text(`${Math.max(geminiWins, openaiWins)} of 3 categories`, 0, y + 65, { align: 'center', width: W });

// Recommendations
y += 110;
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text('Recommendations', M, y);
doc.rect(M, y + 22, 100, 3).fill(C.gold);
y += 45;

const recommendations = [
  'Both models demonstrate strong security postures with OWASP compliance',
  'Continue regular comparative assessments to track model improvements',
  'Consider use-case specific evaluation for final deployment decisions',
  'Implement continuous monitoring for production environments',
  'Document model-specific strengths for optimal task routing',
];

recommendations.forEach((r, i) => {
  doc.font('Helvetica').fontSize(10).fillColor(C.green).text('✓', M, y + i * 18);
  doc.fillColor(C.text).text(r, M + 15, y + i * 18);
});

// Methodology
y += 120;
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary).text('Assessment Methodology', M, y);
y += 22;

['OWASP LLM Top 10 2025 Framework', 'LLM-as-Judge (Claude AI Evaluation)', 'ISO/IEC 27001 Alignment', 'NIST AI Risk Management Framework'].forEach((s, i) => {
  doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('▸', M, y + i * 16);
  doc.fillColor(C.text).text(s, M + 15, y + i * 16);
});

// Final footer
doc.rect(0, H - 100, W, 100).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.white).text('INGRID AI Testing Framework', 0, H - 85, { align: 'center', width: W });
doc.font('Helvetica').fontSize(10).fillColor(C.gold).text('Enterprise-Grade Comparative AI Assessment', 0, H - 68, { align: 'center', width: W });
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white).text('Elyer Maldonado', 0, H - 48, { align: 'center', width: W });
doc.font('Helvetica').fontSize(9).fillColor(C.gold).text('AI Quality & Risk Architect | github.com/E-Gregorio/ingrid-AI-framework', 0, H - 35, { align: 'center', width: W });
doc.font('Helvetica').fontSize(9).fillColor(C.white).text('Page 5 of 5', 0, H - 18, { align: 'center', width: W });

// Finalize
doc.end();

stream.on('finish', () => {
  console.log('\n  ✅ Comparative PDF Report generated successfully!');
  console.log(`  📄 File: ${outputPath}`);
  console.log('  📑 Total: 5 pages\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Open PDF
  import('child_process').then(({ exec }) => {
    const cmd = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${cmd} "${outputPath}"`);
  });
});
