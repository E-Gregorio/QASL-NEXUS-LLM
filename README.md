# QASL NEXUS LLM

**La Primera Plataforma de QA Impulsada por Modelos de Lenguaje Avanzados**

*Large Language Model QA Platform - From Requirements to Production*

---

## Que es QASL NEXUS LLM

Plataforma de automatizacion QA construida con **12 microservicios** que integra **Claude, GPT y Gemini** para automatizar el ciclo de vida completo del aseguramiento de calidad: desde el analisis de requisitos hasta el monitoreo en produccion.

## Arquitectura

```
                         ┌──────────────────────┐
                         │      MS-08            │
                         │   CI/CD PIPELINE      │
                         │   Puerto: 8888        │
                         └──────────┬───────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│     MS-02       │     │     MS-09       │     │     MS-11        │
│ PRUEBAS         │     │ ORQUESTADOR     │     │  REPORTADOR      │
│ ESTATICAS       │     │ LLM (Cerebro)   │     │  MULTI-CANAL     │
│ Puerto: 4000    │     │ Puerto: 8000    │     │  Puerto: 9000    │
└────────┬────────┘     └────────┬────────┘     └────────┬─────────┘
         │                       │                       │
         └───────────┬───────────┴───────────┬───────────┘
                     │                       │
                     ▼                       ▼
         ┌───────────────────────────────────────────┐
         │              MS-12 DATABASE               │
         │         PostgreSQL · Puerto: 5432         │
         │         SINGLE SOURCE OF TRUTH            │
         └───────────────────┬───────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │    MS-03     │ │  MS-04   │ │    MS-06     │
     │ QASL         │ │  MOBILE  │ │   GARAK      │
     │ FRAMEWORK    │ │ Maestro  │ │ LLM SECURITY │
     │ :6001-6005   │ │ :7500    │ │ :7600        │
     └──────┬───────┘ └────┬─────┘ └──────┬───────┘
            └──────────────┼──────────────┘
                           ▼
              ┌──────────────┬──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │    MS-07     │ │  MS-10   │ │    MS-01     │
     │  SENTINEL    │ │   MCP    │ │ METODOLOGIAS │
     │  Grafana     │ │  Jira    │ │ Templates    │
     │  :3003       │ │  :5000   │ │ :3000        │
     └──────────────┘ └──────────┘ └──────────────┘
```

## Los 12 Microservicios

| # | Microservicio | Puerto | Que hace |
|---|---|---|---|
| 01 | Metodologias | 3000 | Templates ISTQB, IEEE 829, planes de prueba |
| 02 | Pruebas Estaticas | 4000 | Parsea HUs, detecta gaps con IA, genera 4 CSVs de trazabilidad |
| 03 | QASL Framework | 6001-6005 | E2E (Playwright), API (Newman), Performance (K6), Security (ZAP) |
| 04 | QASL Mobile | 7500 | Testing iOS/Android con Maestro + Claude Vision UX |
| 05 | INGRID AI | 7000 | Generacion de tests con IA, analisis de contexto |
| 06 | Garak LLM Security | 7600 | Testing de seguridad para LLMs (jailbreak, injection, leakage) |
| 07 | Sentinel Unified | 3003 | Grafana + Prometheus + InfluxDB, 5 dashboards |
| 08 | CI/CD Pipeline | 8888 | Director de orquesta, ejecuta pipelines de 3 fases |
| 09 | Orquestador LLM | 8000 | Decision Engine Multi-LLM (Claude/GPT/Gemini), VCR Calculator |
| 10 | MCP Interfaz | 5000 | Conecta con Jira, X-Ray, TestRail, Azure DevOps |
| 11 | Reportador | 9000 | PDF ejecutivo, Slack, Teams, Email |
| 12 | Database | 5432 | PostgreSQL - 15 tablas, 8 views, Single Source of Truth |

## Flujo Principal

