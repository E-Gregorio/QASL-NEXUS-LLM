# QASL NEXUS LLM

### The First AI-Powered End-to-End QA Automation Platform

> From User Story to Bug Report in Jira -- fully automated, fully traceable, powered by Claude Opus, Sonnet & Gemini.

---

## The Problem

QA teams spend **60-70% of their time** on repetitive tasks: reading requirements, writing test cases, executing regression suites, filing bugs, and generating reports. Existing tools solve fragments of this workflow -- but **no platform connects the entire pipeline from requirements analysis to production monitoring with AI decision-making at every step**.

## The Solution

QASL NEXUS LLM is a **12-microservice platform** that automates the complete QA lifecycle:

```
 Upload a User Story (.docx)          OR          Enter any URL + objective
         |                                                  |
         v                                                  v
 AI detects 40+ requirement gaps          AI generates E2E tests with Playwright
 in 66 seconds (Claude Opus)              using real DOM selectors (Opus)
         |                                                  |
         v                                                  v
 VCR algorithm decides:                   Pipeline executes: E2E + API + K6 + ZAP
 AUTOMATE or MANUAL                       with live sub-step progress tracking
         |                                                  |
         +---------------------+----------------------------+
                               v
              Bugs auto-created in Jira with full traceability
                               |
                               v
              Executive PDF report + Slack/Teams/Email
                               |
                               v
              4 report viewers: Allure + Newman + K6 + ZAP
```

**What takes a QA team days, QASL NEXUS does in minutes.**

---

## Three Execution Flows

### Flow 1: Static Analysis (User Story .docx)
```
MS-02 (parse .docx) --> MS-09 (gap analysis + VCR) --> MS-08 (pipeline)
  --> MS-03 (E2E + API + K6 + ZAP) --> MS-11 (report) + MS-10 (Jira bugs)
```

### Flow 2: Exploratory AI (any URL)
```
MS-00 Command Center --> User enters URL + objective
  --> MS-08 Pipeline orchestrates:
      PHASE 1: MS-03 DOM Scan (Playwright scans all interactive elements)
               MS-09 Opus generates tests using REAL selectors from DOM
      PHASE 2: MS-03 executes 4 test types with sub-step progress:
               - E2E (Playwright + Allure) --> always runs
               - API (Newman) --> if APIs captured during E2E
               - K6 (Performance) --> if APIs captured
               - ZAP (OWASP Security) --> Docker scan against URL
      PHASE 3: MS-11 report (PDF + Email) + MS-10 bug creation
  --> MS-00 PipelineLivePage shows real-time progress per sub-step
```

**DOM Scan**: Before generating tests, Playwright opens the URL in headless Chromium, extracts all inputs, buttons, selects, links, tables, forms, navigation, and labels with their best selectors (data-testid > id > name > role+aria > placeholder > tag.class). Opus receives this real DOM structure and generates tests with verified selectors instead of guessing.

**Verified results**:
- TodoMVC: 10/10 tests passed (100%) with real DOM selectors
- demoqa.com/books: Full pipeline (E2E + Newman + K6 + ZAP) completed with PDF, Email, Grafana

Two execution modes available in the UI:
- **EXPLORAR E2E**: Only Playwright + Allure report (fast)
- **PIPELINE COMPLETO**: E2E + Newman API + K6 Performance + ZAP Security

### Flow 3: Import Existing Tests (coming soon)
```
MS-00 Command Center --> User pastes existing Playwright spec + target URL
  --> MS-08 Pipeline orchestrates:
      PHASE 1: MS-09 Sonnet adapts spec (adds Allure wrapping, test.step,
               screenshots) WITHOUT changing selectors or test logic
      PHASE 2: MS-03 executes adapted spec (E2E + Newman + K6 + ZAP)
      PHASE 3: MS-11 report + MS-10 bug creation
```

Allows QA teams with existing E2E test suites to bring them into QASL NEXUS and get the full platform benefits: Allure reports, API testing, performance testing, security scanning, PDF reports, email notifications, and Grafana dashboards -- without rewriting their tests.

---

## Architecture

