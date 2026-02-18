# QASL Framework - Quality Assurance Shift-Left Platform

<div align="center">

[![Author](https://img.shields.io/badge/Author-Elyer%20Maldonado-blue)](https://github.com/E-Gregorio)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.2.0-orange)](https://github.com/E-Gregorio/QASL-Framework)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Playwright](https://img.shields.io/badge/playwright-latest-orange.svg)
![K6](https://img.shields.io/badge/k6-latest-purple.svg)

> **Q**uality **A**ssurance **S**hift-**L**eft

**The first unified Shift-Left Testing Platform that integrates Static Analysis, Unit Testing, E2E, API, Performance, and Security testing in a single workflow.**

**Created by [Elyer Maldonado](https://github.com/E-Gregorio)** - 2024-2025

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## What Makes QASL Unique?

| Feature | Traditional Tools | QASL Framework |
|---------|-------------------|----------------|
| **Unit Testing** | Only app code | **Test your automation code** (validators, generators) |
| **Infrastructure Logs** | No visibility | **Centralized logs of ALL testing containers** |
| **Static HU Analysis** | Manual review | AI-powered gap detection |
| **API Capture** | Manual Postman setup | Auto-capture from E2E |
| **Test Recording** | Playwright Codegen (5 levels) | Universal Recorder Pro (11 levels + confidence score) |
| **Unified Dashboard** | Multiple tools | Single Grafana Centro de Control |
| **Pipeline** | Separate configs | One command: `npm run pipeline` |

### Two Innovations Nobody Else Does

#### 1. Unit Tests for YOUR Automation Code (Not the App)

> **Problem**: If your `generateValidCUIT()` function generates an invalid CUIT, 100 E2E tests fail and you waste hours debugging.

Traditional QA teams only run unit tests on application code (written by developers). **QASL tests your automation framework itself** - validators, data generators, formatters - ensuring your test infrastructure is 100% reliable BEFORE running E2E.

```bash
npm run unit  # Runs 128+ tests on YOUR automation helpers
```

#### 2. Infrastructure Observability for Testing

> **Problem**: Your tests fail but you don't know if it's the app, the database, Grafana, or any other container.

QASL collects logs from **ALL Docker containers** (Grafana, InfluxDB, PostgreSQL, ZAP, etc.) into a single dashboard. When tests fail, you instantly see if any infrastructure component had errors.

```bash
npm run infra:check  # CLI health check via Loki
npm run infra:logs   # Opens Infrastructure Logs dashboard
```

**Stack**: Loki + Promtail (~350MB RAM vs 16-32GB for ELK/OpenShift)

---

## Features

### Phase 0: Unit Testing of Automation Code (Vitest)

> **Revolutionary**: Test YOUR automation code, not the application.

While developers test application code, **QA teams never test their own automation helpers**. QASL changes this paradigm.

| What Gets Tested | Why It Matters |
|------------------|----------------|
| `validateCUIT()` | Invalid CUIT = form rejection = false test failure |
| `generateTestEmail()` | Duplicate emails = database errors = flaky tests |
| `formatCurrency()` | Wrong format = assertion failures = wasted debug time |
| `validateDateFormat()` | Invalid dates = API rejections = cascading failures |

- **128+ Tests**: Comprehensive coverage of automation helpers
- **Fast Execution**: Sub-second test runs (catches bugs before E2E)
- **80% Coverage**: Minimum threshold enforced
- **Visual UI**: `npm run unit:ui` for interactive debugging

### Phase 1: Static Testing (sigma_analyzer)

- **AI-Powered Analysis**: Detect coverage gaps in User Stories before coding
- **ISTQB/IEEE Compliance**: Following IEEE 829, IEEE 830, ISO/IEC 27001
- **Traceability CSVs**: Export to Jira, Xray, Azure DevOps, TestRail
- **100% Coverage Generation**: Transform incomplete HUs into fully covered ones

### Phase 2: Universal Recorder Pro

- **11-Level Selector Strategy** (vs 5 in Playwright Codegen)
- **Real-time Confidence Score**: Know selector reliability instantly
- **Smart Dynamic Detection**: Avoids UUIDs, timestamps, hashes
- **Auto-respawn UI**: Persistent recording interface

### Phase 3: E2E Testing (Playwright + Allure)

- **Automatic API Capture**: Record APIs during E2E for later testing
- **Allure Integration**: Full traceability with ISTQB decorators
- **Multi-browser**: Chromium, Firefox, WebKit
- **Parallel Execution**: Optimized for speed

### Phase 4: API Testing (Newman)

- **Zero Config**: Uses captured APIs automatically
- **HTMLExtra Reports**: Professional documentation
- **Metrics to Grafana**: Real-time visibility

### Phase 5: Performance Testing (K6)

- **Multiple Test Types**: Load, Stairs, Stress, Spike, Soak
- **Native InfluxDB**: Direct metrics streaming
- **Visual in Grafana**: Real-time VUs, response times, errors

### Phase 6: Security Testing (OWASP ZAP)

- **Automated Scanning**: Baseline security scan
- **OWASP Top 10**: Detect common vulnerabilities
- **Severity Metrics**: HIGH, MEDIUM, LOW, INFO in dashboard

### Phase 7: Infrastructure Observability (Loki + Promtail)

> **Game-changer**: See what's happening inside your testing infrastructure.

When tests fail, is it the app? The database? Grafana? InfluxDB? **Without observability, you're debugging blind.**

QASL collects logs from ALL containers in real-time:

| Container | What You See |
|-----------|--------------|
| `epidata-grafana` | Dashboard errors, datasource issues |
| `epidata-influxdb` | Query failures, storage problems |
| `sigma-postgres` | Connection errors, query timeouts |
| `epidata-zap` | Security scan issues |
| `epidata-loki` | Log ingestion problems |

**Why This Matters:**
```
❌ Without QASL: "Tests failed" → Hours debugging → Find Postgres was down
✅ With QASL: "Tests failed" → Check infra:check → See Postgres error → Fix in 2 min
```

- **Centralized Log Aggregation**: All Docker container logs in one place
- **Real-time Error Detection**: Automatic error/warning detection
- **Lightweight Stack**: ~350MB RAM (vs 16-32GB for ELK/OpenShift)
- **LogQL Queries**: Powerful log querying and filtering
- **CLI Health Check**: `npm run infra:check` for quick status
- **Grafana Dashboard**: http://localhost:3001/d/infrastructure-logs

### Unified Dashboard (Grafana)

- **Centro de Control**: All metrics in one place
- **Auto-refresh**: 5-second updates
- **Color-coded**: Green/Yellow/Red thresholds
- **Historical Data**: Track trends over time

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10 (for sigma_analyzer)
- **Docker Desktop**
- **K6**: [Installation Guide](https://k6.io/docs/getting-started/installation/)

### Installation

```bash
# Clone the repository
git clone https://github.com/E-Gregorio/QASL-Framework.git
cd QASL-Framework

# Install dependencies
npm install
npx playwright install

# Install Python dependencies (for static analysis)
cd sigma_analyzer
pip install -r requirements.txt
cd ..
```

---

## Daily Workflow (Flujo Diario)

| Momento                   | Comando                 | Qué hace                             |
| ------------------------- | ----------------------- | ------------------------------------- |
| **Inicio del día** | `npm run docker:up`   | Levanta Grafana, InfluxDB, Loki, etc. |
| **Antes de demo**   | `npm run clean`       | Limpia reportes y métricas           |
| **Ejecutar todo**   | `npm run demo`        | Tests + métricas + abre dashboards   |
| **Fin del día**    | `npm run docker:down` | Apaga contenedores                    |

---

## Demo Mode (One Command)

Para demos y presentaciones, ejecuta TODO automáticamente con un solo comando:

```bash
npm run demo
```

Este comando:

1. Inicia Docker y espera que los servicios estén listos
2. Crea las bases de datos de métricas (k6 + qa_metrics)
3. Ejecuta Unit Tests (Vitest)
4. Ejecuta E2E Tests + envía métricas a Grafana
5. Ejecuta API Tests + envía métricas a Grafana
6. Ejecuta K6 Performance Tests
7. Ejecuta ZAP Security Tests + envía métricas
8. Abre automáticamente los 2 dashboards de Grafana

**Opciones disponibles:**

| Comando                        | Descripción                          |
| ------------------------------ | ------------------------------------- |
| `npm run demo`               | Ejecuta pipeline completo (~5-10 min) |
| `npm run demo -- --quick`    | Solo E2E + API (~2 min)               |
| `npm run demo -- --skip-zap` | Sin security scan                     |
| `npm run demo -- --skip-k6`  | Sin performance tests                 |

**Abrir dashboards manualmente:**

```bash
npm run dashboard        # Abre Centro de Control
npm run dashboard:all    # Abre ambos dashboards
npm run infra:logs       # Abre Infrastructure Logs
```

---

## Execution Flow (Manual Step by Step)

> **IMPORTANT:** Si prefieres ejecutar paso a paso en vez de `npm run demo`.

### STEP 1: Start Docker Services

```bash
npm run docker:up
```

Wait ~30 seconds. **Verify:** http://localhost:3001 (Grafana)

### STEP 2: Run Unit Tests (Vitest)

```bash
npm run unit
```

> Validates helpers, validators, and data generators work correctly before E2E.

### STEP 3: Run E2E Tests (Playwright) + Send Metrics

```bash
npm run e2e:capture
node scripts_metricas/send-e2e-metrics.mjs
```

> Runs E2E + captures APIs + sends metrics to Grafana.

### STEP 4: Run API Tests (Newman) + Send Metrics

```bash
npm run api
node scripts_metricas/send-api-metrics.mjs
```

### STEP 5: Run Performance Tests (K6)

```bash
npm run k6 -- --type=stairs --vus=5 --duration=60s
```

> K6 sends metrics automatically to InfluxDB/Grafana.

**Available test types:**

| Type       | Description                  | Command                                                |
| ---------- | ---------------------------- | ------------------------------------------------------ |
| `load`   | Normal load (default)        | `npm run k6`                                         |
| `stairs` | Visible staircase in Grafana | `npm run k6 -- --type=stairs --vus=5 --duration=60s` |
| `stress` | Stress to the limit          | `npm run k6 -- --type=stress --vus=50`               |
| `spike`  | Sudden load spike            | `npm run k6 -- --type=spike --vus=30`                |
| `soak`   | Extended endurance           | `npm run k6 -- --type=soak --vus=10 --duration=300s` |

### STEP 6: Run Security Tests (OWASP ZAP) + Send Metrics

```bash
npm run zap
node scripts_metricas/send-zap-metrics.mjs
```

### STEP 7: Open Dashboards

```bash
npm run dashboard:all
```

Or manually:

- Centro de Control: http://localhost:3001/d/sigma-qa-control
- Infrastructure Logs: http://localhost:3001/d/infrastructure-logs

**Credentials:** admin / admin

### STEP 8: End of Day - Stop Docker

```bash
npm run docker:down
```

### Clean Everything (New Day)

```bash
npm run clean
```

> This resets all reports and metrics databases (k6 + qa_metrics).

---

## Quick Reference - COPY/PASTE

```bash
# OPCION 1: Demo automática (recomendado)
npm run demo

# OPCION 2: Demo rápida (solo E2E + API)
npm run demo -- --quick

# OPCION 3: Manual paso a paso
npm run docker:up

# Esperar 30 segundos, luego:
npm run unit
npm run e2e:capture && node scripts_metricas/send-e2e-metrics.mjs
npm run api && node scripts_metricas/send-api-metrics.mjs
npm run k6 -- --type=stairs --vus=5 --duration=60s
npm run zap && node scripts_metricas/send-zap-metrics.mjs
npm run dashboard:all

# Fin del día
npm run docker:down

# Limpiar todo (nuevo día)
npm run clean
```

---

## View Local Allure Report

```bash
npm run allure:open
```

---

## Unit Tests - Automation Framework (Vitest)

Unit tests that validate the automation code (helpers, validators, generators).

> **IMPORTANT:** These tests DO NOT test the application source code (developers do that). They test the automation framework functions to guarantee the automation is 100% reliable.

### Commands

```bash
npm run unit              # Run all unit tests
npm run unit:watch        # Development mode (re-runs on save)
npm run unit:ui           # Visual Vitest interface
npm run unit:coverage     # With code coverage report
```

### What Gets Tested

| Module                     | Function                 | Purpose                                        |
| -------------------------- | ------------------------ | ---------------------------------------------- |
| `validators.ts`          | `validateCUIT()`       | Validates Argentine CUIT before using in forms |
| `validators.ts`          | `validateEmail()`      | Validates email format                         |
| `validators.ts`          | `validateDateFormat()` | Validates DD/MM/YYYY date                      |
| `formatters.ts`          | `formatCurrency()`     | Formats amounts correctly                      |
| `test-data-generator.ts` | `generateValidCUIT()`  | Generates valid CUIT for tests                 |
| `test-data-generator.ts` | `generateTestUser()`   | Generates complete fake user                   |

### Why It Matters

1. **Reliability** - If `generateValidCUIT()` generates an invalid CUIT, 100 E2E tests would fail
2. **Early Detection** - Detects bugs in the framework before running E2E
3. **Living Documentation** - Tests document how helpers work
4. **80% Coverage** - Configured with minimum coverage thresholds

### Reports

```
reports/
├── unit/
│   ├── results.json       # JSON results
│   └── junit.xml          # For CI/CD
└── unit-coverage/
    └── index.html         # Visual coverage report
```

---

## Full Pipeline (Single Command)

```bash
npm run pipeline
```

**With options:**

```bash
npm run pipeline -- --skip-zap    # Skip security
npm run pipeline -- --skip-k6     # Skip performance
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      QASL FRAMEWORK ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐                                                    │
│  │   HU Original   │ User Story from Business/PO                        │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ SIGMA ANALYZER  │───▶│   HU IDEAL      │───▶│  CSVs Export    │     │
│  │ (Static Tests)  │    │ (100% Coverage) │    │ (Jira/Xray)     │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │  UNIT TESTS     │ Validate automation helpers (Vitest 128+ tests)   │
│  │  (Vitest)       │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │ RECORDER PRO    │ Optional: Record new tests with confidence score   │
│  │ (11-Level)      │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                            │
│  │   E2E TESTS     │───▶│  .api-captures/ │ Auto-captured APIs          │
│  │ (Playwright)    │    │                 │                            │
│  └────────┬────────┘    └────────┬────────┘                            │
│           │                      │                                      │
│           │    ┌─────────────────┼─────────────────┐                   │
│           │    │                 │                 │                   │
│           ▼    ▼                 ▼                 ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  API TESTS   │    │ PERFORMANCE  │    │  SECURITY    │              │
│  │  (Newman)    │    │    (K6)      │    │ (OWASP ZAP)  │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                             ▼                                           │
│                    ┌─────────────────┐                                  │
│                    │    InfluxDB     │                                  │
│                    │   (Metrics)     │                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│  ┌─────────────────┐        │                                           │
│  │  PROMTAIL       │────────┤ Collects Docker container logs            │
│  │ (Log Collector) │        │                                           │
│  └────────┬────────┘        │                                           │
│           │                 │                                           │
│           ▼                 │                                           │
│  ┌─────────────────┐        │                                           │
│  │     LOKI        │────────┤ Log aggregation & querying                │
│  │  (Log Store)    │        │                                           │
│  └────────┬────────┘        │                                           │
│           │                 │                                           │
│           └─────────────────┼───────────────────────────────────────    │
│                             │                                           │
│                             ▼                                           │
│                    ┌─────────────────┐                                  │
│                    │  GRAFANA        │                                  │
│                    │ Centro Control  │ Real-time unified dashboard      │
│                    │ + Infra Logs    │ Infrastructure observability     │
│                    └─────────────────┘                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
QASL-Framework/
│
├── sigma_analyzer/              # [PHASE 1] Static Analysis
│   ├── run_analysis.py          # Main analysis script
│   ├── parser.py                # HU Markdown parser
│   ├── rtm_analyzer_ai.py       # AI-powered RTM analyzer
│   ├── report_generator.py      # Report generator
│   ├── hu_ideal_html_generator.py
│   ├── templates/               # ISTQB templates
│   ├── docs/                    # Shift-Left documentation
│   ├── reportes/                # Generated reports
│   └── hu_actualizadas/         # 100% coverage HUs
│
├── unit/                        # [PHASE 0] Unit Tests
│   ├── utils/                   # Validators, formatters (tested)
│   ├── helpers/                 # Data generators (tested)
│   ├── __tests__/               # Vitest unit tests
│   ├── setup.ts                 # Global configuration
│   └── index.ts                 # Centralized exports
│
├── universal_recorder_pro.js    # [PHASE 2] Advanced Test Recorder
│
├── e2e/                         # [PHASE 3] E2E Tests
│   ├── locators/                # Centralized selectors (MODIFY)
│   ├── pages/                   # Page Object Model (MODIFY)
│   ├── specs/                   # Test specifications (MODIFY)
│   ├── test-base/               # Test base & fixtures (MODIFY)
│   └── utils/                   # Utilities & Allure decorators
│
├── scripts/                     # Execution scripts (DO NOT TOUCH)
│   ├── run-e2e.mjs              # E2E + Allure + Metrics
│   ├── run-api.mjs              # Newman + Metrics
│   ├── run-k6.mjs               # K6 + Metrics
│   ├── run-zap.mjs              # OWASP ZAP + Metrics
│   └── run-pipeline.mjs         # Full pipeline
│
├── scripts_metricas/            # Metrics senders (DO NOT TOUCH)
│   ├── influx-client.mjs        # Shared InfluxDB client
│   ├── send-e2e-metrics.mjs
│   ├── send-api-metrics.mjs
│   └── send-zap-metrics.mjs
│
├── sigma-sql/                   # [DB] Test Database
│   ├── SIGMA_DDL.sql            # Complete DDL (30+ tables)
│   ├── importar_csv_docker.sql  # Script for Docker
│   ├── importar_csv_windows.sql # Script for Windows/SSMS
│   ├── datos_prueba.csv         # ~911 masked records
│   └── README.md                # Usage documentation
│
├── docker/                      # Docker configuration
│   ├── grafana/dashboards/      # Centro de Control + Infrastructure Logs
│   ├── loki/                    # Loki configuration
│   ├── promtail/                # Promtail configuration
│   └── postgres/init.sql        # Test data schema
│
├── reports/                     # Generated reports (gitignored)
├── plantillas-istqb/            # ISTQB documentation templates
├── docker-compose.yml           # Service definitions
├── playwright.config.ts         # Playwright configuration
├── vitest.config.ts             # Unit tests configuration
└── package.json                 # NPM scripts
```

---

## Grafana Centro de Control

Access the unified dashboard at `http://localhost:3001`

### Panels

| Section                         | Metrics                                            | Source           |
| ------------------------------- | -------------------------------------------------- | ---------------- |
| **E2E (Playwright)**      | Pass Rate, Passed, Failed, Skipped, Duration       | `e2e_tests`    |
| **API (Newman)**          | Pass Rate, Passed, Failed, Requests, Duration      | `api_tests`    |
| **Security (ZAP)**        | High, Medium, Low, Informational alerts            | `zap_security` |
| **Performance (K6)**      | Success Rate, Response Time, VUs, Requests, Errors | Native K6        |
| **Infrastructure (Loki)** | Errors, Warnings, Total Logs, Active Containers    | Loki/Promtail    |

### Infrastructure Logs Dashboard

Access at `http://localhost:3001/d/infrastructure-logs`

| Panel                | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| **ERRORS**     | Critical errors across all containers (red = action needed) |
| **WARNINGS**   | Warning messages (yellow = review)                          |
| **TOTAL LOGS** | Total log volume in time range                              |
| **CONTAINERS** | Number of active containers sending logs                    |
| **Timeline**   | Log volume over time by container                           |
| **Error Logs** | Real-time error stream for diagnostics                      |
| **All Logs**   | Complete log stream with container filter                   |

### Kiosk Mode (Full Screen)

```
http://localhost:3001/d/sigma-qa-control/sigma-qa-centro-de-control?kiosk=true
```

---

## SQL Server Database - Masked Data (sigma-sql/)

Database with masked data for E2E testing with forms.

### Connection

```
Host: localhost
Port: 1433
User: sa
Password: MyStr0ngP4ssw0rd
Database: SIGMA
```

### Load Test Data

```powershell
# 1. Copy files to container
docker cp sigma-sql/datos_prueba.csv sqlserver:/tmp/data.csv
docker cp sigma-sql/importar_csv_docker.sql sqlserver:/tmp/importar.sql

# 2. Execute import
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "MyStr0ngP4ssw0rd" -C -i /tmp/importar.sql

# 3. Verify
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "MyStr0ngP4ssw0rd" -C -d SIGMA -Q "SELECT COUNT(*) AS Total FROM contribuyente"
```

### Available Data

| Table              | Records | Description                      |
| ------------------ | ------- | -------------------------------- |
| `contribuyente`  | ~911    | CUIT, business name, person type |
| `inconsistencia` | ~911    | Masked tax data                  |
| `actividad`      | ~173    | Economic activities              |

> See complete documentation in `sigma-sql/README.md`

---

## Available Scripts

| Command                     | Description                                |
| --------------------------- | ------------------------------------------ |
| <br />`npm run clean`     | Clean all reports + reset Grafana metrics  |
| `npm run docker:up`       | Start Docker services                      |
| `npm run docker:down`     | Stop Docker services                       |
| `npm run unit`            | Run unit tests                             |
| `npm run unit:watch`      | Unit tests in watch mode                   |
| `npm run unit:ui`         | Visual Vitest interface                    |
| `npm run unit:coverage`   | Unit tests with coverage                   |
| `npm run e2e`             | Run E2E tests                              |
| `npm run e2e:capture`     | Run E2E with API capture                   |
| `npm run api`             | Run API tests                              |
| `npm run k6`              | Run performance tests                      |
| `npm run k6:reset`        | Reset K6 metrics in Grafana                |
| `npm run zap`             | Run security scan                          |
| `npm run demo`            | **Run complete demo (recommended)**  |
| `npm run demo -- --quick` | Quick demo (E2E + API only, ~2 min)        |
| `npm run dashboard`       | Open Centro de Control dashboard           |
| `npm run dashboard:all`   | Open both Grafana dashboards               |
| `npm run infra:check`     | Check infrastructure health via Loki       |
| `npm run infra:logs`      | Open Infrastructure Logs dashboard         |
| `npm run pipeline`        | Run full pipeline (no dashboard auto-open) |
| `npm run publish`         | Publish reports to GitLab Pages            |
| `npm run allure:open`     | Open Allure report                         |

---

## Standards & Compliance

- **ISTQB CTFL v4.0** - Foundation Level syllabus
- **ISTQB CTAL** - Advanced Level practices
- **IEEE 829** - Test documentation standard
- **IEEE 830** - Requirements specification
- **ISO/IEC 27001** - Security considerations
- **ISO 9001** - Quality management
- **OWASP Top 10** - Security testing

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Elyer Maldonado** - QA Tech Lead | Test Automation Architect

- GitHub: [@E-Gregorio](https://github.com/E-Gregorio)
- LinkedIn: [linkedin.com/in/elyerm](https://linkedin.com/in/elyerm)
- Framework: [QASL Framework](https://github.com/E-Gregorio/QASL-Framework)

### Also by the Author

- **[INGRID](https://github.com/E-Gregorio/ingrid-AI-framework)** - AI Testing Framework for LLM/Chatbot validation (OWASP LLM Top 10 2025)

---

## Acknowledgments

- Playwright team for the amazing E2E framework
- K6/Grafana Labs for performance testing tools
- OWASP for security scanning tools
- ISTQB for testing standards and methodologies

---

<div align="center">

**Built with care for the QA Community**

*Shift-Left Testing: Catch bugs before they're born*

---

**QASL Framework** © 2024-2025 Elyer Maldonado. All rights reserved.

</div>
