# MAPEO DE MICROSERVICIOS - QASL NEXUS LLM
## Documento de Arquitectura y Flujo de Datos

---

## DIAGRAMA GENERAL DE CONEXIONES

```
                         ┌──────────────────────┐
                         │      MS-08            │
                         │    CI/CD PIPELINE     │
                         │   (Director General)  │
                         └──────────┬───────────┘
                                    │ Orquesta todo el pipeline
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│     MS-02       │     │     MS-09       │     │     MS-11        │
│ PRUEBAS         │     │ ORQUESTADOR     │     │  REPORTADOR      │
│ ESTATICAS       │     │ LLM (Cerebro)   │     │  MULTI-CANAL     │
└────────┬────────┘     └────────┬────────┘     └────────┬─────────┘
         │                       │                       │
         │  Genera HUs,TCs      │  IA para todo         │  Consolida
         │  CSVs, Trazabilidad   │  VCR, Templates       │  reportes
         │                       │                       │
         └───────────┬───────────┴───────────┬───────────┘
                     │                       │
                     ▼                       ▼
         ┌───────────────────────────────────────────┐
         │              MS-12 DATABASE               │
         │            (PostgreSQL)                    │
         │         SINGLE SOURCE OF TRUTH            │
         └───────────────────┬───────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │    MS-03     │ │  MS-04   │ │    MS-06     │
     │ QASL         │ │  MOBILE  │ │   GARAK      │
     │ FRAMEWORK    │ │ (Maestro)│ │ LLM SECURITY │
     │ E2E/API/K6/  │ │ iOS/And  │ │ NVIDIA       │
     │ ZAP/Allure   │ │          │ │              │
     └──────┬───────┘ └────┬─────┘ └──────┬───────┘
            │              │              │
            │  Bugs +      │  Bugs +      │  Vulns +
            │  Metricas    │  Metricas    │  Metricas
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
         ┌───────────────────────────────────────────┐
         │              MS-12 DATABASE               │
         │         (Resultados vuelven aqui)          │
         └───────────────────┬───────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │    MS-07     │ │  MS-10   │ │    MS-11     │
     │  SENTINEL    │ │   MCP    │ │ REPORTADOR   │
     │  Grafana     │ │ Jira     │ │ PDF/Slack    │
     │  Dashboards  │ │ X-Ray    │ │ Teams/Email  │
     └──────────────┘ └──────────┘ └──────────────┘
```

---

## FLUJO DETALLADO POR MICROSERVICIO

---

### MS-01: METODOLOGIAS
**Puerto:** 3000
**Rol:** Servidor de templates

```
ENTRADA:  Nada (es estático)
SALIDA:   Templates HTML/JSON via HTTP GET
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-09 | ← lee | Templates para llenar con IA |
| MS-10 | ← lee | Templates para crear bugs en Jira |

**Datos que maneja:**
- Master Test Plan template
- Test Plan Sprint template
- User Story ISTQB template
- Bug Report template
- IEEE 29119 templates
- Checklists de revision

---

### MS-02: PRUEBAS ESTATICAS (SUR Static Analyzer)
**Puerto:** 4000
**Rol:** Analiza HUs y genera trazabilidad completa

```
ENTRADA:  Archivos .docx (Historias de Usuario)
SALIDA:   4 CSVs + Gaps detectados + Reportes IEEE 1028
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-09 | → pide | IA para analizar gaps en HUs |
| MS-12 | → escribe | HUs, Test Suites, Precondiciones, Test Cases, Gaps |

**Datos que ESCRIBE en MS-12:**
- tabla `user_story` → HUs parseadas
- tabla `test_suite` → Suites generadas
- tabla `test_case` → Casos de prueba
- tabla `precondition` → Precondiciones
- tabla `static_analysis_gap` → Gaps detectados por IA

**Flujo interno:**
```
1. Recibe HU-DF1-01.docx
2. Parsea: extrae BRs, escenarios DADO-CUANDO-ENTONCES
3. Pide a MS-09: "Analiza gaps en esta HU"
4. Claude detecta: "Falta caso negativo para BR-03"
5. Genera 4 CSVs: HU.csv, TS.csv, PRC.csv, TC.csv
6. Guarda todo en MS-12
7. Genera reporte IEEE 1028
```