```
                              QASL NEXUS LLM
    ================================================================

    MS-00 COMMAND CENTER (React + Vite + Express BFF)
    -------------------------------------------------
    [Dashboard] [Nueva HU] [Proyecto Existente] [Exploratory AI]
    [Pipeline Live - real-time] [Resultados - PDF/Email/Trazabilidad]
         |
         v
    PHASE 1: ANALYSIS
    -----------------
    [.docx Upload] --> MS-02 Static Analyzer --> MS-09 LLM Brain
                        (Parse HU, 4 CSVs)       (Opus: Gap Analysis)
    [URL + Objective] --> MS-03 DOM Scan --> MS-09 Opus generates E2E tests
                              |                         |
                              +------------+------------+
                                           v
                                    MS-12 DATABASE
                                  (PostgreSQL 16)
                              17 tables - 8 views
                              Single Source of Truth

    PHASE 2: DECISION
    ------------------
                    MS-09 VCR Calculator (Opus)
                    Value(1-3) + Cost(1-3) + Risk(Prob x Impact)
                    VCR >= 9 --> AUTOMATE
                    VCR <  9 --> MANUAL

    PHASE 3: EXECUTION (Parallel with sub-step tracking)
    -----------------------------------------------------
    MS-08 CI/CD Pipeline (Director)
         |
         +---> MS-03 QASL Framework    [Playwright + Newman + K6 + ZAP]
         |     (4 sub-steps tracked:    ms03_e2e, ms03_api, ms03_k6, ms03_zap)
         +---> MS-04 QASL Mobile       [Maestro - iOS - Android]
         +---> MS-05 INGRID AI         [AI App Testing - OWASP LLM Top 10]
         +---> MS-06 Garak Security    [NVIDIA - Jailbreak - Injection - Leakage]

    PHASE 4: REPORTING
    ------------------
    MS-10 MCP --> Jira / X-Ray / TestRail / Azure DevOps (auto bug creation)
    MS-11 Report --> Pipeline PDF + Executive PDF + Slack + Teams + Email
    MS-07 Sentinel --> Grafana + Prometheus + InfluxDB (real-time dashboards)

    REPORT VIEWERS (served by MS-03 on :6001)
    ------------------------------------------
    Allure HTML  --> /api/report/allure/index.html
    Newman HTML  --> /api/report/newman-view/:pipelineId
    K6 HTML      --> /api/report/k6-view/:pipelineId
    ZAP HTML     --> /api/report/zap/zap-:pipelineId.html
```

---

## MS-00 Command Center

React 18 + Vite 6 + Express BFF + Tailwind CSS v3

| Page | Purpose |
|------|---------|
| **Dashboard** | Overview metrics from 8 database views |
| **Nueva HU** | Upload User Story .docx for static analysis |
| **Proyecto Existente** | Run pipeline on existing project data |
| **Exploratory AI** | Enter any URL + objective, choose E2E or Full pipeline |
| **Pipeline Live** | Real-time progress: 3 phases, sub-step tracking per test type |
| **Resultados** | Metrics, defects, PDF download, Allure report, trazabilidad, email |

### Key Features
- 2 execution modes: EXPLORAR E2E (fast) and PIPELINE COMPLETO (full)
- LIMPIAR RESULTADOS button: cleans DB (3 tables) + disk reports
- 4 report viewer buttons: Allure (purple), Newman (orange), K6 (green), ZAP (red)
- Pipeline PDF download and email re-send per pipeline
- Full traceability tree: Epic --> US --> Suite --> TC
- BFF on port 3030: direct queries to MS-12 views + proxy to MS-08/09/10/11

---

## The 12 Microservices

