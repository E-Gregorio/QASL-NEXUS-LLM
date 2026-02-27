# QASL NEXUS LLM

### The First AI-Powered End-to-End QA Automation Platform

> From User Story to Bug Report in Jira -- fully automated, fully traceable, powered by Claude Opus, Sonnet & Gemini.

---

## The Problem

QA teams spend **60-70% of their time** on repetitive tasks: reading requirements, writing test cases, executing regression suites, filing bugs, and generating reports. Existing tools solve fragments of this workflow -- but **no platform connects the entire pipeline from requirements analysis to production monitoring with AI decision-making at every step**.

## The Solution

QASL NEXUS LLM is a **12-microservice platform** that automates the complete QA lifecycle:

```
 Upload a User Story (.docx)
         |
         v
 AI detects 40+ requirement gaps in 66 seconds (Claude Opus)
         |
         v
 VCR algorithm decides: AUTOMATE or MANUAL (Value + Cost + Risk)
         |
         v
 Pipeline executes tests in parallel (E2E, Mobile, API, Security, LLM)
         |
         v
 Bugs auto-created in Jira with full traceability (Epic -> US -> TC)
         |
         v
 Executive PDF report + Slack/Teams/Email notifications
         |
         v
 Real-time dashboards in Grafana
```

**What takes a QA team days, QASL NEXUS does in minutes.**

---

## Architecture

```
                              QASL NEXUS LLM
    ================================================================

    PHASE 1: ANALYSIS
    -----------------
    [.docx Upload] --> MS-02 Static Analyzer --> MS-09 LLM Brain
                        (Parse HU, 4 CSVs)       (Opus: Gap Analysis)
                              |                         |
                              +------------+------------+
                                           v
                                    MS-12 DATABASE
                                  (PostgreSQL 16)
                               15 tables - 8 views
                              Single Source of Truth

    PHASE 2: DECISION
    ------------------
                    MS-09 VCR Calculator (Opus)
                    Value(1-3) + Cost(1-3) + Risk(Prob x Impact)
                    VCR >= 9 --> AUTOMATE
                    VCR <  9 --> MANUAL

    PHASE 3: EXECUTION (Parallel)
    ------------------------------
    MS-08 CI/CD Pipeline (Director)
         |
         +---> MS-03 QASL Framework    [Playwright - Newman - K6 - ZAP]
         +---> MS-04 QASL Mobile       [Maestro - iOS - Android]
         +---> MS-05 INGRID AI         [AI Test Generation - OWASP LLM Top 10]
         +---> MS-06 Garak Security    [NVIDIA - Jailbreak - Injection - Leakage]

    PHASE 4: REPORTING
    ------------------
    MS-10 MCP --> Jira / X-Ray / TestRail / Azure DevOps (auto bug creation)
    MS-11 Report --> PDF Executive Report + Slack + Teams + Email
    MS-07 Sentinel --> Grafana + Prometheus + InfluxDB (real-time dashboards)
```

---

## The 12 Microservices

| # | Service | Port | Role | Stack |
|---|---------|------|------|-------|
| 01 | **Metodologias** | 3000 | ISTQB v4.0 / IEEE 829 / IEEE 830 templates | Markdown, HTML |
| 02 | **Pruebas Estaticas** | 4000 | Parse User Stories, detect gaps, generate 4 traceability CSVs | Python, Claude AI |
| 03 | **QASL Framework** | 6001 | E2E + API + Performance + Security testing | Playwright, Newman, K6, ZAP, Vitest |
| 04 | **QASL Mobile** | 7500 | iOS & Android automation + Claude Vision UX analysis | Maestro, MobSF |
| 05 | **INGRID AI** | 7000 | AI-powered test generation with OWASP LLM Top 10 compliance | TypeScript, Multi-LLM |
| 06 | **Garak Security** | 7600 | LLM vulnerability scanning (jailbreak, prompt injection, data leakage) | NVIDIA Garak, Python |
| 07 | **Sentinel Unified** | 3003 | Real-time monitoring with 5 dashboards | Grafana, Prometheus, InfluxDB |
| 08 | **CI/CD Pipeline** | 8888 | 3-phase orchestrator: Analysis > Execution > Reporting | TypeScript, Express |
| 09 | **Orquestador LLM** | 8000 | Multi-LLM Decision Engine with 3-tier strategy | TypeScript, Express |
| 10 | **MCP Interfaz** | 5000 | External tool connectors with 7-step automated bug creation | TypeScript, Express |
| 11 | **Reportador** | 9000 | 5-page executive PDF + multi-channel notifications | TypeScript, PDFKit, Nodemailer |
| 12 | **Database** | 5432 | Single Source of Truth: 15 tables, 8 views, 12 triggers | PostgreSQL 16, Docker |

---

## Multi-LLM Decision Engine (MS-09)

QASL NEXUS doesn't use a single AI model. It routes each task to the **optimal LLM** based on complexity, cost, and capability:

| Tier | Model | Tasks | Why |
|------|-------|-------|-----|
| **CRITICAL** | Claude Opus 4.6 | Gap Analysis, VCR Calculation, Test Generation | Deep reasoning, highest accuracy for complex analysis |
| **STANDARD** | Claude Sonnet 4.5 | Bug Description, Template Fill, Test Data Gen, Field Mapping | Fast structured output, cost-effective for repetitive tasks |
| **VISION** | Gemini 2.5 Pro | Screenshot Analysis | Best multimodal vision for UI/UX defect detection |

**Tested**: Opus analyzed a User Story and detected **40 requirement gaps in 66 seconds** with full ISTQB classification.

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

**15 Tables**: epic, user_story, test_suite, test_case, test_case_step, precondition, precondition_test_case, static_analysis_gap, vcr_score, test_execution, defect, pipeline_run, metric, notification, report

