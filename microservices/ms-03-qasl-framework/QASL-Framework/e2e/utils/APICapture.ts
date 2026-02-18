import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Interfaz para almacenar información de APIs capturadas
 */
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

/**
 * Helper para capturar APIs durante la ejecución de tests E2E
 *
 * Uso:
 * ```typescript
 * const apiCapture = new APICapture(page, 'TS-001');
 * await apiCapture.start();
 * // ... ejecutar test ...
 * await apiCapture.save();
 * ```
 */
export class APICapture {
    private page: Page;
    private testName: string;
    private capturedAPIs: CapturedAPI[] = [];
    private isCapturing: boolean = false;

    constructor(page: Page, testName: string) {
        this.page = page;
        this.testName = testName;
    }

    /**
     * Inicia la captura de APIs
     */
    async start() {
        if (process.env.RECORD_HAR !== 'true') {
            console.log('⏭️  API capture disabled (set RECORD_HAR=true to enable)');
            return;
        }

        this.isCapturing = true;
        console.log('🎥 Starting API capture...');

        // Usar listener de respuestas en lugar de route para ser menos intrusivo
        this.page.on('response', async (response) => {
            const url = response.url();
            const request = response.request();

            // Solo capturar si es una API válida
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
                    console.log(`📡 Captured: ${request.method()} ${url}`);
                } catch (error) {
                    // Ignorar errores silenciosamente
                }
            }
        });
    }

    /**
     * Determina si una URL debe ser capturada
     */
    private shouldCaptureURL(url: string): boolean {
        // Excluir URLs de terceros y assets estáticos
        const excludePatterns = [
            /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map)(\?|$)/i,
            /\/(static|assets)\//i,
            /node_modules/i,
            /@vue\/devtools/i,
            /vue-router/i,
            /google/i,
            /facebook/i,
            /analytics/i,
            /ads/i,
            /doubleclick/i,
            /stat-rock/i,
            /blismedia/i,
            /33across/i,
            /id5-sync/i,
            /pubmatic/i,
            /rubiconproject/i,
            /adsafeprotected/i,
            /adnxs/i,
            /criteo/i,
            /taboola/i,
            /outbrain/i,
        ];

        if (excludePatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Incluir solo si parece ser una API del dominio principal
        const includePatterns = [
            /\/api\//i,
            /\/v[0-9]+\//i, // /v1/, /v2/, etc.
            /\/graphql/i,
            /\/rest\//i,
            /demoqa\.com\/.*(?:Account|BookStore)/i, // DemoQA APIs
            /sipq\.minseg\.gob\.ar.*\/api\//i, // SIPQ APIs
        ];

        return includePatterns.some(pattern => pattern.test(url));
    }

    /**
     * Parsea el body de una request
     */
    private parseBody(body: string): any {
        try {
            return JSON.parse(body);
        } catch {
            return body;
        }
    }

    /**
     * Guarda las APIs capturadas en un archivo JSON
     */
    async save() {
        if (!this.isCapturing) {
            console.log('ℹ️  API capture was not enabled');
            return;
        }

        if (this.capturedAPIs.length === 0) {
            console.log('ℹ️  No APIs captured');
            return;
        }

        const outputDir = path.resolve(process.cwd(), '.api-captures');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `${this.testName.toLowerCase()}-apis.json`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(this.capturedAPIs, null, 2), 'utf-8');
        console.log(`✅ Saved ${this.capturedAPIs.length} APIs to: ${filepath}`);

        return filepath;
    }

    /**
     * Obtiene las APIs capturadas
     */
    getAPIs(): CapturedAPI[] {
        return this.capturedAPIs;
    }

    /**
     * Obtiene el conteo de APIs capturadas
     */
    getCount(): number {
        return this.capturedAPIs.length;
    }
}