| # | Service | Port | Role | Stack |
|---|---------|------|------|-------|
| 00 | **Command Center** | 3030 (5173 dev) | React SPA + Express BFF, 6 pages | React, Vite, Express, Tailwind |
| 01 | **Metodologias** | 3000 | ISTQB v4.0 / IEEE 829 / IEEE 830 templates | Markdown, HTML |
| 02 | **Pruebas Estaticas** | 4000 | Parse User Stories, detect gaps, generate 4 traceability CSVs | Python, Claude AI |
| 03 | **QASL Framework** | 6001 | E2E + API + Performance + Security testing + report serving | Playwright, Newman, K6, ZAP |
| 04 | **QASL Mobile** | 7500 | iOS & Android automation + Claude Vision UX analysis | Maestro, MobSF |
| 05 | **INGRID AI** | 7000 | AI app testing with OWASP LLM Top 10 (chatbots/AI apps only) | TypeScript, Multi-LLM |
| 06 | **Garak Security** | 7600 | LLM vulnerability scanning (jailbreak, prompt injection, leakage) | NVIDIA Garak, Python |
| 07 | **Sentinel Unified** | 3003 | Real-time monitoring with 5 dashboards | Grafana, Prometheus, InfluxDB |
| 08 | **CI/CD Pipeline** | 8888 | 3-phase orchestrator with JSONB sub-step tracking | TypeScript, Express |
| 09 | **Orquestador LLM** | 8000 | Multi-LLM Decision Engine + Exploratory test generation | TypeScript, Express |
| 10 | **MCP Interfaz** | 5000 | External tool connectors with 7-step automated bug creation | TypeScript, Express |
| 11 | **Reportador** | 9000 | Pipeline PDF + Executive PDF + multi-channel notifications | TypeScript, PDFKit, Nodemailer |
| 12 | **Database** | 5432 | Single Source of Truth: 17 tables, 8 views, 12 triggers | PostgreSQL 16, Docker |

---

## Multi-LLM Decision Engine (MS-09)

QASL NEXUS doesn't use a single AI model. It routes each task to the **optimal LLM** based on complexity, cost, and capability:

| Tier | Model | Tasks | Why |
|------|-------|-------|-----|
| **CRITICAL** | Claude Opus 4.6 | Gap Analysis, VCR Calculation, Test Generation, Exploratory E2E | Deep reasoning, highest accuracy for complex analysis |
| **STANDARD** | Claude Sonnet 4.5 | Bug Description, Template Fill, Test Data Gen, Field Mapping | Fast structured output, cost-effective for repetitive tasks |
| **VISION** | Gemini 2.5 Pro | Screenshot Analysis | Best multimodal vision for UI/UX defect detection |

**Tested**: Opus analyzed a User Story and detected **40 requirement gaps in 66 seconds** with full ISTQB classification.

---

## MS-03 QASL Framework

4-step test execution pipeline with individual sub-step progress tracking:

| Step | Tool | What it does | Condition |
|------|------|-------------|-----------|
| 1. E2E | Playwright | Runs generated tests with Allure metadata | Always |
| 2. API | Newman | Runs Postman collection from captured API calls | If APIs captured during E2E |
| 3. K6 | K6 | Load testing against captured API endpoints | If APIs captured (full mode) |
| 4. ZAP | OWASP ZAP | Security baseline scan via Docker | Full/security mode |

### API Capture System
- Custom Playwright fixture (`api-capture.ts`) intercepts XHR/fetch during E2E
- Domain filtering: only captures requests to the target origin (ignores ad trackers)
- Captured APIs feed Newman (API tests) and K6 (performance tests)

### Report Serving
MS-03 serves all 4 report types via HTTP on port 6001:
- Allure: `/api/report/allure/index.html`
- Newman: `/api/report/newman-view/:pipelineId`
- K6: `/api/report/k6-view/:pipelineId`
- ZAP: `/api/report/zap/zap-:pipelineId.html`

### Clean Reports
`DELETE /api/clean-reports` removes all report directories from disk (called by LIMPIAR button).

---

## VCR Methodology (Automation Decision)

Every test case is scored automatically:

```
VCR = Value (1-3) + Cost (1-3) + Risk (Probability x Impact)

VCR >= 9  -->  AUTOMATE (high value, high risk, worth the investment)
VCR <  9  -->  MANUAL   (low value or low risk, manual is sufficient)
```

This eliminates the subjective "should we automate this?" debate with a **data-driven decision algorithm**.

---

## Database Schema (MS-12)

PostgreSQL 16 as Single Source of Truth:

