# GUIA TECNICA: Demo Live API + AI Report

## Configuracion Detallada del Test E2E con Inteligencia Artificial

**Archivo:** `e2e/specs/demo-live-api-ai-report.spec.ts`
**Autor:** EPIDATA - Team QA
**Fecha de creacion:** 2026-02-24
**Version:** 1.0

---

## Indice

1. [Descripcion General](#1-descripcion-general)
2. [Arquitectura del Test](#2-arquitectura-del-test)
3. [Pre-requisitos](#3-pre-requisitos)
4. [Configuracion Inicial](#4-configuracion-inicial)
5. [Interceptor de Red (API en Vivo)](#5-interceptor-de-red-api-en-vivo)
6. [Overlay Visual (Sidebar Backend en Vivo)](#6-overlay-visual-sidebar-backend-en-vivo)
7. [Flujo Completo Paso a Paso (9 Modulos)](#7-flujo-completo-paso-a-paso-9-modulos)
8. [Modulo 9: Integracion con Google Gemini AI](#8-modulo-9-integracion-con-google-gemini-ai)
9. [Generacion del PDF Profesional](#9-generacion-del-pdf-profesional)
10. [Ejecucion y Comandos](#10-ejecucion-y-comandos)
11. [Estructura de Archivos Generados](#11-estructura-de-archivos-generados)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Descripcion General

Este test es un **flujo E2E completo** que recorre los 8 modulos del sistema SIGMA de AGIP, captura **todas las llamadas API en tiempo real** mostrando un panel visual en pantalla, y al finalizar **navega a Google Gemini** para generar automaticamente un **informe profesional en PDF** con los datos reales de la ejecucion.

### Que hace exactamente

```
┌─────────────────────────────────────────────────────────────────┐
│  SIGMA E2E (8 modulos)                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ M1   │→│ M2   │→│ M3   │→│ M4   │→│ M5   │→│ M6   │       │
│  │Dash  │ │Alta  │ │Selecc│ │Exped │ │Aprob │ │Fiscal│       │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
│       ↓                                                        │
│  ┌──────┐ ┌──────┐                                             │
│  │ M7   │→│ M8   │  ← Cada modulo muestra las APIs en vivo    │
│  │Aprob │ │SADE  │                                              │
│  │Cargo │ │Docs  │                                              │
│  └──────┘ └──────┘                                              │
│       ↓                                                        │
│  ┌─────────────────────────────────┐                           │
│  │ M9: GOOGLE GEMINI AI           │                            │
│  │ → Envia datos reales del E2E   │                            │
│  │ → Gemini genera reporte        │                            │
│  │ → Renderiza HTML profesional   │                            │
│  │ → Exporta PDF A4               │                            │
│  └─────────────────────────────────┘                           │
│       ↓                                                        │
│  ┌─────────────────────────────────┐                           │
│  │ FINALIZACION                    │                            │
│  │ → Panel resumen en pantalla     │                            │
│  │ → Reporte visible para video    │                            │
│  │ → JSON con traza completa       │                            │
│  └─────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Valor diferencial

- **Demo en vivo:** Todo ocurre en pantalla, ideal para presentaciones
- **APIs visibles:** Panel lateral muestra cada request/response del backend
- **IA integrada:** El reporte NO es un template estatico, es generado por Gemini con datos reales
- **PDF profesional:** Formato corporativo AGIP/EPIDATA listo para enviar

---

## 2. Arquitectura del Test

```
demo-live-api-ai-report.spec.ts
├── Imports
│   ├── TestBase (Playwright fixtures)
│   ├── Allure (reporting metadata)
│   ├── TestData (configuracion ambiente)
│   ├── CSVGenerator (datos de prueba)
│   ├── visualHelpers (mensajes en pantalla)
│   └── fs (filesystem para guardar reportes)
│
├── Constantes
│   └── GEMINI_URL = 'https://gemini.google.com/app'
│
├── Configuracion Playwright
│   ├── viewport: null (pantalla completa)
│   ├── --start-maximized
│   └── slowMo: 100 (pausa visual entre acciones)
│
├── Helper: enviarMensajeAGemini()
│   ├── Localizar campo editable
│   ├── Insertar texto con execCommand
│   ├── Enviar (boton o Enter)
│   ├── Esperar respuesta completa
│   └── Capturar texto + HTML renderizado
│
├── Test Principal
│   ├── Variables de estado
│   │   ├── currentModule (modulo activo)
│   │   ├── apiLog[] (registro de todas las APIs)
│   │   ├── expedienteLote / expedienteCargo
│   │   └── responseHtml / reporteHtmlCompleto
│   │
│   ├── Interceptor de Red (page.on 'response')
│   ├── Sidebar API Visual (mostrarApiOverlay)
│   ├── Modulos 1-8 (flujo SIGMA + SADE)
│   ├── Modulo 9 (Gemini AI)
│   └── Finalizacion (resumen + PDF)
```

---

## 3. Pre-requisitos

### Ambiente

| Componente              | Detalle                                |
| ----------------------- | -------------------------------------- |
| **Node.js**       | v18+                                   |
| **Playwright**    | `@playwright/test` instalado         |
| **Navegador**     | Chromium (viene con Playwright)        |
| **VPN**           | Conectada a red AGIP                   |
| **Sesion Google** | Logueada en el navegador (para Gemini) |

### Dependencias del proyecto

```bash
npm install @playwright/test allure-playwright
```

### Archivos requeridos

| Archivo                        | Proposito                                      |
| ------------------------------ | ---------------------------------------------- |
| `e2e/test-base/TestBase.ts`  | Fixtures de Playwright (Page Objects)          |
| `e2e/config/TestData.ts`     | Datos de ambiente (URLs, credenciales, tokens) |
| `e2e/utils/CSVGenerator.ts`  | Genera CSV con CUIT aleatorio                  |
| `e2e/utils/visualHelpers.ts` | Funciones `mostrarMensaje()` y `logger`    |
| `e2e/pages/*.ts`             | Page Objects de cada modulo                    |

---

## 4. Configuracion Inicial

### 4.1 Viewport y lanzamiento

```typescript
// Linea 28-34
test.use({
    viewport: null,              // No forzar resolucion, usar pantalla real
    launchOptions: {
        args: ['--start-maximized'],  // Abrir maximizado
        slowMo: 100,                  // 100ms entre cada accion (efecto visual)
    },
});
```

**Por que:** Al ser una demo visual, necesitamos pantalla completa y un ritmo que permita ver cada accion.

### 4.2 Timeout del test

```typescript
// Linea 252
test.setTimeout(900000); // 15 minutos
```

**Por que:** El flujo completo (8 modulos SIGMA + SADE + Gemini) tarda entre 8-12 minutos. Los 15 minutos dan margen para ambientes lentos.

### 4.3 Variables de estado

```typescript
// Linea 270-280
const csvData = CSVGenerator.crearCSVParaTest('DEMO');
const cuit = csvData.cuit;              // CUIT aleatorio generado
const csvPath = csvData.rutaCSV;        // Ruta al CSV creado
let expedienteLote = '';                // Se llena en Modulo 5
let expedienteCargo = '';               // Se llena en Modulo 5
let responseHtml = '';                  // HTML de respuesta Gemini
let reporteHtmlCompleto = '';           // HTML del PDF final

const page = dashboardPage.page;
const SCREENSHOTS_DIR = 'reports/screenshots';
```

---

## 5. Interceptor de Red (API en Vivo)

### 5.1 Estructura del registro

Cada llamada API se registra con esta estructura:

```typescript
// Linea 286-297
const apiLog: Array<{
    module: string;        // Modulo que genero la llamada
    method: string;        // GET, POST, PATCH, DELETE
    endpoint: string;      // /approvals/query, /expedient/generate, etc.
    status: number;        // 200, 400, 504, etc.
    dataCount: number | null;  // Cantidad de registros si data[] es array
    bodyPreview: string;   // Primeros 250 chars del body
    hasError: boolean;     // status >= 400 o 504 en body
    is504: boolean;        // Gateway Timeout (status o body)
    isEmpty: boolean;      // data:[] o body vacio
    timestamp: string;     // ISO timestamp
}> = [];
```

### 5.2 Como funciona el interceptor

```typescript
// Linea 384-450
page.on('response', async (response) => {
    // 1. Filtrar solo fetch/xhr (no imagenes, CSS, etc.)
    const request = response.request();
    if (request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr') return;
    if (request.method() === 'OPTIONS') return;  // Ignorar preflight CORS

    // 2. Filtrar APIs internas de Gemini (cuando estamos en Modulo 9)
    if (currentModule === 'REPORTE_IA') {
        const geminiInternalPatterns = [
            'BardChatUi', 'batchexecute', 'StreamGenerate', ...
        ];
        if (geminiInternalPatterns.some(p => url.includes(p))) return;
    }

    // 3. Parsear body y contar registros
    let bodyText = await response.text();
    const json = JSON.parse(bodyText);
    if (json.data && Array.isArray(json.data)) dataCount = json.data.length;

    // 4. Detectar 504 (status o body con "gateway timeout")
    const is504 = status === 504 ||
        (bodyLower.includes('gateway timeout') && dataCount === null);

    // 5. Registrar en apiLog y mostrar en consola
    apiLog.push({ module: currentModule, method, endpoint, status, ... });
    console.log(`  🟢 [${currentModule}] ${method} ${status} ${endpoint}`);
});
```

**Patron clave:** El interceptor se registra UNA vez y captura TODO el trafico de la sesion. La variable `currentModule` se actualiza en cada modulo para categorizar las llamadas.

### 5.3 Deteccion de errores

| Condicion                     | Icono | Significado                        |
| ----------------------------- | ----- | ---------------------------------- |
| `status >= 400` o `is504` | 🔴    | Error critico                      |
| `data: []` o body vacio     | 🟡    | Respuesta vacia (puede ser normal) |
| `status < 400` con datos    | 🟢    | Exito                              |

### 5.4 Deteccion inteligente de 504

```typescript
// No todo "504" en el body es un error real
const is504 = status === 504 ||
    ((bodyLower.includes('gateway time-out') || bodyLower.includes('gateway timeout'))
     && dataCount === null);
```

**Leccion aprendida:** SIGMA a veces devuelve HTTP 200 pero con "gateway timeout" en el body HTML. Solo se marca como error si el status ES 504 o si el body contiene el texto Y no es JSON valido.

---

## 6. Overlay Visual (Sidebar Backend en Vivo)

### 6.1 Panel lateral derecho

```typescript
// Linea 302-370
async function mostrarApiOverlay(targetPage: any, modulo: string) {
    const moduleResponses = apiLog.filter(r => r.module === modulo);
    const recientes = moduleResponses.slice(-6);  // Ultimas 6 llamadas

    await targetPage.evaluate(({ responses, mod }) => {
        let panel = document.getElementById('api-live-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'api-live-panel';
            document.body.appendChild(panel);
        }

        panel.style.cssText = `
            position: fixed;
            top: 8px; right: 8px;
            width: 380px;
            background: rgba(10,10,18,0.95);
            pointer-events: none;      // ← CLAVE: no bloquea clicks
            z-index: 999999;
            border: 2px solid #1a73e8;
        `;
        // ... renderizar HTML con cada API call
    });
}
```

### 6.2 Caracteristicas del panel

| Propiedad                           | Valor                   | Motivo                               |
| ----------------------------------- | ----------------------- | ------------------------------------ |
| `position: fixed`                 | Fijo en pantalla        | No se mueve con scroll               |
| `pointer-events: none`            | No interactivo          | **No bloquea clicks del test** |
| `z-index: 999999`                 | Maximo                  | Siempre visible sobre la app         |
| `width: 380px`                    | Panel lateral           | No tapa el contenido principal       |
| `background: rgba(10,10,18,0.95)` | Oscuro semitransparente | Contraste con la app                 |

### 6.3 Que muestra cada entrada

```
┌──────────────────────────────────────────┐
│          BACKEND EN VIVO                 │
│          ALTA_INCONSISTENCIAS            │
│──────────────────────────────────────────│
│ ● POST 200 [841 reg]                    │
│   /inconsistencies/query                 │
│   {"data":[...],"totalCount":841}        │
│──────────────────────────────────────────│
│ ● POST 200                              │
│   /inconsistencies/lote-import           │
│   {"success":true}                       │
│──────────────────────────────────────────│
│ 🔴 POST 504  504 TIMEOUT                │
│   /expedient/candidate/903/generate      │
│   <html>Gateway Time-out</html>          │
│──────────────────────────────────────────│
│        6 respuestas capturadas           │
└──────────────────────────────────────────┘
```

### 6.4 Funcion ocultar

```typescript
async function ocultarApiOverlay(targetPage: any) {
    await targetPage.evaluate(() => {
        const panel = document.getElementById('api-live-panel');
        if (panel) panel.remove();
    });
}
```

Se oculta al cambiar de modulo y al navegar al Dashboard.

---

## 7. Flujo Completo Paso a Paso (9 Modulos)

### Modulo 1: Dashboard

```
Lineas: 455-466
```

| Paso | Accion                  | Funcion                                           |
| ---- | ----------------------- | ------------------------------------------------- |
| 1    | Navegar a SIGMA         | `dashboardPage.navegar()`                       |
| 2    | Mostrar bienvenida      | `mostrarMensaje('Bienvenido al Sistema SIGMA')` |
| 3    | Validar carga           | `dashboardPage.validarSistemaSigma()`           |
| 4    | Mostrar APIs capturadas | `mostrarApiOverlay(page, 'DASHBOARD')`          |

**APIs tipicas:** `GET /login`, `GET /security/feature-flags`

---

### Modulo 2: Alta de Inconsistencias

```
Lineas: 471-546
```

| Paso | Accion                     | Detalle                                       |
| ---- | -------------------------- | --------------------------------------------- |
| 1    | Click Alta Inconsistencias | Desde el Dashboard                            |
| 2    | Importar CSV               | CSV generado con CUIT aleatorio               |
| 3    | Completar info general     | Tributo: ISIB, Campana, Linea, Motivo         |
| 4    | Actualizar informacion     | Click boton para refrescar tabla              |
| 5    | Buscar CUIT                | Verificar que aparece en la tabla             |
| 6    | Generar Lote               | Seleccionar CUIT → Generar Lote → Confirmar |
| 7    | Actualizar y verificar     | Esperar procesamiento SADE                    |
| 8    | Volver al Dashboard        | Navegar a inicio                              |

**Parametros de Alta:**

```typescript
await altaInconsistenciasPage.completarInfoGeneralYConfirmar(
    'ISIB',                                           // Tributo
    'Recategorización RS CAT (A,B,C,D,E,F,G,H,I,J)', // Campana
    'Denuncia',                                       // Linea investigacion
    'Actividad no declarada'                          // Motivo
);
```

**APIs tipicas:** `POST /inconsistencies/query`, `POST /inconsistencies/lote-import`, `POST /inconsistencies/sade/generate-lot`

---

### Modulo 3: Seleccion de Candidatos

```
Lineas: 552-612
```

| Paso | Accion                | Detalle                             |
| ---- | --------------------- | ----------------------------------- |
| 1    | Acceder al modulo     | Desde Dashboard                     |
| 2    | Buscar CUIT           | Con reintentos (SADE puede tardar)  |
| 3    | Cambiar ponderacion   | `ALTA`                            |
| 4    | Cambiar fiscalizacion | `PRESENCIAL`                      |
| 5    | Generar Lote          | Seleccionar → Generar → Confirmar |
| 6    | Volver al Dashboard   |                                     |

**APIs tipicas:** `POST /selections/query`, `PATCH /selections/weighting`, `PATCH /inspection/bulk-inspection`, `POST /selections/generate-lot`

---

### Modulo 4: Generar Expedientes

```
Lineas: 618-674
```

| Paso | Accion                    | Detalle                         |
| ---- | ------------------------- | ------------------------------- |
| 1    | Acceder al modulo         |                                 |
| 2    | Buscar CUIT               |                                 |
| 3    | Seleccionar contribuyente |                                 |
| 4    | Generar Expediente        | Relevancia penal: NO, Subir PDF |
| 5    | Confirmar generacion      | Modal → Generar                |
| 6    | Validar expediente creado |                                 |
| 7    | Actualizar informacion    | Refrescar tabla                 |

**APIs tipicas:** `POST /expedient/query`, `POST /expedient/candidate/{id}/generate`

---

### Modulo 5: Aprobaciones Expediente

```
Lineas: 680-741
```

| Paso | Accion                         | Detalle                                      |
| ---- | ------------------------------ | -------------------------------------------- |
| 1    | Acceder al modulo              |                                              |
| 2    | Buscar CUIT                    | **Con 3 reintentos** (cola SADE lenta) |
| 3    | Seleccionar contribuyente      |                                              |
| 4    | Aprobar expediente             | Modal con expediente Lote y Cargo            |
| 5    | **Capturar expedientes** | `expedienteLote` y `expedienteCargo`     |

**Dato clave:** Este modulo captura los numeros de expediente SADE que se usan en el Modulo 8 (SADE) y en el Modulo 9 (reporte IA).

```typescript
const expedientes = await aprobacionesPage.capturarExpedientesDesdeModal();
expedienteLote = expedientes.lote;    // EX-2026-00519159-GCABA-DGR
expedienteCargo = expedientes.cargo;  // EX-2026-00519162-GCABA-DGR
```

**APIs tipicas:** `POST /approvals/query`, `POST /expedient/approval`

---

### Modulo 6: Fiscalizacion

```
Lineas: 747-811
```

| Paso | Accion                    | Detalle                                       |
| ---- | ------------------------- | --------------------------------------------- |
| 1    | Buscar CUIT               |                                               |
| 2    | Asignar Cargo             | Modal: Plan Integral, Periodo 01/2026-12/2026 |
| 3    | Clasificacion             | Valor: 1                                      |
| 4    | Click Asignar Cargo       |                                               |
| 5    | Cerrar modal              |                                               |
| 6    | **Confirmar Cargo** | Segundo paso obligatorio                      |
| 7    | Cerrar modal confirmacion |                                               |

**APIs tipicas:** `POST /inspection/query`, `GET /inspection/find-charge/{id}`, `GET /inspectors`, `PATCH /inspection/assign-charge`, `PATCH /inspection/confirm-charge`

---

### Modulo 7: Aprobaciones Cargo

```
Lineas: 817-887
```

| Paso | Accion                      | Detalle                                         |
| ---- | --------------------------- | ----------------------------------------------- |
| 1    | Acceder a Aprobaciones      |                                                 |
| 2    | Seleccionar pestana Cargo   | `page.getByRole('button', { name: 'Cargo' })` |
| 3    | Buscar CUIT                 |                                                 |
| 4    | **Evaluar resultado** | PASS o BUG detectado                            |

**Bug conocido:** El backend NO propaga el estado del cargo confirmado en Fiscalizacion hacia Aprobaciones. El CUIT no aparece en la tabla.

```typescript
if (cargoVisible) {
    // Cargo encontrado → Aprobar
    await aprobacionesPage.clickAprobar();
    logger.exito('Cargo aprobado');
} else {
    // BUG: Banner rojo + screenshot + continuar
    logger.error('BUG: Cargo NO encontrado en Aprobaciones');
    // Renderiza banner rojo en pantalla
    // Toma screenshot de evidencia
    // Continua al siguiente modulo
}
```

**Evidencia visual del bug:**

```
┌──────────────────────────────────────────────────────────────────┐
│  BUG DETECTADO: CUIT 20904554338 - Cargo confirmado en          │
│  Fiscalizacion pero NO aparece en Aprobaciones                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Modulo 8: SADE (Sistema de Administracion de Documentos Electronicos)

```
Lineas: 893-1003
```

| Paso | Accion                      | Detalle                                        |
| ---- | --------------------------- | ---------------------------------------------- |
| 1    | Login SADE                  | Credenciales TestData.sade                     |
| 2    | Ingresar Modulo EE          | Expediente Electronico                         |
| 3    | Buscar Exp. LOTE            | `sadePage.buscarExpediente(expedienteLote)`  |
| 4    | Visualizar Exp. LOTE        | Acciones → Visualizar                         |
| 5    | Documentos de Trabajo LOTE  | Validar pestana y screenshot                   |
| 6    | Cerrar modal LOTE           |                                                |
| 7    | Buscar Exp. CARGO           | `sadePage.buscarExpediente(expedienteCargo)` |
| 8    | Visualizar Exp. CARGO       |                                                |
| 9    | Documentos de Trabajo CARGO | Screenshot                                     |
| 10   | Cerrar modal CARGO          |                                                |

**Nota tecnica - ZK Framework:** SADE usa ZK Framework que requiere:

- JavaScript clicks (no Playwright clicks nativos)
- IDs dinamicos (z_xxx) → buscar por clase/texto
- No tiene REST API → validacion visual

---

## 8. Modulo 9: Integracion con Google Gemini AI

### 8.1 Navegacion a Gemini

```typescript
// Linea 1009-1022
await page.goto(GEMINI_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);  // Esperar carga completa de Gemini
```

**Requisito:** El navegador debe tener sesion de Google activa (cookies de login).

### 8.2 Funcion enviarMensajeAGemini()

Esta es la funcion core que interactua con Gemini. Tiene 5 pasos:

#### Paso 1: Localizar campo editable

```typescript
// Linea 48-65
const editableSelectors = [
    '.ql-editor[contenteditable="true"]',          // Quill editor
    'div[contenteditable="true"][role="textbox"]',  // Textbox generico
    'div.ql-editor.textarea',                      // Variante Quill
    'rich-textarea div[contenteditable="true"]',    // Rich textarea
    'div[contenteditable="true"]',                  // Fallback generico
];
```

**Por que multiples selectores:** Gemini actualiza su UI frecuentemente. La cascada de selectores garantiza compatibilidad.

#### Paso 2: Insertar texto con execCommand

```typescript
// Linea 79-97
const inserted = await page.evaluate((texto: string) => {
    const editors = document.querySelectorAll('[contenteditable="true"]');
    for (const editor of editors) {
        const el = editor as HTMLElement;
        if (el.offsetHeight > 0 && el.offsetWidth > 0) {
            el.focus();
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.selectNodeContents(el);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            document.execCommand('insertText', false, texto);
            return el.textContent?.length || 0;
        }
    }
    return 0;
}, textoLimpio);
```

**Por que `execCommand` y no `page.fill()`:** Gemini usa **Trusted Types CSP** que bloquea `innerHTML` directo. `execCommand('insertText')` es compatible con esta politica de seguridad.

**Fallback (Linea 101-119):** Si `execCommand` inserta menos de 50 caracteres, usa `textContent` directo con `dispatchEvent('input')`.

#### Paso 3: Enviar mensaje

```typescript
// Linea 125-146
const sendButtonSelectors = [
    'button[aria-label="Send message"]',
    'button[aria-label="Enviar mensaje"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Enviar"]',
    'button[data-mat-icon-name="send"]',
    'button.send-button',
];
// Si ningun boton funciona → page.keyboard.press('Enter')
```

#### Paso 4: Esperar respuesta completa

```typescript
// Linea 152-167
await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const isGenerating = buttons.some(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('stop') || text.includes('detener') ||
               ariaLabel.includes('stop') || ariaLabel.includes('cancel');
    });
    return !isGenerating;  // Esperar a que desaparezca el boton "Stop"
}, { timeout: 120000 });   // Maximo 2 minutos
```

**Logica:** Mientras Gemini esta generando, muestra un boton "Stop/Detener". Cuando desaparece, la respuesta esta completa.

#### Paso 5: Capturar respuesta (texto + HTML)

```typescript
// Linea 175-237
const markdownSelectors = [
    'div.markdown',
    'div[class*="markdown"]',
    'message-content div.markdown',
    'model-response message-content',
];
// Captura innerText (texto plano) e innerHTML (HTML renderizado)
responseText = await elements.last().innerText();
responseHtml = await elements.last().innerHTML();
```

**Captura dual:** Se obtiene el texto plano (para el .txt) y el HTML renderizado por Gemini (para el PDF con formato de tablas, negritas, listas).

**Limpieza del HTML:**

```typescript
responseHtml = responseHtml
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')   // Quitar botones UI
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')    // Quitar scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')      // Quitar estilos
    .replace(/Export to Sheets/gi, '')                     // Quitar texto UI
    .trim();
```

### 8.3 Prompt enviado a Gemini

```typescript
// Linea 1046-1078
const prompt = `Eres un ingeniero QA senior de AGIP...

DATOS REALES DE EJECUCION:
- Fecha: ${new Date().toISOString().split('T')[0]}
- CUIT probado: ${cuit}
- Expediente Lote: ${expedienteLote || 'N/A'}
- Expediente Cargo: ${expedienteCargo || 'N/A'}
- Total llamadas API capturadas: ${apiLog.length}
- Errores/504: ${errors.length}
- Respuestas vacias: ${empties.length}
- Modulos: ${moduleTable}
- ${bugInfo}
- Bug conocido: Aprobaciones Cargo devuelve data vacia...

FLUJO EJECUTADO (8 modulos):
1. Dashboard - Login SIGMA
2. Alta Inconsistencias - Importar CSV, generar lote
3. Seleccion Candidatos - Buscar, ponderar, generar lote
4. Generar Expedientes - Crear expediente SADE
5. Aprobaciones Expediente - Aprobar expediente
6. Fiscalizacion - Asignar y confirmar cargo
7. Aprobaciones Cargo - BUG: cargo no aparece
8. SADE - Validar expedientes LOTE y CARGO con documentos

Genera el reporte con estas secciones:
1. Resumen Ejecutivo (3 lineas)
2. Resultado por Modulo (tabla PASS/FAIL)
3. Bug Detectado (severidad, pasos, impacto)
4. Metricas API (total calls, % exito)
5. Conclusion y Recomendaciones

IMPORTANTE: Usa formato Markdown estricto...`;
```

**Datos dinamicos inyectados:**

- `apiLog.length` → Total de llamadas API reales
- `errors.length` → Cantidad de errores detectados
- `moduleTable` → Resumen por modulo (ej: `DASHBOARD: 3 calls, 0 errors`)
- `expedienteLote/Cargo` → Numeros SADE reales
- `cuit` → CUIT usado en la prueba

---

## 9. Generacion del PDF Profesional

### 9.1 Template HTML corporativo

```
Linea 1128-1316
```

El reporte se renderiza con un template HTML profesional que incluye:

```
┌──────────────────────────────────────────────────────────┐
│  [AGIP]  [EPIDATA]           SIGMA-E2E-AI-RPT           │
│                               Version 1.0 | Interno      │
├──────────────────────────────────────────────────────────┤
│  ══════════ franja dorada ══════════                     │
├──────────────────────────────────────────────────────────┤
│         INFORME DE PRUEBAS END-TO-END                    │
│   Sistema SIGMA - Generado por Inteligencia Artificial   │
├──────────────────────────────────────────────────────────┤
│ Proyecto │ Ambiente │ Fecha  │ CUIT │ API Calls │ Gen by │
│ SIGMA    │ QA / HML │ 27/02  │ 209..│ 57        │ Gemini │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐          │
│  │  ANALISIS DE RESULTADOS                    │          │
│  ├────────────────────────────────────────────┤          │
│  │                                            │          │
│  │  [Contenido generado por Gemini AI]        │          │
│  │  - Resumen ejecutivo                       │          │
│  │  - Tabla PASS/FAIL por modulo              │          │
│  │  - Bug detectado con severidad             │          │
│  │  - Metricas API                            │          │
│  │  - Conclusiones                            │          │
│  │                                            │          │
│  └────────────────────────────────────────────┘          │
├──────────────────────────────────────────────────────────┤
│  EPIDATA - Equipo QA Automation | Proyecto SIGMA 2026    │
│  Reporte generado por Google Gemini AI                   │
└──────────────────────────────────────────────────────────┘
```

### 9.2 Estilos CSS del template

| Elemento        | Estilo                       | Detalle                       |
| --------------- | ---------------------------- | ----------------------------- |
| Header          | `#0d1b2a` (azul oscuro)    | Logos AGIP y EPIDATA          |
| Franja          | `#d4af37` (dorado)         | Identidad corporativa         |
| Titulos seccion | Blanco sobre `#0d1b2a`     | Uppercase, letter-spacing     |
| Tablas          | Zebra striping               | Filas alternas en `#f8f9fa` |
| TH tablas       | `#0d1b2a` con texto blanco | Uppercase 10px                |
| Footer          | Azul oscuro                  | Creditos EPIDATA + Gemini     |

### 9.3 Renderizado y exportacion

```typescript
// Linea 1322-1343

// 1. Navegar a about:blank (evitar CSP de Gemini)
await page.goto('about:blank');

// 2. Inyectar HTML del reporte
await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });

// 3. Screenshot del reporte renderizado
await page.screenshot({
    path: `${SCREENSHOTS_DIR}/AI-Report-Rendered-${ts}.png`,
    fullPage: true
});

// 4. Generar PDF
await page.pdf({
    path: `reports/SIGMA-QA-AI-Report-${ts}.pdf`,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
});
```

**`about:blank` necesario:** Gemini tiene Content Security Policy con Trusted Types que bloquea `setContent()`. Navegando primero a `about:blank` se elimina esta restriccion.

### 9.4 Cierre para video

```typescript
// Linea 1440-1458
// Mostrar el reporte HTML profesional (lo que queda grabado en el video)
if (reporteHtmlCompleto) {
    await page.goto('about:blank');
    await page.setContent(reporteHtmlCompleto, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000); // 10 segundos con el reporte visible
}
```

**Proposito:** El video de Playwright graba hasta el final del test. Estos ultimos 10 segundos muestran el reporte profesional en pantalla, quedando grabado como cierre del video.

---

## 10. Ejecucion y Comandos

### Comando principal

```bash
npx playwright test demo-live-api-ai-report --headed
```

### Con reporter HTML

```bash
npx playwright test demo-live-api-ai-report --headed --reporter=html
```

### Opciones utiles

| Flag                 | Proposito                                           |
| -------------------- | --------------------------------------------------- |
| `--headed`         | **Obligatorio** - muestra el navegador        |
| `--reporter=html`  | Genera reporte Playwright en `playwright-report/` |
| `--timeout=900000` | Override timeout (ya configurado en el test)        |
| `--trace on`       | Captura trace completo para debug                   |

---

## 11. Estructura de Archivos Generados

Despues de una ejecucion exitosa se generan:

```
SIGMA-QA-AUTOMATION/
├── reports/
│   ├── SIGMA-QA-AI-Report-2026-02-27T10-30-00.pdf   ← PDF profesional
│   ├── screenshots/
│   │   ├── AI-Report-Gemini-2026-02-27T10-30-00.txt  ← Texto plano Gemini
│   │   ├── AI-Report-Gemini-2026-02-27T10-30-00.png  ← Screenshot Gemini
│   │   ├── AI-Report-Rendered-2026-02-27T10-30-00.png ← Screenshot PDF
│   │   ├── SADE-LOTE-DocsTrabajo-2026-02-27T10-25-00.png
│   │   ├── SADE-CARGO-DocsTrabajo-2026-02-27T10-27-00.png
│   │   ├── BUG-LIVE-API-20904554338-2026-02-27T10-20-00.png  ← Si hay bug
│   │   └── demo-live-api-ai-trace-1709012345678.json  ← Traza completa
│   └── test-results/
│       └── demo-live-api-ai-report-*/
│           ├── video.webm           ← Video completo del test
│           ├── trace.zip            ← Playwright trace
│           └── test-failed-1.png    ← Screenshot si falla
└── sigma-sql/
    └── E2E-DEMO-{timestamp}.csv    ← CSV generado para la prueba
```

### Contenido del JSON de traza

```json
{
    "summary": {
        "total": 57,
        "errors": 0,
        "empties": 3,
        "aiReport": "gemini"
    },
    "cuit": "20904554338",
    "expedienteLote": "EX-2026-00519159-GCABA-DGR",
    "expedienteCargo": "EX-2026-00519162-GCABA-DGR",
    "errors": [],
    "allCalls": [
        {
            "module": "DASHBOARD",
            "method": "GET",
            "endpoint": "/login",
            "status": 200,
            "dataCount": null,
            "bodyPreview": "{\"user\":...}",
            "hasError": false,
            "is504": false,
            "isEmpty": false,
            "timestamp": "2026-02-27T10:15:30.123Z"
        }
    ]
}
```

---

## 12. Troubleshooting

### Error: Gemini no encuentra campo editable

**Causa:** La sesion de Google expiro o el navegador no tiene cookies.
**Solucion:** Iniciar sesion manualmente en Google antes de correr el test, o usar un perfil de navegador persistente.

### Error: Trusted Types CSP bloquea setContent

**Causa:** Se intenta inyectar HTML mientras la pagina actual es Gemini.
**Solucion:** Siempre navegar a `about:blank` antes de `page.setContent()`.

### Error: CUIT no aparece en Seleccion de Candidatos

**Causa:** La cola de SADE no proceso el lote a tiempo.
**Solucion:** El test tiene reintentos configurados. Si falla despues de 5 intentos, el ambiente SADE esta lento. Esperar e intentar de nuevo.

### Error: 504 Gateway Timeout en Generar Expedientes

**Causa:** El backend HML esta sobrecargado.
**Solucion:** El interceptor lo detecta y lo marca en el panel. El test lo registra como error en el JSON de traza.

### El video no muestra el reporte al final

**Causa:** El test fallo antes de llegar al Modulo 9.
**Solucion:** El video siempre se graba hasta el punto de fallo. Solo en ejecuciones exitosas se ve el reporte.

### PDF no se genera

**Causa:** El `page.pdf()` solo funciona en Chromium headless o con `--headed` habilitado.
**Solucion:** Verificar que se esta usando Chromium, no Firefox o WebKit.

---

## Diagrama de Flujo de Datos

```
CSVGenerator                    page.on('response')
     │                                │
     ▼                                ▼
 CSV con CUIT ──→ SIGMA E2E ──→ apiLog[] ──→ Prompt Gemini
                     │                           │
                     ▼                           ▼
              expedienteLote            Gemini genera reporte
              expedienteCargo                    │
                     │                           ▼
                     ▼                    responseHtml
                SADE valida              responseText
                 expedientes                     │
                                                 ▼
                                        Template HTML corporativo
                                                 │
                                          ┌──────┴──────┐
                                          ▼              ▼
                                     PDF A4         Screenshot
                                  (profesional)    (full page)
```

---

**Documento generado:** 2026-02-27
**Proyecto:** SIGMA-QA-AUTOMATION
**Equipo:** EPIDATA - QA Automation