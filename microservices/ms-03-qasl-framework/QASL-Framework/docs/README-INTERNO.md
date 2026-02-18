# QA-HU-TEMPLATE

**Template Universal QA - Shift-Left Testing**

EPIDATA - Proyecto SIGMA | TeamQA

---

## DIA NUEVO DE TRABAJO - COMANDOS EN ORDEN

> **IMPORTANTE:** Ejecutar los comandos en el orden indicado.

### PASO 1: Limpiar Todo (Empezar desde Cero)

```bash
npm run clean
```

> Elimina: `reports/`, `allure-results/`, `.api-captures/`, `.temp-k6/`, `.temp-newman/`

---

### PASO 2: Levantar Servicios Docker

```bash
npm run docker:up
```

Esperar ~30 segundos. **Verificar:** http://localhost:3001 (Grafana)

---

### PASO 3: Ejecutar Pruebas E2E (Playwright)

```bash
npm run e2e:capture
```

> Este comando ejecuta E2E + captura APIs para los siguientes pasos.

---

### PASO 4: Ejecutar Pruebas API (Newman)

```bash
npm run api
```

---

### PASO 5: Ejecutar Pruebas Performance (K6)

```bash
# Limpiar métricas anteriores (Grafana limpio)
npm run k6:reset

# Ejecutar test (opciones disponibles)
npm run k6                                    # Default: 10 VUs, 30s
npm run k6 -- --type=stairs --vus=5 --duration=150s   # Escalera (demo)
npm run k6 -- --type=stress --vus=50          # Estres
npm run k6 -- --type=spike --vus=30           # Pico
npm run k6 -- --vus=20 --duration=60s         # Personalizado
```

**Tipos de prueba:**
| Tipo | Descripción |
|------|-------------|
| `load` | Carga normal (default) |
| `stairs` | Escalera visible en Grafana |
| `stress` | Estrés hasta el límite |
| `spike` | Pico de carga repentino |
| `soak` | Resistencia prolongada |

---

### PASO 6: Ejecutar Pruebas Seguridad (OWASP ZAP)

```bash
npm run zap
```

---

### PASO 7: Ver Centro de Control (Grafana)

```
http://localhost:3001/d/sigma-qa-control/sigma-qa-centro-de-control?kiosk=true
```

**Credenciales:** admin / admin

---

### PASO 8: Publicar Reportes a GitLab Pages

```bash
npm run publish
```

**URL Reportes:** https://sigma-qa-framework-207db7.gitlab.io/

> Envia este link por correo a tu equipo.

---

### PASO 9: Fin del Dia - Apagar Docker

```bash
npm run docker:down
```

---

## RESUMEN RAPIDO - COPY/PASTE

```bash
# 1. Limpiar todo (dia nuevo)
npm run clean

# 2. Levantar servicios
npm run docker:up

# 3. E2E con captura de APIs
npm run e2e:capture

# 4. API
npm run api

# 5. Performance (reset + escalera para demo)
npm run k6:reset
npm run k6 -- --type=stairs --vus=5 --duration=150s

# 6. Seguridad
npm run zap

# 7. Ver Grafana
# http://localhost:3001

# 8. Publicar reportes
npm run publish

# 9. Apagar
npm run docker:down
```

---

## Ver Reporte Allure Local

```bash
npm run allure:open
```

---

## PIPELINE COMPLETO (Un Solo Comando)

```bash
npm run pipeline
```

**Con opciones:**
```bash
npm run pipeline -- --skip-zap    # Omitir seguridad
npm run pipeline -- --skip-k6     # Omitir performance
```

---

## Arquitectura del Template

### Archivos que SE MODIFICAN (Adaptables al Proyecto)

```
e2e/
├── locators/     # Selectores CSS/XPath de tu aplicacion
├── pages/        # Page Objects de tu aplicacion
├── specs/        # Test Specs con tus casos de prueba
└── test-base/    # Configuracion base y fixtures
```