**17 Tables**: epic, user_story, test_suite, test_case, test_case_step, precondition, precondition_test_case, static_analysis_gap, vcr_score, test_execution, defect, pipeline_run, metric, notification, report, exploration_finding, generated_test_case

**8 Views**: v_traceability, v_executive_summary, v_pass_rate, v_defect_summary, v_pending_gaps, v_pipeline_metrics, v_test_coverage, v_technical_debt

**12 Triggers**: Auto-calculate updated_at, VCR scores, and pass rates on INSERT/UPDATE

**JSONB Progress Tracking**: `pipeline_run.fases_ejecutadas` uses JSONB merge (`||`) for concurrent sub-step updates from MS-03 and MS-08 without overwriting each other.

---

## External Integrations (MS-10)

| Tool | Capabilities | Auth |
|------|-------------|------|
| **Jira** | Create bugs, link to stories, fetch status | Basic Auth (email + API token) |
| **X-Ray** | Import test executions, create test plans, bulk CSV import | OAuth (Client ID + Secret) |
| **TestRail** | Create test cases/runs, report results, close runs | Basic Auth (email + API key) |
| **Azure DevOps** | Create bugs as Work Items, link related items | PAT (Personal Access Token) |

### 7-Step Automated Bug Creation Flow

```
1. Fetch bug report template from MS-01
2. Query full traceability chain from MS-12 (Epic -> US -> Suite -> TC)
3. Generate AI-powered bug description via MS-09 (Sonnet)
4. Build complete bug payload with severity, priority, classification
5. Create issue in Jira or Azure DevOps
6. Create bidirectional traceability links
7. Save defect record in MS-12 with external issue key
```

---

## Notification Channels (MS-11)

| Channel | Format | Features |
|---------|--------|----------|
| **Pipeline PDF** | Per-pipeline PDF report | Pipeline metrics, test results, generated from MS-12 data |
| **Executive PDF** | 5-page executive report | Summary, execution metrics, defect analysis, automation progress, recommendations |
| **Slack** | Webhook with attachments | Color-coded pipeline results, critical alerts |
| **Microsoft Teams** | MessageCard format | Pipeline status, test metrics, markdown support |
| **Email** | HTML with pipeline data | Auto-sent on pipeline completion, re-send button in UI |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/E-Gregorio/QASL-NEXUS-LLM.git
cd QASL-NEXUS-LLM

# 2. Start the database (Docker required)
cd microservices/ms-12-database
cp .env.example .env
docker-compose up -d
# PostgreSQL on :5432 | pgAdmin on :5050

# 3. Start the QASL Framework
cd ../ms-03-qasl-framework/QASL-Framework
npm install && node server.mjs
# HTTP API on :6001 (serves reports + executes tests)

# 4. Start the LLM Orchestrator
cd ../../ms-09-orquestador-llm
cp .env.example .env
# Add your API keys: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
npm install && npm run dev

# 5. Start the CI/CD Pipeline
cd ../ms-08-cicd-pipeline
cp .env.example .env
npm install && npm run dev

# 6. Start the MCP Integration Hub
cd ../ms-10-mcp-interfaz
cp .env.example .env
# Optional: Add Jira/Azure credentials
npm install && npm run dev

# 7. Start the Report Generator
cd ../ms-11-reportador
cp .env.example .env
# Optional: Add Slack/Teams/Email credentials
npm install && npm run dev

# 8. Start the Command Center
cd ../ms-00-command-center
npm install && npm run dev
# Frontend on :5173 | BFF on :3030
```

**Verify everything is running:**
```bash
curl http://localhost:8888/api/pipeline/health
```

**Run an exploratory test:**
1. Open http://localhost:5173/exploratory
2. Enter a URL (e.g., https://demo.playwright.dev/todomvc)
3. Enter an objective
4. Click EXPLORAR E2E or PIPELINE COMPLETO
5. Watch progress live on Pipeline Live page

---

## API Reference

### MS-00 Command Center BFF (:3030)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/overview` | Dashboard metrics from 8 views |
| GET | `/api/dashboard/traceability` | Full traceability tree |
| GET | `/api/dashboard/gaps` | Pending requirement gaps |
| POST | `/api/proxy/pipeline/run` | Proxy to MS-08 pipeline |
| GET | `/api/proxy/pipeline/status/:id` | Proxy pipeline status |
| DELETE | `/api/proxy/pipeline/clean-results` | Clean all results (DB + disk) |

