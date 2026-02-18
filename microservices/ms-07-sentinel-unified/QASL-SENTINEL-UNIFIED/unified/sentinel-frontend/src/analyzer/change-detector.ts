// ============================================
// QASL-GUARDIAN - Change Detector
// ============================================

import { PageSnapshot, ChangeDetection, DOMElement, InteractiveElement } from '../types.js';
import { diffLines } from 'diff';
import chalk from 'chalk';

export class ChangeDetector {
  private verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
  }

  detectChanges(previous: PageSnapshot, current: PageSnapshot): ChangeDetection[] {
    this.log(`🔍 Comparing snapshots for: ${current.url}`);
    const changes: ChangeDetection[] = [];

    // 1. Detect added/removed elements
    changes.push(...this.detectElementChanges(previous.dom, current.dom));

    // 2. Detect interactive element changes
    changes.push(...this.detectInteractiveChanges(previous.interactive, current.interactive));

    // 3. Detect HTML structure changes (major)
    changes.push(...this.detectHTMLChanges(previous.html, current.html));

    this.log(`✅ Found ${changes.length} changes`);
    return changes;
  }

  private detectElementChanges(oldDOM: DOMElement[], newDOM: DOMElement[]): ChangeDetection[] {
    const changes: ChangeDetection[] = [];

    // Create maps for comparison
    const oldMap = new Map(oldDOM.map(el => [this.getElementKey(el), el]));
    const newMap = new Map(newDOM.map(el => [this.getElementKey(el), el]));

    // Detect removed elements
    oldMap.forEach((el, key) => {
      if (!newMap.has(key)) {
        changes.push({
          url: '',
          changeType: 'removed',
          severity: this.calculateSeverity(el),
          element: el,
          affectedLocators: this.extractLocators(el),
          description: `Element removed: ${el.tag}${el.id ? `#${el.id}` : ''}${el.class ? `.${el.class}` : ''}`,
        });
      }
    });

    // Detect added elements
    newMap.forEach((el, key) => {
      if (!oldMap.has(key)) {
        changes.push({
          url: '',
          changeType: 'added',
          severity: this.calculateSeverity(el),
          element: el,
          affectedLocators: this.extractLocators(el),
          description: `Element added: ${el.tag}${el.id ? `#${el.id}` : ''}${el.class ? `.${el.class}` : ''}`,
        });
      }
    });

    // Detect modified elements (same key, different attributes)
    oldMap.forEach((oldEl, key) => {
      const newEl = newMap.get(key);
      if (newEl) {
        const modifications = this.compareElementAttributes(oldEl, newEl);
        if (modifications.length > 0) {
          modifications.forEach(mod => changes.push(mod));
        }
      }
    });

    return changes;
  }

  private detectInteractiveChanges(oldInteractive: InteractiveElement[], newInteractive: InteractiveElement[]): ChangeDetection[] {
    const changes: ChangeDetection[] = [];

    const oldMap = new Map(oldInteractive.map(el => [el.locator, el]));
    const newMap = new Map(newInteractive.map(el => [el.locator, el]));

    // Removed interactive elements
    oldMap.forEach((el, locator) => {
      if (!newMap.has(locator)) {
        changes.push({
          url: '',
          changeType: 'removed',
          severity: 'high',
          element: {
            tag: el.type,
            attributes: { locator },
            xpath: locator,
            cssPath: locator,
          },
          affectedLocators: [locator],
          description: `Interactive element removed: ${el.type} "${el.label || locator}"`,
        });
      }
    });

    // Added interactive elements
    newMap.forEach((el, locator) => {
      if (!oldMap.has(locator)) {
        changes.push({
          url: '',
          changeType: 'added',
          severity: 'medium',
          element: {
            tag: el.type,
            attributes: { locator },
            xpath: locator,
            cssPath: locator,
          },
          affectedLocators: [locator],
          description: `Interactive element added: ${el.type} "${el.label || locator}"`,
        });
      }
    });

    // Modified (disabled/enabled state changes)
    oldMap.forEach((oldEl, locator) => {
      const newEl = newMap.get(locator);
      if (newEl) {
        if (oldEl.enabled !== newEl.enabled) {
          changes.push({
            url: '',
            changeType: 'modified',
            severity: 'medium',
            element: {
              tag: newEl.type,
              attributes: { locator },
              xpath: locator,
              cssPath: locator,
            },
            oldValue: oldEl.enabled ? 'enabled' : 'disabled',
            newValue: newEl.enabled ? 'enabled' : 'disabled',
            affectedLocators: [locator],
            description: `Element state changed: ${locator} now ${newEl.enabled ? 'enabled' : 'disabled'}`,
          });
        }
      }
    });

    return changes;
  }

  private detectHTMLChanges(oldHTML: string, newHTML: string): ChangeDetection[] {
    const changes: ChangeDetection[] = [];
    const diff = diffLines(oldHTML, newHTML);

    let majorChanges = 0;

    diff.forEach(part => {
      if (part.added || part.removed) {
        // Count significant changes (>100 chars = major structural change)
        if (part.value.length > 100) {
          majorChanges++;
        }
      }
    });

    if (majorChanges > 5) {
      changes.push({
        url: '',
        changeType: 'modified',
        severity: 'critical',
        element: {
          tag: 'html',
          attributes: {},
          xpath: '/html',
          cssPath: 'html',
        },
        affectedLocators: ['*'],
        description: `Major HTML structure change detected (${majorChanges} significant diffs)`,
      });
    }

    return changes;
  }

  private getElementKey(el: DOMElement): string {
    // Unique key for element comparison
    if (el.id) return `${el.tag}#${el.id}`;
    if (el.attributes.name) return `${el.tag}[name="${el.attributes.name}"]`;
    return `${el.tag}${el.class ? `.${el.class}` : ''}:${el.xpath}`;
  }

  private compareElementAttributes(oldEl: DOMElement, newEl: DOMElement): ChangeDetection[] {
    const changes: ChangeDetection[] = [];

    // Compare critical attributes
    const criticalAttrs = ['id', 'class', 'name', 'type', 'href', 'src'];

    criticalAttrs.forEach(attr => {
      const oldValue = oldEl.attributes[attr];
      const newValue = newEl.attributes[attr];

      if (oldValue !== newValue) {
        changes.push({
          url: '',
          changeType: 'modified',
          severity: attr === 'id' || attr === 'name' ? 'high' : 'medium',
          element: newEl,
          oldValue,
          newValue,
          affectedLocators: this.extractLocators(newEl),
          description: `Attribute '${attr}' changed: "${oldValue}" → "${newValue}" on ${newEl.tag}`,
        });
      }
    });

    return changes;
  }

  private calculateSeverity(el: DOMElement): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: form elements, buttons
    if (['button', 'input', 'select', 'form'].includes(el.tag)) return 'critical';
    
    // High: links, important containers
    if (el.tag === 'a' || (el.id && el.tag === 'div')) return 'high';
    
    // Medium: headers
    if (['h1', 'h2', 'h3'].includes(el.tag)) return 'medium';
    
    return 'low';
  }

  private extractLocators(el: DOMElement): string[] {
    const locators: string[] = [];

    if (el.id) locators.push(`#${el.id}`);
    if (el.cssPath) locators.push(el.cssPath);
    if (el.xpath) locators.push(el.xpath);
    if (el.attributes.name) locators.push(`[name="${el.attributes.name}"]`);

    return locators;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(chalk.yellow(`[ChangeDetector] ${message}`));
    }
  }
}