### Archivos que NO SE TOCAN (Framework Universal)

```
scripts/              # Scripts de ejecucion (universales)
scripts_metricas/     # Envio de metricas a InfluxDB (universales)
e2e/utils/            # Utilidades del framework
docker/               # Configuracion Docker
reports/              # Generados automaticamente
```

---

## Estructura del Proyecto

```
qa-hu-template/
│
├── sigma_analyzer/              # [1] PRUEBAS ESTATICAS - Analisis de HUs
│   ├── run_analysis.py          # Script principal de analisis
│   ├── parser.py                # Parser de HUs en Markdown
│   ├── rtm_analyzer_ai.py       # Analizador RTM con Claude AI
│   ├── report_generator.py      # Generador de reportes
│   ├── hu_ideal_html_generator.py # Generador de HU IDEAL
│   ├── templates/               # Plantillas ISTQB
│   ├── docs/                    # Documentacion del flujo
│   ├── reportes/                # Reportes generados
│   └── hu_actualizadas/         # HUs con 100% cobertura
│
├── e2e/                         # [2-5] PRUEBAS DINAMICAS
│   ├── locators/                # Selectores centralizados (MODIFICAR)
│   ├── pages/                   # Page Object Model (MODIFICAR)
│   ├── specs/                   # Test Specs (MODIFICAR)
│   ├── test-base/               # Base de tests (MODIFICAR)
│   └── utils/                   # Utilidades (NO TOCAR)
│
├── scripts/                     # Scripts de ejecucion (NO TOCAR)
│   ├── run-e2e.mjs              # Ejecuta E2E + Allure + Metricas
│   ├── run-api.mjs              # Ejecuta Newman + Metricas
│   ├── run-k6.mjs               # Ejecuta K6 + Metricas
│   ├── run-zap.mjs              # Ejecuta OWASP ZAP + Metricas
│   └── run-pipeline.mjs         # Ejecuta todo el pipeline
│
├── scripts_metricas/            # Envio de metricas (NO TOCAR)
│   ├── influx-client.mjs        # Cliente InfluxDB compartido
│   ├── send-e2e-metrics.mjs     # E2E -> InfluxDB
│   ├── send-api-metrics.mjs     # API -> InfluxDB
│   ├── send-zap-metrics.mjs     # ZAP -> InfluxDB
│   └── send-k6-metrics.mjs      # K6 info (metricas nativas)
│
├── reports/                     # Reportes generados (NO TOCAR)
│   ├── e2e/                     # Allure + Playwright HTML
│   ├── api/                     # Newman HTMLExtra
│   ├── k6/                      # K6 HTML Report
│   └── zap/                     # OWASP ZAP HTML/JSON
│
├── docker/                      # Configuracion Docker
│   ├── grafana/dashboards/      # Dashboard Centro de Control
│   └── postgres/init.sql        # Schema y datos de prueba
│
├── plantillas-istqb/            # Plantillas documentacion QA
├── docker-compose.yml           # Servicios Docker
├── playwright.config.ts         # Configuracion Playwright
└── package.json                 # Scripts npm
```

---

## Centro de Control (Grafana Dashboard)

Dashboard en tiempo real con metricas de todas las pruebas.

### URL de Acceso

```
http://localhost:3001/d/sigma-qa-control/sigma-qa-centro-de-control
```

**Modo Kiosk (Pantalla Completa):**
```
http://localhost:3001/d/sigma-qa-control/sigma-qa-centro-de-control?kiosk=true
```

### Secciones del Dashboard

| Seccion | Metricas | Fuente |
|---------|----------|--------|
| **E2E (Playwright)** | Pass Rate, Passed, Failed, Skipped, Duration | `e2e_tests` |
| **API (Newman)** | Pass Rate, Passed, Failed, Requests, Duration | `api_tests` |
| **Seguridad (ZAP)** | High, Medium, Low, Informational | `zap_security` |
| **Performance (K6)** | Success Rate, Response Time, VUs, Requests, Errors | K6 nativo |

