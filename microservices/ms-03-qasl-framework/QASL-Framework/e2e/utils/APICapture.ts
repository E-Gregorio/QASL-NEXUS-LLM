import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface CapturedAPI {
    method: string;
    url: string;
    headers: Record<string, string>;
    requestBody?: any;
    response?: {
        status: number;
        headers: Record<string, string>;
        body?: any;
    };
    timestamp: number;
}

export class APICapture {
    private page: Page;
    private testName: string;
    private capturedAPIs: CapturedAPI[] = [];
    private isCapturing: boolean = false;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.testName = testName;
    }

    async start(): Promise<void> {
        if (process.env.RECORD_HAR !== 'true') return;

        this.isCapturing = true;

        this.page.on('response', async (response) => {
            const url = response.url();
            const request = response.request();

            if (this.shouldCaptureURL(url)) {
                try {
                    let responseBody;
                    try {
                        responseBody = await response.json();
                    } catch {
                        try {
                            responseBody = await response.text();
                        } catch {
                            responseBody = null;
                        }
                    }

                    const capturedAPI: CapturedAPI = {
                        method: request.method(),
                        url: url,
                        headers: request.headers(),
                        requestBody: request.postData() ? this.parseBody(request.postData()!) : undefined,
                        response: {
                            status: response.status(),
                            headers: response.headers(),
                            body: responseBody
                        },
                        timestamp: Date.now()
                    };

                    this.capturedAPIs.push(capturedAPI);
                } catch {
                    // silent
                }
            }
        });
    }

    private shouldCaptureURL(url: string): boolean {
        const excludePatterns = [
            /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map)(\?|$)/i,
            /\/(static|assets)\//i,
            /node_modules/i,
            /google|facebook|analytics|ads|doubleclick/i,
        ];

        if (excludePatterns.some(pattern => pattern.test(url))) return false;

        const includePatterns = [
            /\/api\//i,
            /\/v[0-9]+\//i,
            /\/graphql/i,
            /\/rest\//i,
        ];

        return includePatterns.some(pattern => pattern.test(url));
    }

    private parseBody(body: string): any {
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }

    async save(): Promise<string | undefined> {
        if (!this.isCapturing || this.capturedAPIs.length === 0) return;

        const outputDir = path.resolve(process.cwd(), '.api-captures');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `${this.testName.toLowerCase()}-apis.json`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(this.capturedAPIs, null, 2), 'utf-8');
        return filepath;
    }

    getAPIs(): CapturedAPI[] {
        return this.capturedAPIs;
    }

    getCount(): number {
        return this.capturedAPIs.length;
    }
}
