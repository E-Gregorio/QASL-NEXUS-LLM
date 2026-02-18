// ═══════════════════════════════════════════════════════════════════════════
// 🤖 INGRID Mobile - AI-Powered Mobile UX & Accessibility Analyzer
// ═══════════════════════════════════════════════════════════════════════════
// Usa Claude Vision para analizar screenshots de apps móviles
// Valida: UX, Accesibilidad, Visual Regression, Usabilidad
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import {
  INGRIDAnalysis,
  AIFinding,
  VisualRegressionResult,
  TestExecution
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface INGRIDConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class INGRIDMobileAnalyzer {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: INGRIDConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Analyze Test Execution Screenshots
  // ─────────────────────────────────────────────────────────────────────────

  async analyzeExecution(execution: TestExecution): Promise<INGRIDAnalysis> {
    console.log(`\n🤖 INGRID Mobile analyzing ${execution.screenshots.length} screenshots...`);

    const findings: AIFinding[] = [];

    // Analyze each screenshot
    for (const screenshotPath of execution.screenshots) {
      const screenshotFindings = await this.analyzeScreenshot(screenshotPath);
      findings.push(...screenshotFindings);
    }

    // Calculate scores
    const uxScore = this.calculateUXScore(findings);
    const accessibilityScore = this.calculateAccessibilityScore(findings);
    const overallScore = (uxScore + accessibilityScore) / 2;

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings);

    const analysis: INGRIDAnalysis = {
      id: uuidv4(),
      testExecutionId: execution.id,
      timestamp: new Date(),
      screenshots: execution.screenshots,
      findings,
      uxScore,
      accessibilityScore,
      overallScore,
      recommendations
    };

    console.log(`✅ Analysis complete: UX=${uxScore}%, Accessibility=${accessibilityScore}%`);

    return analysis;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Analyze Single Screenshot
  // ─────────────────────────────────────────────────────────────────────────

  async analyzeScreenshot(screenshotPath: string): Promise<AIFinding[]> {
    try {
      const imageData = await fs.readFile(screenshotPath);
      const base64Image = imageData.toString('base64');
      const mediaType = screenshotPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: this.getAnalysisPrompt()
              }
            ]
          }
        ]
      });

      // Parse response
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return [];
      }

      return this.parseFindings(textContent.text, screenshotPath);
    } catch (error) {
      console.error(`Error analyzing screenshot ${screenshotPath}:`, error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Visual Regression Analysis
  // ─────────────────────────────────────────────────────────────────────────

  async compareScreenshots(
    baselinePath: string,
    currentPath: string,
    threshold: number = 5
  ): Promise<VisualRegressionResult> {
    try {
      const [baselineData, currentData] = await Promise.all([
        fs.readFile(baselinePath),
        fs.readFile(currentPath)
      ]);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: baselineData.toString('base64')
                }
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: currentData.toString('base64')
                }
              },
              {
                type: 'text',
                text: `Compare these two mobile app screenshots (baseline vs current).

Analyze and respond in JSON format:
{
  "diffPercentage": <estimated percentage of visual differences 0-100>,
  "changedRegions": [
    {"description": "what changed", "x": 0, "y": 0, "width": 100, "height": 100}
  ],
  "significantChanges": ["list of significant visual changes"],
  "minorChanges": ["list of minor changes that might be acceptable"]
}

Be precise about the percentage. Minor text changes = 1-5%, layout changes = 10-30%, major redesign = 50%+`
              }
            ]
          }
        ]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No response from Claude');
      }

      // Extract JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON response');
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        baselineScreenshot: baselinePath,
        currentScreenshot: currentPath,
        diffPercentage: result.diffPercentage,
        passed: result.diffPercentage <= threshold,
        threshold,
        changedRegions: result.changedRegions
      };
    } catch (error) {
      console.error('Visual regression analysis failed:', error);
      return {
        baselineScreenshot: baselinePath,
        currentScreenshot: currentPath,
        diffPercentage: 100,
        passed: false,
        threshold
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Analysis Prompt
  // ─────────────────────────────────────────────────────────────────────────

  private getAnalysisPrompt(): string {
    return `Analyze this mobile app screenshot for UX and accessibility issues.

Evaluate the following aspects and report findings:

## UX Analysis
- Touch target sizes (minimum 44x44 points for iOS, 48x48 dp for Android)
- Visual hierarchy and readability
- Color contrast ratios (WCAG AA = 4.5:1 for text)
- Button and interactive element visibility
- Navigation clarity
- Form usability (if applicable)
- Loading states and feedback
- Error message clarity

## Accessibility Analysis
- Text size readability (minimum 12sp for body text)
- Color-only information indicators
- Screen reader compatibility hints
- Focus indicators
- Alternative text for images
- Keyboard/switch control accessibility

## Usability
- Thumb zone optimization (important actions in easy reach)
- Cognitive load assessment
- Consistency with platform guidelines (Material/HIG)

Respond in this JSON format:
{
  "findings": [
    {
      "type": "ux|accessibility|visual|usability",
      "severity": "critical|high|medium|low|info",
      "title": "Short title",
      "description": "Detailed description",
      "element": "Element identifier if applicable",
      "suggestion": "How to fix"
    }
  ],
  "positiveAspects": ["List of things done well"],
  "uxScore": <0-100>,
  "accessibilityScore": <0-100>
}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Parse AI Findings
  // ─────────────────────────────────────────────────────────────────────────

  private parseFindings(response: string, screenshot: string): AIFinding[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('Could not extract JSON from INGRID response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const findings: AIFinding[] = [];

      if (parsed.findings && Array.isArray(parsed.findings)) {
        for (const f of parsed.findings) {
          findings.push({
            type: f.type || 'ux',
            severity: f.severity || 'medium',
            title: f.title || 'Unknown issue',
            description: f.description || '',
            element: f.element,
            screenshot,
            suggestion: f.suggestion
          });
        }
      }

      return findings;
    } catch (error) {
      console.error('Failed to parse INGRID findings:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Calculate Scores
  // ─────────────────────────────────────────────────────────────────────────

  private calculateUXScore(findings: AIFinding[]): number {
    const uxFindings = findings.filter(f => f.type === 'ux' || f.type === 'usability');
    return this.calculateScoreFromFindings(uxFindings);
  }

  private calculateAccessibilityScore(findings: AIFinding[]): number {
    const a11yFindings = findings.filter(f => f.type === 'accessibility');
    return this.calculateScoreFromFindings(a11yFindings);
  }

  private calculateScoreFromFindings(findings: AIFinding[]): number {
    if (findings.length === 0) return 100;

    const penalties: Record<string, number> = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
      info: 0
    };

    let totalPenalty = 0;
    for (const finding of findings) {
      totalPenalty += penalties[finding.severity] || 5;
    }

    return Math.max(0, 100 - totalPenalty);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Recommendations
  // ─────────────────────────────────────────────────────────────────────────

  private generateRecommendations(findings: AIFinding[]): string[] {
    const recommendations: string[] = [];

    // Group by severity
    const critical = findings.filter(f => f.severity === 'critical');
    const high = findings.filter(f => f.severity === 'high');

    if (critical.length > 0) {
      recommendations.push(
        `🚨 Fix ${critical.length} critical issues immediately: ${critical.map(f => f.title).join(', ')}`
      );
    }

    if (high.length > 0) {
      recommendations.push(
        `⚠️ Address ${high.length} high-priority issues: ${high.map(f => f.title).join(', ')}`
      );
    }

    // Add specific recommendations based on finding types
    const hasA11yIssues = findings.some(f => f.type === 'accessibility');
    if (hasA11yIssues) {
      recommendations.push(
        '♿ Consider running automated accessibility tests (Accessibility Scanner for Android, Accessibility Inspector for iOS)'
      );
    }

    const hasUXIssues = findings.some(f => f.type === 'ux');
    if (hasUXIssues) {
      recommendations.push(
        '📱 Review touch targets and ensure minimum sizes (44pt iOS, 48dp Android)'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No critical issues found. Continue monitoring.');
    }

    return recommendations;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quick UX Check (lightweight analysis)
  // ─────────────────────────────────────────────────────────────────────────

  async quickCheck(screenshotPath: string): Promise<{
    passed: boolean;
    score: number;
    criticalIssues: string[];
  }> {
    const findings = await this.analyzeScreenshot(screenshotPath);
    const criticalIssues = findings
      .filter(f => f.severity === 'critical')
      .map(f => f.title);

    const score = this.calculateUXScore(findings);

    return {
      passed: criticalIssues.length === 0 && score >= 70,
      score,
      criticalIssues
    };
  }
}

export default INGRIDMobileAnalyzer;