```
1. Analista sube HU (.docx)
   ↓
2. MS-02 analiza estaticamente, MS-09 (Claude) detecta gaps
   ↓
3. Genera 4 CSVs: User Stories, Test Suites, Precondiciones, Test Cases
   ↓
4. Guarda en MS-12 (PostgreSQL) con trazabilidad completa
   ↓
5. MS-09 calcula VCR (Value + Cost + Risk) → decision: AUTOMATIZAR o MANUAL
   ↓
6. MS-08 dispara pipeline:
   ├── MS-03: E2E + API + K6 + ZAP (en paralelo)
   ├── MS-04: Mobile tests
   └── MS-06: Garak LLM security scan
   ↓
7. Resultados y bugs → MS-12
   ↓
8. MS-10 crea bugs automaticamente en Jira con trazabilidad (TC → US → Epic)
   ↓
9. MS-11 genera PDF ejecutivo y notifica por Slack/Teams/Email
   ↓
10. MS-07 muestra todo en dashboards Grafana en tiempo real
```

## Quick Start

```bash
# 1. Levantar la base de datos
cd microservices/ms-12-database
cp .env.example .env
docker-compose up -d

# 2. Levantar el orquestador LLM
cd ../ms-09-orquestador-llm
cp .env.example .env
# Editar .env con tus API keys (ANTHROPIC_API_KEY, etc.)
npm install && npm run dev

# 3. Levantar el reportador
cd ../ms-11-reportador
cp .env.example .env
npm install && npm run dev

# 4. Levantar el MCP (integraciones)
cd ../ms-10-mcp-interfaz
cp .env.example .env
npm install && npm run dev

# 5. Levantar el pipeline
cd ../ms-08-cicd-pipeline
cp .env.example .env
npm install && npm run dev
```

## Estructura del proyecto

```
QASL-NEXUS-LLM/
├── microservices/
│   ├── ms-01-metodologias/          # Templates ISTQB/IEEE
│   ├── ms-02-pruebas-estaticas/     # SUR Static Analyzer
│   ├── ms-03-qasl-framework/        # E2E/API/K6/ZAP/Allure
│   ├── ms-04-qasl-mobile/           # Maestro + Claude Vision
│   ├── ms-05-ingrid-ai-framework/   # AI Testing Core
│   ├── ms-06-garak-llm-security/    # NVIDIA Garak
│   ├── ms-07-sentinel-unified/      # Grafana/Prometheus/InfluxDB
│   ├── ms-08-cicd-pipeline/         # Pipeline Orchestrator
│   ├── ms-09-orquestador-llm/       # Multi-LLM Brain
│   ├── ms-10-mcp-interfaz/          # Jira/X-Ray/TestRail/Azure
│   ├── ms-11-reportador/            # PDF/Slack/Teams/Email
│   └── ms-12-database/              # PostgreSQL Schema
├── MAPEO-MICROSERVICIOS.md          # Arquitectura y flujos
├── CONTEXTO.MD                      # Documento de producto
├── EJEMPLODEARQUITECTURA.MD         # Diagrama ASCII
└── README.md
```

## Tecnologias

| Categoria | Stack |
|-----------|-------|
| IA / LLM | Claude (Anthropic), GPT (OpenAI), Gemini (Google) |
| Testing | Playwright, Newman, K6, OWASP ZAP, Maestro, NVIDIA Garak |
| Backend | TypeScript, Python, Node.js, Express, FastAPI |
| Database | PostgreSQL 16 |
| Monitoreo | Grafana, Prometheus, InfluxDB |
| Integraciones | Jira, X-Ray, TestRail, Azure DevOps |
| Notificaciones | Slack, MS Teams, Email (SMTP) |
| Infraestructura | Docker, Docker Compose |
| Estandares | ISTQB v4.0, IEEE 829/830/1028, ISO/IEC/IEEE 29119 |

## Autor

**Elyer Gregorio Maldonado**
- LinkedIn: [linkedin.com/in/elyergmaldonado](https://linkedin.com/in/elyergmaldonado)

## Licencia

MIT License
