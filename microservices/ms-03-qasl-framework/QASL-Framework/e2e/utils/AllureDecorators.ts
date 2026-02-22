import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

export type AllureSeverity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
export type AllureLayer = 'e2e' | 'api' | 'unit' | 'integration';

export class Allure {
    static async epic(name: string): Promise<void> {
        await allure.epic(name);
    }

    static async feature(name: string): Promise<void> {
        await allure.feature(name);
    }

    static async story(name: string): Promise<void> {
        await allure.story(name);
    }

    static async severity(level: AllureSeverity): Promise<void> {
        await allure.severity(level);
    }

    static async owner(name: string): Promise<void> {
        await allure.owner(name);
    }

    static async layer(layer: AllureLayer): Promise<void> {
        await allure.layer(layer);
    }

    static async tag(name: string): Promise<void> {
        await allure.tag(name);
    }

    static async tags(...names: string[]): Promise<void> {
        await allure.tags(...names);
    }

    static async issue(id: string, url?: string): Promise<void> {
        const issueUrl = url || `https://github.com/E-Gregorio/QASL-NEXUS-LLM/issues/${id}`;
        await allure.issue(id, issueUrl);
    }

    static async testCase(id: string, url?: string): Promise<void> {
        const tmsUrl = url || `https://github.com/E-Gregorio/QASL-NEXUS-LLM/wiki/${id}`;
        await allure.tms(id, tmsUrl);
    }

    static async link(url: string, name?: string, type?: string): Promise<void> {
        await allure.link(url, name, type);
    }

    static async description(text: string): Promise<void> {
        await allure.description(text);
    }

    static async step<T>(name: string, body: () => Promise<T>): Promise<T> {
        return await test.step(name, body);
    }

    static async screenshot(page: { screenshot: () => Promise<Buffer> }, name: string): Promise<void> {
        const screenshot = await page.screenshot();
        await allure.attachment(name, screenshot, 'image/png');
    }

    static async attachment(name: string, content: Buffer | string, contentType: string): Promise<void> {
        await allure.attachment(name, content, contentType);
    }

    static async parameter(name: string, value: string): Promise<void> {
        await allure.parameter(name, value);
    }

    static async label(name: string, value: string): Promise<void> {
        await allure.label(name, value);
    }

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
