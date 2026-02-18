import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ALLURE DECORATORS - Shift-Left Testing Traceability
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Decoradores para trazabilidad completa en reportes Allure.
 * Usa allure-playwright para generar labels correctamente.
 *
 * - Epic: Módulo o área del sistema
 * - Feature: Funcionalidad específica
 * - Story: Historia de Usuario (HU)
 * - Severity: Criticidad del test
 * - Tags: Etiquetas para filtrar
 * - Links: Enlaces a Jira, TestRail, etc.
 *
 * Uso en specs:
 * ```typescript
 * import { Allure } from '../utils/AllureDecorators';
 *
 * test.beforeEach(async () => {
 *   await Allure.setup({
 *     epic: 'Gestión de Usuarios',
 *     feature: 'Login',
 *     story: 'HU-001: Login con credenciales válidas',
 *     severity: 'critical'
 *   });
 * });
 * ```
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AllureSeverity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
export type AllureLayer = 'e2e' | 'api' | 'unit' | 'integration';

export class Allure {
    /**
     * Define el Epic (módulo principal del sistema)
     */
    static async epic(name: string): Promise<void> {
        await allure.epic(name);
    }

    /**
     * Define el Feature (funcionalidad específica)
     */
    static async feature(name: string): Promise<void> {
        await allure.feature(name);
    }

    /**
     * Define la Story (Historia de Usuario)
     */
    static async story(name: string): Promise<void> {
        await allure.story(name);
    }

    /**
     * Define la severidad del test
     */
    static async severity(level: AllureSeverity): Promise<void> {
        await allure.severity(level);
    }

    /**
     * Define el Owner (responsable del test)
     */
    static async owner(name: string): Promise<void> {
        await allure.owner(name);
    }

    /**
     * Define la capa de testing
     */
    static async layer(layer: AllureLayer): Promise<void> {
        await allure.layer(layer);
    }

    /**
     * Agrega un tag para filtrado
     */
    static async tag(name: string): Promise<void> {
        await allure.tag(name);
    }

    /**
     * Agrega múltiples tags
     */
    static async tags(...names: string[]): Promise<void> {
        await allure.tags(...names);
    }

    /**
     * Link a Issue en Jira/GitHub
     */
    static async issue(id: string, url?: string): Promise<void> {
        const issueUrl = url || `https://jira.example.com/browse/${id}`;
        await allure.issue(id, issueUrl);
    }

    /**
     * Link a Test Case en TestRail/Xray
     */
    static async testCase(id: string, url?: string): Promise<void> {
        const tmsUrl = url || `https://testrail.example.com/index.php?/cases/view/${id}`;
        await allure.tms(id, tmsUrl);
    }

    /**
     * Link genérico
     */
    static async link(url: string, name?: string, type?: string): Promise<void> {
        await allure.link(url, name, type);
    }

    /**
     * Agrega descripción al test
     */
    static async description(text: string): Promise<void> {
        await allure.description(text);
    }

    /**
     * Inicia un paso en el reporte
     */
    static async step<T>(name: string, body: () => Promise<T>): Promise<T> {
        return await test.step(name, body);
    }

    /**
     * Adjunta un screenshot al reporte
     */
    static async screenshot(page: { screenshot: () => Promise<Buffer> }, name: string): Promise<void> {
        const screenshot = await page.screenshot();
        await allure.attachment(name, screenshot, 'image/png');
    }

    /**
     * Adjunta contenido al reporte
     */
    static async attachment(name: string, content: Buffer | string, contentType: string): Promise<void> {
        await allure.attachment(name, content, contentType);
    }

    /**
     * Agrega parámetro al test
     */
    static async parameter(name: string, value: string): Promise<void> {
        await allure.parameter(name, value);
    }

    /**
     * Agrega label genérico
     */
    static async label(name: string, value: string): Promise<void> {
        await allure.label(name, value);
    }

    /**
     * Configuración completa para un Test Case
     * Uso recomendado en beforeEach
     */
    static async setup(config: {
        epic: string;
        feature: string;
        story: string;
        severity?: AllureSeverity;
        owner?: string;
        tags?: string[];
        issue?: string;
        testCase?: string;
    }): Promise<void> {
        await this.epic(config.epic);
        await this.feature(config.feature);
        await this.story(config.story);
        await this.layer('e2e');

        if (config.severity) await this.severity(config.severity);
        if (config.owner) await this.owner(config.owner);
        if (config.tags) await this.tags(...config.tags);
        if (config.issue) await this.issue(config.issue);
        if (config.testCase) await this.testCase(config.testCase);
    }
}

/**
 * Helper para crear estructura de test con trazabilidad
 */
export function createTestSuite(config: {
    epic: string;
    feature: string;
    story: string;
    testCaseId: string;
    severity?: AllureSeverity;
    owner?: string;
    tags?: string[];
}) {
    return {
        beforeEach: async () => {
            await Allure.setup({
                epic: config.epic,
                feature: config.feature,
                story: config.story,
                severity: config.severity || 'normal',
                owner: config.owner,
                tags: config.tags,
                testCase: config.testCaseId
            });
        }
    };
}