---

### MS-03: QASL FRAMEWORK
**Puertos:** 6001-6005
**Rol:** Ejecuta 5 tipos de pruebas

```
ENTRADA:  Test Cases de MS-12 (con VCR >= 9)
SALIDA:   Resultados + Bugs + Metricas → MS-12
          Reportes nativos (Allure/Newman/K6/ZAP) → se quedan aqui
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-12 | ← lee | Test Cases a ejecutar (filtrados por VCR) |
| MS-12 | → escribe | Resultados, bugs, metricas |
| MS-08 | ← recibe | Triggers de ejecucion |

**Datos que LEE de MS-12:**
- tabla `test_case` → WHERE vcr_score >= 9 AND type IN ('e2e','api','performance','security')

**Datos que ESCRIBE en MS-12:**
- tabla `test_execution` → Resultado de cada TC (pass/fail/skip)
- tabla `defect` → Bugs encontrados
- tabla `metric` → Pass rate, duracion, cobertura

**Motores internos:**
| Motor | Puerto | Reporte nativo |
|-------|--------|---------------|
| E2E Playwright | 6001 | Allure HTML |
| API Newman | 6002 | Newman HTML Extra |
| Performance K6 | 6003 | K6 HTML Report |
| Security ZAP | 6004 | ZAP HTML Report |
| Allure Server | 6005 | Dashboard unificado |

---

### MS-04: QASL MOBILE
**Puerto:** 7500
**Rol:** Testing mobile iOS/Android

```
ENTRADA:  Test Cases mobile de MS-12
SALIDA:   Resultados + Bugs + Screenshots → MS-12
          Reportes Maestro → se quedan aqui
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-12 | ← lee | Test Cases mobile |
| MS-12 | → escribe | Resultados, bugs, analisis UX |
| MS-09 | → pide | Claude Vision para analizar screenshots |
| MS-08 | ← recibe | Triggers de ejecucion |

**Datos que ESCRIBE en MS-12:**
- tabla `test_execution` → Resultados mobile
- tabla `defect` → Bugs mobile + UX issues detectados por Claude Vision
- tabla `metric` → Metricas mobile

---

### MS-05: INGRID AI FRAMEWORK
**Puerto:** 7000
**Rol:** Motor de generacion de tests con IA

```
ENTRADA:  Codigo fuente, contexto de app
SALIDA:   Test Cases generados por IA → MS-12
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-09 | ← recibe | Solicitudes de generacion de tests |
| MS-12 | → escribe | Test Cases generados por IA |

**Datos que ESCRIBE en MS-12:**
- tabla `test_case` → TCs generados automaticamente por IA
- tabla `test_suite` → Suites sugeridas por IA

---

### MS-06: GARAK LLM SECURITY
**Puerto:** 7600
**Rol:** Testing de seguridad para LLMs

```
ENTRADA:  Configuracion de probes, modelos a testear
SALIDA:   Vulnerabilidades + Metricas → MS-12
          Reportes Garak → se quedan aqui
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-12 | → escribe | Vulnerabilidades encontradas, metricas |
| MS-08 | ← recibe | Triggers de scan |

**Datos que ESCRIBE en MS-12:**
- tabla `defect` → Vulnerabilidades LLM (type='llm_security')
- tabla `metric` → Scores de seguridad por modelo

---

### MS-07: SENTINEL UNIFIED
**Puertos:** 3003 (Grafana), 9090 (Prometheus), 8086 (InfluxDB)
**Rol:** Monitoreo y dashboards en tiempo real

```
ENTRADA:  Metricas de infraestructura (Prometheus)
          Datos de negocio QA (PostgreSQL de MS-12)
SALIDA:   Dashboards visuales, alertas
```

