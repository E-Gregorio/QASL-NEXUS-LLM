// ═══════════════════════════════════════════════════════════════════════════
// 🎯 QASL-MOBILE Selector Engine - Sistema de 11 Niveles para Mobile
// ═══════════════════════════════════════════════════════════════════════════
// Superior a Appium: selectores inteligentes con fallbacks automáticos
// Adaptado del UNIVERSAL RECORDER PRO v5.0 para mobile
// ═══════════════════════════════════════════════════════════════════════════

import {
  MobileSelector,
  SELECTOR_CONFIDENCE,
  ElementInfo
} from '../types/index.js';

export class SelectorEngine {
  private static readonly DYNAMIC_PATTERNS = [
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
    /^\d{13,}$/,                                                         // Timestamps
    /^[a-f0-9]{32,}$/i,                                                  // Hashes
    /^[0-9]+$/,                                                          // Pure numbers
    /_\d+$/,                                                             // Ends with _number
    /\[\d+\]$/                                                           // Array indices
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Best Selector from Element Info
  // ─────────────────────────────────────────────────────────────────────────

  static generateSelector(element: ElementInfo): MobileSelector {
    const selectors = this.generateAllSelectors(element);

    // Ordenar por confianza (mayor a menor)
    selectors.sort((a, b) => b.confidence - a.confidence);

    // El mejor selector es el primero, el resto son fallbacks
    const bestSelector = selectors[0];
    if (selectors.length > 1) {
      bestSelector.fallbacks = selectors.slice(1, 4); // Max 3 fallbacks
    }

    return bestSelector;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate All Possible Selectors (11 niveles)
  // ─────────────────────────────────────────────────────────────────────────

  static generateAllSelectors(element: ElementInfo): MobileSelector[] {
    const selectors: MobileSelector[] = [];

    // Nivel 1: Accessibility ID (100% confianza)
    if (element.contentDescription && !this.isDynamic(element.contentDescription)) {
      selectors.push({
        type: 'accessibilityId',
        value: element.contentDescription,
        confidence: SELECTOR_CONFIDENCE.accessibilityId
      });
    }

    // Nivel 2: Resource ID (95% confianza)
    if (element.resourceId && !this.isDynamic(element.resourceId)) {
      // Extraer solo el ID sin el package name
      const cleanId = element.resourceId.includes(':id/')
        ? element.resourceId.split(':id/')[1]
        : element.resourceId;

      if (!this.isDynamic(cleanId)) {
        selectors.push({
          type: 'resourceId',
          value: cleanId,
          confidence: SELECTOR_CONFIDENCE.resourceId
        });
      }
    }

    // Nivel 3: Test ID (95% confianza) - Para React Native/Flutter
    // Se detecta a través de contentDescription o resourceId con patrones específicos
    const testIdPatterns = ['testID', 'test-id', 'data-testid', 'key-'];
    const hasTestId = element.resourceId && testIdPatterns.some(p =>
      element.resourceId!.toLowerCase().includes(p.toLowerCase())
    );
    if (hasTestId && element.resourceId) {
      selectors.push({
        type: 'testId',
        value: element.resourceId,
        confidence: SELECTOR_CONFIDENCE.testId
      });
    }

    // Nivel 4: Content Description (90% confianza)
    if (element.contentDescription &&
        element.contentDescription !== element.text &&
        !this.isDynamic(element.contentDescription)) {
      selectors.push({
        type: 'contentDescription',
        value: element.contentDescription,
        confidence: SELECTOR_CONFIDENCE.contentDescription
      });
    }

    // Nivel 5: Texto exacto (85% confianza)
    if (element.text && element.text.trim().length > 0 && element.text.length < 50) {
      if (!this.isDynamic(element.text) && !this.looksLikeDynamicContent(element.text)) {
        selectors.push({
          type: 'text',
          value: element.text.trim(),
          confidence: SELECTOR_CONFIDENCE.text
        });
      }
    }

    // Nivel 6: Texto parcial (80% confianza)
    if (element.text && element.text.length >= 50) {
      const partialText = element.text.substring(0, 30).trim();
      if (!this.isDynamic(partialText)) {
        selectors.push({
          type: 'textContains',
          value: partialText,
          confidence: SELECTOR_CONFIDENCE.textContains
        });
      }
    }

    // Nivel 7: Class Name (70% confianza)
    if (element.className && this.isStableClassName(element.className)) {
      selectors.push({
        type: 'className',
        value: element.className,
        confidence: SELECTOR_CONFIDENCE.className
      });
    }

    // Nivel 8: XPath (50% confianza) - Último recurso
    // Solo generamos XPath simple basado en clase + índice
    if (element.className) {
      const simpleXpath = `//${element.className}`;
      selectors.push({
        type: 'xpath',
        value: simpleXpath,
        confidence: SELECTOR_CONFIDENCE.xpath
      });
    }

    // Si no encontramos ningún selector confiable, usar posición
    if (selectors.length === 0) {
      selectors.push({
        type: 'index',
        value: `${element.bounds.x},${element.bounds.y}`,
        confidence: SELECTOR_CONFIDENCE.index
      });
    }

    return selectors;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convert Selector to Maestro Format
  // ─────────────────────────────────────────────────────────────────────────

  static toMaestroSelector(selector: MobileSelector): string | Record<string, unknown> {
    switch (selector.type) {
      case 'accessibilityId':
      case 'resourceId':
      case 'testId':
        return { id: selector.value };

      case 'text':
        return selector.value; // Maestro acepta texto directo

      case 'textContains':
        return { text: selector.value }; // Maestro hace match parcial

      case 'contentDescription':
        return { id: selector.value }; // En Android, content-desc se accede via id

      case 'index':
        const [x, y] = selector.value.split(',');
        return { point: `${x},${y}` };

      default:
        return selector.value;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generate Maestro Command with Fallbacks
  // ─────────────────────────────────────────────────────────────────────────

  static generateMaestroTapCommand(selector: MobileSelector): string {
    const lines: string[] = [];

    // Comando principal
    const primarySelector = this.toMaestroSelector(selector);
    if (typeof primarySelector === 'string') {
      lines.push(`- tapOn: "${primarySelector}"`);
    } else {
      lines.push(`- tapOn:`);
      for (const [key, value] of Object.entries(primarySelector)) {
        lines.push(`    ${key}: "${value}"`);
      }
    }

    // Añadir comentario de confianza
    lines.push(`  # Confidence: ${selector.confidence}% | Type: ${selector.type}`);

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────

  private static isDynamic(str: string): boolean {
    if (!str) return true;
    return this.DYNAMIC_PATTERNS.some(pattern => pattern.test(str));
  }

  private static looksLikeDynamicContent(text: string): boolean {
    // Detectar contenido que probablemente cambie
    const dynamicPatterns = [
      /\d{1,2}:\d{2}/, // Tiempos (12:30)
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Fechas
      /\$[\d,]+\.?\d*/, // Precios
      /^\d+$/, // Solo números
      /hace \d+ (minutos?|horas?|días?)/, // Tiempo relativo español
      /\d+ (minutes?|hours?|days?) ago/, // Tiempo relativo inglés
    ];
    return dynamicPatterns.some(p => p.test(text));
  }

  private static isStableClassName(className: string): boolean {
    // Clases estables típicas de Android/iOS
    const stablePatterns = [
      'Button', 'TextView', 'EditText', 'ImageView', 'ImageButton',
      'CheckBox', 'RadioButton', 'Switch', 'Spinner', 'RecyclerView',
      'ListView', 'ScrollView', 'LinearLayout', 'RelativeLayout',
      'FrameLayout', 'ConstraintLayout', 'CardView', 'FloatingActionButton'
    ];
    return stablePatterns.some(p => className.includes(p));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Calculate Overall Selector Quality
  // ─────────────────────────────────────────────────────────────────────────

  static calculateSelectorQuality(selectors: MobileSelector[]): {
    avgConfidence: number;
    weakSelectors: number;
    strongSelectors: number;
    recommendation: string;
  } {
    if (selectors.length === 0) {
      return {
        avgConfidence: 0,
        weakSelectors: 0,
        strongSelectors: 0,
        recommendation: 'No selectors found'
      };
    }

    const avgConfidence = selectors.reduce((sum, s) => sum + s.confidence, 0) / selectors.length;
    const weakSelectors = selectors.filter(s => s.confidence < 70).length;
    const strongSelectors = selectors.filter(s => s.confidence >= 90).length;

    let recommendation = '';
    if (avgConfidence >= 90) {
      recommendation = 'Excellent: Selectors are highly stable';
    } else if (avgConfidence >= 75) {
      recommendation = 'Good: Most selectors are reliable';
    } else if (avgConfidence >= 60) {
      recommendation = 'Fair: Consider adding accessibility IDs to weak elements';
    } else {
      recommendation = 'Poor: High risk of flaky tests. Add data-testid or accessibility labels';
    }

    return { avgConfidence, weakSelectors, strongSelectors, recommendation };
  }
}

export default SelectorEngine;
