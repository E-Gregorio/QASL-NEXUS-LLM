// ============================================================
// API Capture Fixture
// Intercepta XHR/fetch durante E2E y guarda en .api-captures/
// Los scripts run-api.mjs, run-k6.mjs, run-zap.mjs leen de ahi
// ============================================================

import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Dominio target — solo capturar requests a este dominio
const targetOrigin = (() => {
  try { return new URL(process.env.BASE_URL || '').origin; } catch { return ''; }
})();

// APIs capturadas (compartidas entre tests del mismo worker)
const captured: Array<{
  method: string;
  url: string;
  headers: Record<string, string>;
  requestBody?: any;
}> = [];

export const test = base.extend<{}, { apiCapture: void }>({
  // Worker-scoped: corre una vez, teardown escribe el archivo
  apiCapture: [async ({}, use) => {
    await use();
    // Teardown: guardar APIs capturadas
    if (captured.length > 0) {
      const dir = path.join(process.cwd(), '.api-captures');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const pipelineId = process.env.PIPELINE_ID || 'unknown';
      const filePath = path.join(dir, `${pipelineId}-apis.json`);
      fs.writeFileSync(filePath, JSON.stringify(captured, null, 2));
      console.log(`[API Capture] ${captured.length} calls → ${filePath}`);
    } else {
      console.log('[API Capture] 0 API calls detectadas (app client-side)');
    }
  }, { scope: 'worker', auto: true }],

  // Override page: intercepta requests XHR/fetch
  page: async ({ page }, use) => {
    page.on('request', req => {
      // Solo capturar XHR y fetch (APIs reales, no assets)
      if (!['xhr', 'fetch'].includes(req.resourceType())) return;

      const url = req.url();
      if (!url.startsWith('http')) return;

      // Filtrar: solo capturar requests al mismo dominio del target
      // Ignora trackers (google-analytics, doubleclick, criteo, etc.)
      if (targetOrigin) {
        try {
          const reqOrigin = new URL(url).origin;
          if (reqOrigin !== targetOrigin) return;
        } catch { return; }
      }

      let body;
      try {
        body = req.postData() ? JSON.parse(req.postData()) : undefined;
      } catch {
        body = req.postData() || undefined;
      }

      captured.push({
        method: req.method(),
        url,
        headers: req.headers(),
        requestBody: body,
      });
    });
    await use(page);
  },
});

export { expect };