**Conexiones:**
| Se conecta con | Direccion | Que envia/recibe |
|----------------|-----------|------------------|
| MS-12 | ← lee | Datos de negocio QA (datasource PostgreSQL) |
| Todos los MS | ← scrape | Metricas de salud (Prometheus) |
| MS-11 | → envia | Alertas que disparan notificaciones |

**Datasources de Grafana:**
| Datasource | Origen | Que muestra |
|------------|--------|-------------|
| Prometheus | Scrape a todos los MS | CPU, memoria, latencia, uptime |
| InfluxDB | Time-series propias | Metricas historicas de monitoreo |
| PostgreSQL | MS-12 | Pass rate, cobertura, bugs, VCR, trazabilidad |

**Dashboards:**
1. Executive → metricas de negocio (de MS-12)
2. Technical → salud de APIs (de Prometheus)
3. Mobile → metricas mobile (de MS-12)
4. Security → vulns ZAP + Garak (de MS-12)
5. QA Metrics → cobertura, DRE, MTTR (de MS-12)

---

### MS-08: CI/CD PIPELINE
**Puerto:** 8888
**Rol:** Director de orquesta - ejecuta el pipeline completo

```
ENTRADA:  Git push, triggers manuales, schedules
SALIDA:   Ejecuta todos los MS en orden correcto
```

**Conexiones:**
| Se conecta con | Direccion | Que hace |
|----------------|-----------|----------|
| MS-02 | → trigger | "Analiza estas HUs nuevas" |
| MS-09 | → trigger | "Calcula VCR para estos TCs" |
| MS-03 | → trigger | "Ejecuta regression suite" |
| MS-04 | → trigger | "Ejecuta mobile tests" |
| MS-06 | → trigger | "Ejecuta scan de seguridad LLM" |
| MS-11 | → trigger | "Genera reporte consolidado" |
| MS-10 | → trigger | "Crea bugs en Jira" |

**Pipeline tipico (30 min total):**
```
FASE 1 - Analisis (5 min):
├── MS-02: Analisis estatico de HUs nuevas
└── MS-09: Calculo VCR

FASE 2 - Ejecucion (20 min, en paralelo):
├── MS-03: E2E + API + K6 + ZAP
├── MS-04: Mobile tests
└── MS-06: Garak LLM scan

FASE 3 - Reportes (5 min):
├── MS-11: Consolida reportes + notifica
├── MS-10: Crea bugs en Jira para failures
└── MS-07: Dashboards actualizados automaticamente
```

---

### MS-09: ORQUESTADOR LLM (CEREBRO)
**Puerto:** 8000
**Rol:** Decide que LLM usar y ejecuta tareas de IA

```
ENTRADA:  Solicitudes de IA de cualquier MS
SALIDA:   Respuestas procesadas por Claude/GPT/Gemini
```

**Conexiones:**
| Se conecta con | Direccion | Que hace |
|----------------|-----------|----------|
| MS-02 | ← recibe | "Analiza gaps en esta HU" → usa Claude |
| MS-04 | ← recibe | "Analiza este screenshot" → usa Claude Vision / Gemini |
| MS-05 | ← recibe | "Genera tests para login.tsx" → usa Claude |
| MS-10 | ← recibe | "Llena este template de bug" → usa Claude |
| MS-12 | → escribe | VCR scores calculados |
| MS-01 | ← lee | Templates para llenar con IA |

**Decision Engine:**
| Tarea | LLM elegido | Razon |
|-------|-------------|-------|
| Analisis de codigo | Claude | Mejor razonamiento |
| Generacion de test data | GPT | Mejor creatividad |
| Analisis de screenshots | Gemini / Claude Vision | Capacidad multimodal |
| Gap detection | Claude | Mejor analisis logico |
| Template filling | Claude | Mejor formato estructurado |
| VCR calculation | Claude | Mejor evaluacion de riesgo |

**Datos que ESCRIBE en MS-12:**
- tabla `vcr_score` → Scores calculados por IA

---

### MS-10: MCP INTERFAZ (Integration Hub)
**Puerto:** 5000
**Rol:** Conecta con herramientas externas del cliente