### Caracteristicas

- Refresh automatico cada 5 segundos
- Colores dinamicos segun umbrales (verde/amarillo/rojo)
- Graficos historicos de K6
- 100% dinamico - funciona con cualquier proyecto

---

## Flujo Shift-Left Testing (6 Fases ISTQB)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHIFT-LEFT TESTING FLOW                          │
│            Alineado con ISTQB v4.0 | ISO/IEC/IEEE 29119 | IEEE 829      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [0] DOCUMENTACION QA (plantillas-istqb/)                              │
│       │                                                                 │
│       ├── Master Test Plan (IEEE 29119-3)                              │
│       ├── Sprint Test Plan                                             │
│       ├── Estimacion VCR (Value + Cost + Risk)                         │
│       └── Plantillas de reportes y metricas                            │
│              │                                                          │
│              ▼                                                          │
│  [1] PRUEBAS ESTATICAS (sigma_analyzer)                                │
│       │                                                                 │
│       ├── Analiza HU Original (.md)                                    │
│       ├── Detecta gaps y cobertura                                     │
│       ├── Genera HU IDEAL (100% cobertura)                             │
│       └── Genera CSVs de trazabilidad                                  │
│              │                                                          │
│              ▼                                                          │
│  [2] PRUEBAS E2E (Playwright + Allure)                                 │
│       │                                                                 │
│       ├── Ejecuta specs con decoradores Allure                         │
│       ├── Captura APIs automaticamente                                 │
│       ├── Genera reporte Allure con trazabilidad                       │
│       └── Envia metricas a InfluxDB/Grafana                            │
│              │                                                          │
│              ▼                                                          │
│  [3] PRUEBAS API (Newman + HTMLExtra)                                  │
│       │                                                                 │
│       ├── Lee APIs capturadas (.api-captures/)                         │
│       ├── Genera coleccion Postman dinamica                            │
│       ├── Ejecuta y genera reporte HTMLExtra                           │
│       └── Envia metricas a InfluxDB/Grafana                            │
│              │                                                          │
│              ▼                                                          │
│  [4] PRUEBAS PERFORMANCE (K6 + InfluxDB)                               │
│       │                                                                 │
│       ├── Lee APIs capturadas                                          │
│       ├── Ejecuta test de carga (VUs, duration)                        │
│       ├── Genera reporte HTML con metricas                             │
│       └── Envia metricas nativas a InfluxDB/Grafana                    │
│              │                                                          │
│              ▼                                                          │
│  [5] PRUEBAS SEGURIDAD (OWASP ZAP + Docker)                           │
│       │                                                                 │
│       ├── Lee target URL de APIs capturadas                            │
│       ├── Ejecuta baseline scan                                        │
│       ├── Genera reporte HTML/JSON de vulnerabilidades                 │
│       └── Envia metricas a InfluxDB/Grafana                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estructura de Specs con Allure

```typescript
import { test, expect } from '../test-base/TestBase';
import { Allure } from '../utils/AllureDecorators';

test.describe('TS-001: Modulo Ejemplo', () => {

    test.beforeEach(async () => {
        await Allure.setup({
            epic: 'EP_SIGMA - Plataforma SIGMA',
            feature: 'Alta de Inconsistencias',
            story: 'HU-001: Como usuario quiero...',
            severity: 'critical',
            owner: 'QA Team',
            tags: ['smoke', 'e2e', 'regression'],
            testCase: 'TS-001'
        });
    });

    test('TC-001: Validar flujo principal', async ({ page }) => {
        await Allure.description('Objetivo del test case...');

        await Allure.step('DADO que navego al modulo', async () => {
            await page.goto('/modulo');
        });

        await Allure.step('CUANDO realizo la accion', async () => {
            await page.click('#boton');
        });

        await Allure.step('ENTONCES veo el resultado', async () => {
            await expect(page.locator('#resultado')).toBeVisible();
        });
    });
});
```