### MS-03 QASL Framework (:6001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/explore` | DOM Scan: Playwright scans URL, extracts all interactive elements |
| POST | `/api/execute` | Execute tests (E2E + API + K6 + ZAP) |
| DELETE | `/api/clean-reports` | Remove all report files from disk |
| GET | `/api/report/allure/*` | Serve Allure HTML report |
| GET | `/api/report/zap/*` | Serve ZAP HTML/JSON reports |
| GET | `/api/report/newman-view/:id` | Redirect to Newman HTML report |
| GET | `/api/report/k6-view/:id` | Redirect to K6 HTML report |
| GET | `/api/report/zap-list` | List available ZAP reports |
| GET | `/api/report/newman-list` | List available Newman reports |
| GET | `/api/report/k6-list` | List available K6 reports |
| GET | `/api/results/:pipelineId` | Pipeline execution details |

### MS-08 CI/CD Pipeline (:8888)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pipeline/run` | Execute pipeline (full/e2e/regression/smoke/security/mobile) |
| GET | `/api/pipeline/status/:id` | Get pipeline execution status with JSONB sub-steps |
| GET | `/api/pipeline/history` | List pipeline execution history |
| DELETE | `/api/pipeline/clean-results` | Clean DB tables + MS-03 disk reports |
| GET | `/api/pipeline/health` | Health check all microservices |

### MS-09 Orquestador LLM (:8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/llm/process` | Process task with optimal LLM (auto-routed) |
| POST | `/api/llm/exploratory/generate` | Generate Playwright tests from URL (Opus) |
| POST | `/api/llm/vcr/calculate` | Calculate VCR score for test case |
| POST | `/api/llm/template/fill-bug` | Generate AI bug description (Sonnet) |
| GET | `/api/llm/health` | LLM providers status |
| GET | `/api/llm/rules` | Current LLM routing rules |

### MS-10 MCP Interfaz (:5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mcp/bug/create` | 7-step automated bug creation |
| POST | `/api/mcp/jira/issue` | Direct Jira issue creation |
| GET | `/api/mcp/jira/issue/:key` | Get Jira issue status |
| POST | `/api/mcp/xray/execution` | Import X-Ray test execution |
| POST | `/api/mcp/testrail/result` | Report TestRail result |
| POST | `/api/mcp/azure/bug` | Create Azure DevOps bug |
| GET | `/api/mcp/connectors/status` | All connector statuses |

### MS-11 Reportador (:9000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/report/executive` | Generate executive PDF + notify channels |
| POST | `/api/report/pipeline` | Notify pipeline result (Slack/Teams/Email) |
| POST | `/api/report/pipeline-pdf` | Generate pipeline-specific PDF |
| POST | `/api/report/resend-notification` | Re-send email for pipeline |
| POST | `/api/report/alert` | Send critical alert to all channels |
| GET | `/api/report/download/:filename` | Download generated PDF |
| GET | `/api/report/summary` | JSON executive summary |

---

## Project Structure

