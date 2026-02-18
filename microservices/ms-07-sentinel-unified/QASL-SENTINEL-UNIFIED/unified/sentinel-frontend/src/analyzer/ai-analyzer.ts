// ============================================
// QASL-GUARDIAN - AI Analyzer (Claude)
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { GuardianConfig, ChangeDetection, AIAnalysis, TestLocator } from '../types.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export class AIAnalyzer {
  private client: Anthropic;
  private config: GuardianConfig;

  constructor(config: GuardianConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async analyzeChanges(changes: ChangeDetection[], testLocators: TestLocator[]): Promise<AIAnalysis> {
    this.log(`🤖 Analyzing ${changes.length} changes with Claude...`);

    const prompt = this.buildAnalysisPrompt(changes, testLocators);

    try {
      const response = await this.client.messages.create({
        model: this.config.claudeModel,
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      const analysisText = content.type === 'text' ? content.text : '';

      const analysis = this.parseAnalysisResponse(analysisText);
      this.log(`✅ Analysis complete: ${analysis.impactedTests.length} tests affected`);

      return analysis;

    } catch (error: any) {
      console.error(chalk.red('❌ Claude API error:'), error.message);
      throw error;
    }
  }

  private buildAnalysisPrompt(changes: ChangeDetection[], testLocators: TestLocator[]): string {
    // Limitar cambios para evitar exceder el límite de tokens de Claude
    const MAX_CHANGES = 100;
    let limitedChanges = changes;
    let changesLimited = false;

    if (changes.length > MAX_CHANGES) {
      // Priorizar cambios por severidad y tipo
      limitedChanges = changes
        .sort((a, b) => {
          const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
        })
        .slice(0, MAX_CHANGES);
      changesLimited = true;
      this.log(`⚠️ Limitando análisis a ${MAX_CHANGES} cambios más críticos (de ${changes.length} totales)`);
    }

    const changesJson = JSON.stringify(limitedChanges, null, 2);
    const locatorsJson = JSON.stringify(testLocators, null, 2);
    const limitedNote = changesLimited ? `\n\n**NOTA:** Se detectaron ${changes.length} cambios totales, mostrando los ${MAX_CHANGES} más críticos.` : '';

    return `You are QASL-GUARDIAN, an expert QA automation analyzer.

**Your Task:**
Analyze the following DOM/HTML changes detected in a test environment and predict:
1. Which test locators will be affected
2. Which specific tests will fail
3. Auto-healing suggestions for simple locator changes
4. Overall impact assessment

**Detected Changes:**${limitedNote}
\`\`\`json
${changesJson}
\`\`\`

**Current Test Locators (from test suite):**
\`\`\`json
${locatorsJson}
\`\`\`

**Response Format (JSON):**
\`\`\`json
{
  "summary": "Brief summary of changes (2-3 sentences)",
  "impactedTests": [
    {
      "testFile": "test-user-creation.spec.ts",
      "testName": "should create new user",
      "lineNumber": 45,
      "locator": "#btn-save",
      "failureProbability": 0.95,
      "reason": "Button ID changed from #btn-save to #btn-submit"
    }
  ],
  "recommendations": [
    "Update button locator in tests/locators.ts",
    "Run regression suite before deploying to production"
  ],
  "autoHealSuggestions": [
    {
      "locator": "#btn-save",
      "currentValue": "#btn-save",
      "suggestedValue": "#btn-submit",
      "confidence": 0.95,
      "reasoning": "Direct ID change detected, high confidence replacement",
      "autoApplicable": true
    }
  ],
  "confidence": 0.90,
  "reasoning": "Analysis based on direct DOM comparisons and locator matching"
}
\`\`\`

**Important:**
- Only flag tests with >70% failure probability
- Auto-heal suggestions should only be for simple, obvious changes (confidence >0.85)
- Be conservative with critical severity assessments
- Provide actionable recommendations

Respond ONLY with valid JSON (no markdown, no explanation outside JSON).`;
  }

  private parseAnalysisResponse(response: string): AIAnalysis {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr);

      return {
        summary: parsed.summary || 'AI analysis completed',
        impactedTests: parsed.impactedTests || [],
        recommendations: parsed.recommendations || [],
        autoHealSuggestions: parsed.autoHealSuggestions || [],
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'See analysis details',
      };

    } catch (error) {
      console.error(chalk.red('❌ Failed to parse Claude response:'), error);
      
      // Fallback analysis
      return {
        summary: 'AI analysis parsing failed, manual review required',
        impactedTests: [],
        recommendations: ['Manually review detected changes'],
        autoHealSuggestions: [],
        confidence: 0,
        reasoning: 'Claude response could not be parsed',
      };
    }
  }

  async loadTestLocators(): Promise<TestLocator[]> {
    this.log('📂 Loading test locators...');
    
    try {
      const locatorsPath = path.join(process.cwd(), 'tests', 'locators', 'app-locators.ts');
      const exists = await fs.access(locatorsPath).then(() => true).catch(() => false);

      if (!exists) {
        this.log('⚠️  No locators file found, using empty array');
        return [];
      }

      const content = await fs.readFile(locatorsPath, 'utf-8');
      
      // Simple parsing (you can enhance this to actually parse TypeScript)
      const locators: TestLocator[] = [];
      const regex = /(\w+):\s*['"](.+?)['"]/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        locators.push({
          name: match[1],
          selector: match[2],
          page: 'unknown',
          type: this.detectLocatorType(match[2]),
        });
      }

      this.log(`✅ Loaded ${locators.length} test locators`);
      return locators;

    } catch (error) {
      this.log('⚠️  Error loading locators, returning empty array');
      return [];
    }
  }

  private detectLocatorType(selector: string): 'css' | 'xpath' | 'text' | 'role' | 'testId' {
    if (selector.startsWith('/')) return 'xpath';
    if (selector.startsWith('text=')) return 'text';
    if (selector.startsWith('role=')) return 'role';
    if (selector.includes('[data-testid')) return 'testId';
    return 'css';
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(chalk.magenta(`[AIAnalyzer] ${message}`));
    }
  }
}