---

## Trazabilidad Shift-Left (Allure)

| Campo | Descripcion |
|-------|-------------|
| **Epic** | Modulo del sistema (EP_SIGMA_XX) |
| **Feature** | Funcionalidad especifica |
| **Story** | Historia de Usuario (HU-XXX) |
| **Severity** | blocker / critical / normal / minor / trivial |
| **Owner** | Responsable del test |
| **Tags** | smoke, e2e, regression, api, etc. |
| **Test Case** | ID del caso de prueba (TS-XXX) |

---

## Requisitos

- **Node.js** >= 18
- **Python** >= 3.10 (para sigma_analyzer)
- **Docker Desktop** (para servicios y ZAP)
- **K6** instalado globalmente: https://k6.io/docs/getting-started/installation/
- **Allure CLI**: `npm install -g allure-commandline`

### Instalacion

```bash
# 1. Instalar dependencias Node
npm install

# 2. Instalar browsers Playwright
npx playwright install

# 3. Instalar dependencias Python (sigma_analyzer)
cd sigma_analyzer
pip install -r requirements.txt
```

---

## Servicios Docker

| Servicio | Puerto | URL | Credenciales |
|----------|--------|-----|--------------|
| **Grafana** | 3001 | http://localhost:3001 | admin / admin |
| **InfluxDB** | 8086 | http://localhost:8086 | - |
| **Allure Server** | 4040, 5050 | http://localhost:4040 | - |
| **PostgreSQL** | 5432 | localhost:5432 | sigma_qa / sigma_qa_2024 |
| **Adminer** | 8083 | http://localhost:8083 | (ver PostgreSQL) |
| **Redis** | 6379 | localhost:6379 | - |
| **SQL Server** | 1433 | localhost:1433 | sa / MyStr0ngP4ssw0rd |
| **OWASP ZAP** | 8082 | http://localhost:8082 | - |
| **n8n** | 5678 | http://localhost:5678 | admin / admin |

---

## Base de Datos PostgreSQL (Test Data)

Base de datos para simular datos de prueba en tests E2E.

### Conexion

```
Host: localhost (o "postgres" desde Docker)
Puerto: 5432
Usuario: sigma_qa
Password: sigma_qa_2024
Base de datos: sigma_test
```

### Acceso via Adminer (GUI Web)

1. Abrir http://localhost:8083
2. Seleccionar **PostgreSQL** en el dropdown
3. Servidor: `postgres`
4. Usuario: `sigma_qa`
5. Password: `sigma_qa_2024`
6. Base de datos: `sigma_test`

### Usuarios de Prueba

| Username | Email | Password | Rol |
|----------|-------|----------|-----|
| admin_test | admin@test.local | Test123! | Administrador |
| supervisor_test | supervisor@test.local | Test123! | Supervisor |
| analista_test | analista@test.local | Test123! | Analista |
| operador_test | operador@test.local | Test123! | Operador |
| auditor_test | auditor@test.local | Test123! | Auditor |

---

## Plantillas ISTQB Disponibles

| Plantilla | Estandar | Uso |
|-----------|----------|-----|
| **Master Test Plan** | IEEE 29119-3 | Plan general del proyecto |
| **Sprint Test Plan** | ISTQB v4.0 | Plan por sprint |
| **Test Schedule** | ISO 29119 | Calendario de pruebas |
| **Metricas de Prueba** | ISTQB | KPIs y dashboard |
| **Progress Report** | IEEE 829 | Avance semanal |
| **Bug Report** | ISTQB | Reporte individual de defecto |
| **Defect Report** | IEEE 829 | Consolidado de defectos |
| **Test Closure** | IEEE 29119-3 | Cierre de ciclo de pruebas |
| **Guia VCR** | Custom | Estimacion Value+Cost+Risk |

---

## Soporte

**EPIDATA - Proyecto SIGMA | TeamQA**

**Lider Tecnico:** Elyer Maldonado