**8 Views**: v_traceability, v_executive_summary, v_pass_rate, v_defect_summary, v_pending_gaps, v_pipeline_metrics, v_test_coverage, v_technical_debt

**12 Triggers**: Auto-calculate updated_at, VCR scores, and pass rates on INSERT/UPDATE

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
| **PDF Report** | 5-page executive report | Summary, execution metrics, defect analysis, automation progress, recommendations |
| **Slack** | Webhook with attachments | Color-coded pipeline results, critical alerts |
| **Microsoft Teams** | MessageCard format | Pipeline status, test metrics, markdown support |
| **Email** | HTML with PDF attachment | Weekly scheduled reports (cron: Friday 17:00) |

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

# 3. Start the LLM Orchestrator
cd ../ms-09-orquestador-llm
cp .env.example .env
# Add your API keys: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
npm install && npm run dev

# 4. Start the CI/CD Pipeline
cd ../ms-08-cicd-pipeline
cp .env.example .env
npm install && npm run dev

# 5. Start the MCP Integration Hub
cd ../ms-10-mcp-interfaz
cp .env.example .env
# Optional: Add Jira/Azure credentials
npm install && npm run dev

# 6. Start the Report Generator
cd ../ms-11-reportador
cp .env.example .env
# Optional: Add Slack/Teams/Email credentials
npm install && npm run dev
```

**Verify everything is running:**
```bash
curl http://localhost:8888/api/pipeline/health
```

---

## API Reference

### MS-08 CI/CD Pipeline (:8888)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pipeline/run` | Execute pipeline (full/regression/smoke/security/mobile) |
| GET | `/api/pipeline/status/:id` | Get pipeline execution status |
| GET | `/api/pipeline/history` | List pipeline execution history |
| GET | `/api/pipeline/health` | Health check all microservices |

### MS-09 Orquestador LLM (:8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/llm/process` | Process task with optimal LLM (auto-routed) |
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
| POST | `/api/report/executive` | Generate PDF + notify all channels |
| POST | `/api/report/pipeline` | Notify pipeline result |
| POST | `/api/report/alert` | Send critical alert |
| GET | `/api/report/summary` | JSON executive summary |

---

## Project Structure

```
QASL-NEXUS-LLM/
├── microservices/
│   ├── ms-01-metodologias/            # ISTQB/IEEE templates
│   ├── ms-02-pruebas-estaticas/       # Static Analysis + Claude AI
│   ├── ms-03-qasl-framework/          # Playwright + K6 + Newman + ZAP
│   ├── ms-04-qasl-mobile/             # Maestro + MobSF + Claude Vision
│   ├── ms-05-ingrid-ai-framework/     # AI Test Generation (OWASP LLM Top 10)
│   ├── ms-06-garak-llm-security/      # NVIDIA Garak LLM Scanner
│   ├── ms-07-sentinel-unified/        # Grafana + Prometheus + InfluxDB
│   ├── ms-08-cicd-pipeline/           # 3-Phase Pipeline Orchestrator
│   ├── ms-09-orquestador-llm/         # Multi-LLM Decision Engine
│   ├── ms-10-mcp-interfaz/            # Jira/XRay/TestRail/Azure Connectors
│   ├── ms-11-reportador/              # PDF + Slack + Teams + Email
│   └── ms-12-database/                # PostgreSQL 16 Schema + Docker
├── diagramas/                         # PlantUML architecture diagrams
├── diagrama.md                        # Mermaid architecture diagrams
└── README.md
```

---

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **AI / LLM** | Claude Opus 4.6, Claude Sonnet 4.5, Gemini 2.5 Pro |
| **Test Automation** | Playwright, Newman (Postman), K6 (Grafana), OWASP ZAP |
| **Mobile Testing** | Maestro (iOS + Android), MobSF |
| **LLM Security** | NVIDIA Garak (jailbreak, injection, leakage, hallucination) |
| **Backend** | TypeScript, Python, Node.js, Express |
| **Database** | PostgreSQL 16 (15 tables, 8 views, 12 triggers) |
| **Monitoring** | Grafana, Prometheus, InfluxDB |
| **Integrations** | Jira, X-Ray, TestRail, Azure DevOps |
| **Notifications** | Slack, Microsoft Teams, Email (SMTP) |
| **Infrastructure** | Docker, Docker Compose |
| **Standards** | ISTQB v4.0, IEEE 829, IEEE 830, ISO/IEC/IEEE 29119 |
| **PDF Generation** | PDFKit (5-page executive reports) |

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
| Microservices | 12 |
| Database Tables | 15 |
| Database Views | 8 |
| Database Triggers | 12 |
| API Endpoints | 20+ |
| LLM Providers | 3 (Claude, OpenAI, Gemini) |
| External Connectors | 4 (Jira, X-Ray, TestRail, Azure DevOps) |
| Notification Channels | 4 (PDF, Slack, Teams, Email) |
| Test Frameworks | 6 (Playwright, Newman, K6, ZAP, Maestro, Garak) |
| Gap Detection Speed | 40 gaps in 66 seconds (Opus) |
| TypeScript Errors | 0 across all microservices |
| npm Vulnerabilities | 0 |

---

## Author

**Elyer Gregorio Maldonado**

QA Automation Architect | AI-Powered Testing | 6+ Years

[![LinkedIn](https://img.shields.io/badge/LinkedIn-elyergmaldonado-blue?style=flat&logo=linkedin)](https://linkedin.com/in/elyergmaldonado)
[![GitHub](https://img.shields.io/badge/GitHub-E--Gregorio-black?style=flat&logo=github)](https://github.com/E-Gregorio)

---

## License

MIT License - See [LICENSE](LICENSE) for details.