```
ENTRADA:  Eventos de MS-03/04/06 (test failures)
SALIDA:   Issues en Jira, TCs en X-Ray, etc.
```

**Conexiones:**
| Se conecta con | Direccion | Que hace |
|----------------|-----------|----------|
| MS-01 | ← lee | Template de bug report |
| MS-09 | → pide | "Llena este template con IA" |
| MS-12 | ← lee | Trazabilidad (TC → US → Epic) |
| MS-12 | → escribe | Referencias externas (jira_key, xray_id) |
| Jira | → crea | Issues, bugs |
| X-Ray | → crea | Test executions |
| TestRail | → crea | Test cases, runs |
| Azure DevOps | → crea | Work items |

**Flujo de creacion de bug:**
```
1. MS-03 detecta fallo → evento TEST_FAILURE
2. MS-10 lee template de MS-01
3. MS-10 lee trazabilidad de MS-12 (TC-043 → HU-DF1-04)
4. MS-10 pide a MS-09: "Llena template con contexto"
5. MS-10 mapea a formato Jira
6. MS-10 crea issue en Jira → AGIP-1234
7. MS-10 guarda referencia en MS-12: defect.jira_key = 'AGIP-1234'
```

---

### MS-11: REPORTADOR MULTI-CANAL
**Puerto:** 9000
**Rol:** Consolida reportes y notifica

```
ENTRADA:  Datos de MS-12, triggers de MS-08
SALIDA:   PDFs, emails, Slack, Teams
```

**Conexiones:**
| Se conecta con | Direccion | Que hace |
|----------------|-----------|----------|
| MS-12 | ← lee | Todos los datos para reportes |
| MS-07 | ← recibe | Alertas que requieren notificacion |
| MS-08 | ← recibe | Triggers ("genera reporte semanal") |
| Slack | → envia | Notificaciones webhook |
| Teams | → envia | Notificaciones connector |
| Email | → envia | SMTP reportes PDF |

**Tipos de reporte:**
| Reporte | Formato | Destino |
|---------|---------|---------|
| Executive Summary | PDF 5 paginas | Email a stakeholders |
| Test Execution | HTML dashboard | Slack #qa-reports |
| Defect Analysis | PDF + Excel | Teams QA channel |
| Weekly Report | PDF consolidado | Email + Slack + Teams |
| Alert critica | Texto corto | Slack inmediato |

---

### MS-12: DATABASE (PostgreSQL)
**Puerto:** 5432
**Rol:** Single Source of Truth

```
ENTRADA:  Escrituras de MS-02, MS-03, MS-04, MS-05, MS-06, MS-09, MS-10
SALIDA:   Lecturas de MS-03, MS-04, MS-06, MS-07, MS-09, MS-10, MS-11
```

**Tablas principales:**
| Tabla | Quien ESCRIBE | Quien LEE |
|-------|---------------|-----------|
| epic | MS-02 | MS-10, MS-11 |
| user_story | MS-02 | MS-09, MS-10, MS-11 |
| test_suite | MS-02, MS-05 | MS-03, MS-04 |
| test_case | MS-02, MS-05 | MS-03, MS-04, MS-06 |
| precondition | MS-02 | MS-03, MS-04 |
| vcr_score | MS-09 | MS-03, MS-08 |
| test_execution | MS-03, MS-04, MS-06 | MS-07, MS-11 |
| defect | MS-03, MS-04, MS-06 | MS-10, MS-11 |
| metric | MS-03, MS-04, MS-06 | MS-07, MS-11 |
| static_analysis_gap | MS-02 | MS-09, MS-11 |
| report | MS-11 | MS-07 |
| notification | MS-11 | MS-07 |

---

## RESUMEN DE PUERTOS