```
QASL-NEXUS-LLM/
├── microservices/
│   ├── ms-00-command-center/            # React SPA + Express BFF (6 pages)
│   │   ├── src/client/                  # React pages, components, hooks, API client
│   │   └── src/server/                  # Express BFF, routes, config
│   ├── ms-01-metodologias/              # ISTQB/IEEE templates
│   ├── ms-02-pruebas-estaticas/         # Static Analysis + Claude AI
│   ├── ms-03-qasl-framework/            # Playwright + K6 + Newman + ZAP
│   │   └── QASL-Framework/
│   │       ├── server.mjs               # HTTP API + report serving
│   │       ├── e2e/api-capture.ts       # Playwright fixture (API interception)
│   │       ├── playwright.config.ts     # Headless: false locally
│   │       └── reports/                 # allure, zap, api, k6
│   ├── ms-04-qasl-mobile/              # Maestro + MobSF + Claude Vision
│   ├── ms-05-ingrid-ai-framework/      # AI App Testing (OWASP LLM Top 10)
│   ├── ms-06-garak-llm-security/       # NVIDIA Garak LLM Scanner
│   ├── ms-07-sentinel-unified/         # Grafana + Prometheus + InfluxDB
│   ├── ms-08-cicd-pipeline/            # 3-Phase Pipeline Orchestrator
│   │   └── src/services/pipeline-executor.ts  # JSONB merge, sub-step tracking
│   ├── ms-09-orquestador-llm/          # Multi-LLM Decision Engine
│   │   └── src/routes/llm.routes.ts    # /exploratory/generate endpoint
│   ├── ms-10-mcp-interfaz/             # Jira/XRay/TestRail/Azure Connectors
│   ├── ms-11-reportador/               # Pipeline PDF + Executive PDF + Email
│   └── ms-12-database/                 # PostgreSQL 16 Schema + Docker
├── diagramas/                          # PlantUML architecture diagrams
├── diagrama.md                         # Mermaid architecture diagrams
└── README.md
```

---

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, Vite 6, Tailwind CSS v3, React Router |
| **AI / LLM** | Claude Opus 4.6, Claude Sonnet 4.5, Gemini 2.5 Pro |
| **Test Automation** | Playwright, Newman (Postman), K6 (Grafana), OWASP ZAP |
| **Mobile Testing** | Maestro (iOS + Android), MobSF |
| **LLM Security** | NVIDIA Garak (jailbreak, injection, leakage, hallucination) |
| **Backend** | TypeScript, Python, Node.js, Express |
| **Database** | PostgreSQL 16 (17 tables, 8 views, 12 triggers) |
| **Monitoring** | Grafana, Prometheus, InfluxDB |
| **Integrations** | Jira, X-Ray, TestRail, Azure DevOps |
| **Notifications** | Slack, Microsoft Teams, Email (SMTP) |
| **Reporting** | PDFKit, Allure, Newman HTML, K6 HTML, ZAP HTML |
| **Infrastructure** | Docker, Docker Compose |
| **Standards** | ISTQB v4.0, IEEE 829, IEEE 830, ISO/IEC/IEEE 29119 |

---

## Standards Compliance

| Standard | Application |
|----------|------------|
| **ISTQB v4.0** | Test design techniques, test levels, test types classification |
| **IEEE 829** | Test plan documentation structure and templates |
| **IEEE 830** | Software requirements specification format |
| **ISO/IEC/IEEE 29119** | Test process, test documentation, test techniques |
| **OWASP LLM Top 10** | Security testing for Large Language Models |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Microservices | 12 + Command Center |
| Database Tables | 17 |
| Database Views | 8 |
| Database Triggers | 12 |
| API Endpoints | 40+ |
| UI Pages | 6 |
| LLM Providers | 3 (Claude, OpenAI, Gemini) |
| External Connectors | 4 (Jira, X-Ray, TestRail, Azure DevOps) |
| Notification Channels | 5 (Pipeline PDF, Executive PDF, Slack, Teams, Email) |
| Test Frameworks | 6 (Playwright, Newman, K6, ZAP, Maestro, Garak) |
| Report Viewers | 4 (Allure, Newman, K6, ZAP) |
| Gap Detection Speed | 40 gaps in 66 seconds (Opus) |
| Pipeline Types | 6 (full, e2e, regression, smoke, security, mobile) |

---

## Author

**Elyer Gregorio Maldonado**

QA Automation Architect | AI-Powered Testing | 6+ Years

[![LinkedIn](https://img.shields.io/badge/LinkedIn-elyergmaldonado-blue?style=flat&logo=linkedin)](https://linkedin.com/in/elyergmaldonado)
[![GitHub](https://img.shields.io/badge/GitHub-E--Gregorio-black?style=flat&logo=github)](https://github.com/E-Gregorio)

---

## License

MIT License - See [LICENSE](LICENSE) for details.