| MS | Puerto(s) | Servicio |
|----|-----------|----------|
| 01 | 3000 | Nginx (templates) |
| 02 | 4000 | Python FastAPI |
| 03 | 6001-6005 | Playwright/Newman/K6/ZAP/Allure |
| 04 | 7500 | Maestro |
| 05 | 7000 | TypeScript API |
| 06 | 7600 | Python Garak |
| 07 | 3003, 9090, 8086 | Grafana, Prometheus, InfluxDB |
| 08 | 8888, 50000 | Jenkins + agents |
| 09 | 8000 | TypeScript API |
| 10 | 5000 | TypeScript API |
| 11 | 9000 | Python + TypeScript |
| 12 | 5432 | PostgreSQL |

---

## ESTADO ACTUAL

| MS | Tiene codigo | Tecnologia | Estado |
|----|-------------|------------|--------|
| 01 | README + link GitLab Pages + plantillas ISTQB | Nginx / HTML | Operativo |
| 02 | sigma_analyzer (parser, reportes, dashboards) | Python + FastAPI + Claude | Operativo - pendiente API REST |
| 03 | QASL-Framework completo (E2E, API, K6, ZAP, Allure) | TypeScript + Playwright + Newman | Operativo - pendiente conexion MS-12 |
| 04 | qasl-mobile completo (Maestro, Claude Vision) | TypeScript + Maestro | Operativo - pendiente conexion MS-12 |
| 05 | ingrid-AI-framework (AI Testing, Prompt Engineering) | TypeScript + Anthropic SDK | Operativo - pendiente conexion MS-09 |
| 06 | garak-lab configurado (scripts, config, reportes) | Python + NVIDIA Garak | Operativo - pendiente conexion MS-12 |
| 07 | QASL-SENTINEL-UNIFIED (Grafana, monitoreo) | Grafana + Prometheus + InfluxDB | Operativo - pendiente datasource PostgreSQL |
| 08 | Pipeline Executor (3 fases, 5 tipos de pipeline) | TypeScript + Express | CREADO - pendiente integracion |
| 09 | Orquestador LLM (Decision Engine, VCR, Templates) | TypeScript + Claude/OpenAI/Gemini | CREADO - pendiente API keys |
| 10 | MCP Interfaz (Jira, X-Ray, TestRail, Azure DevOps) | TypeScript + Express + Axios | CREADO - pendiente credenciales |
| 11 | Reportador (PDF, Slack, Teams, Email, Cron) | TypeScript + PDFKit + Nodemailer | CREADO - pendiente webhooks |
| 12 | Database (15 tablas, 8 views, triggers, indexes) | PostgreSQL 16 + pgAdmin | CREADO - listo para levantar |

## PROXIMOS PASOS

1. Levantar MS-12 (docker-compose up) y verificar esquema SQL
2. Configurar API keys en MS-09 (.env) y probar Decision Engine
3. Conectar MS-02 con MS-12 (guardar CSVs en PostgreSQL)
4. Conectar MS-03/04/06 con MS-12 (leer TCs, escribir resultados)
5. Configurar webhooks Slack/Teams en MS-11
6. Configurar credenciales Jira/X-Ray en MS-10
7. Agregar datasource PostgreSQL en Grafana (MS-07)
8. Ejecutar pipeline full desde MS-08

---

## TECNOLOGIAS UTILIZADAS

| Categoria | Tecnologias |
|-----------|-------------|
| Backend | TypeScript, Python, Node.js, Express, FastAPI |
| Testing | Playwright, Newman, K6, OWASP ZAP, Maestro, NVIDIA Garak |
| IA / LLM | Claude (Anthropic), GPT (OpenAI), Gemini (Google) |
| Database | PostgreSQL 16, pgAdmin |
| Monitoreo | Grafana, Prometheus, InfluxDB |
| Reportes | PDFKit, Allure, ExcelJS |
| Notificaciones | Nodemailer (SMTP), Slack Webhooks, MS Teams Webhooks |
| Integraciones | Jira REST API, X-Ray API, TestRail API, Azure DevOps API |
| Infraestructura | Docker, Docker Compose |
| Estandares | ISTQB v4.0, IEEE 829, IEEE 830, IEEE 1028, ISO/IEC/IEEE 29119 |

---

*Documento vivo - Se actualiza conforme refinamos la arquitectura*
*Ultima actualizacion: 2026-02-17*
