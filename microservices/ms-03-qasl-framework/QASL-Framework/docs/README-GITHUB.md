# QASL Framework - Shift-Left QA Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Playwright](https://img.shields.io/badge/playwright-latest-orange.svg)
![K6](https://img.shields.io/badge/k6-latest-purple.svg)

**The first unified Shift-Left Testing Platform that integrates Static Analysis, E2E, API, Performance, and Security testing in a single workflow.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 What Makes QASL Unique?

| Feature | Traditional Tools | QASL Framework |
|---------|------------------|----------------|
| **Static HU Analysis** | Manual review | AI-powered gap detection |
| **API Capture** | Manual Postman setup | Auto-capture from E2E |
| **Test Recording** | Playwright Codegen (5 levels) | Universal Recorder Pro (11 levels + confidence score) |
| **Unified Dashboard** | Multiple tools | Single Grafana Centro de Control |
| **Pipeline** | Separate configs | One command: `npm run pipeline` |

---

## ✨ Features

### 🔬 Phase 1: Static Testing (sigma_analyzer)
- **AI-Powered Analysis**: Detect coverage gaps in User Stories before coding
- **ISTQB/IEEE Compliance**: Following IEEE 829, IEEE 830, ISO/IEC 27001
- **Traceability CSVs**: Export to Jira, Xray, Azure DevOps, TestRail
- **100% Coverage Generation**: Transform incomplete HUs into fully covered ones

### 🎬 Phase 2: Universal Recorder Pro
- **11-Level Selector Strategy** (vs 5 in Playwright Codegen)
- **Real-time Confidence Score**: Know selector reliability instantly
- **Smart Dynamic Detection**: Avoids UUIDs, timestamps, hashes
- **Auto-respawn UI**: Persistent recording interface

### 🧪 Phase 3: E2E Testing (Playwright + Allure)
- **Automatic API Capture**: Record APIs during E2E for later testing
- **Allure Integration**: Full traceability with ISTQB decorators
- **Multi-browser**: Chromium, Firefox, WebKit
- **Parallel Execution**: Optimized for speed

### 🔌 Phase 4: API Testing (Newman)
- **Zero Config**: Uses captured APIs automatically
- **HTMLExtra Reports**: Professional documentation
- **Metrics to Grafana**: Real-time visibility

### ⚡ Phase 5: Performance Testing (K6)
- **Multiple Test Types**: Load, Stairs, Stress, Spike, Soak
- **Native InfluxDB**: Direct metrics streaming
- **Visual in Grafana**: Real-time VUs, response times, errors

### 🛡️ Phase 6: Security Testing (OWASP ZAP)
- **Automated Scanning**: Baseline security scan
- **OWASP Top 10**: Detect common vulnerabilities
- **Severity Metrics**: HIGH, MEDIUM, LOW, INFO in dashboard

### 📊 Unified Dashboard (Grafana)
- **Centro de Control**: All metrics in one place
- **Auto-refresh**: 5-second updates
- **Color-coded**: Green/Yellow/Red thresholds
- **Historical Data**: Track trends over time

---

## 🚀 Quick Start

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

### Run Complete Pipeline

```bash
# Start services
npm run docker:up

# Run everything
npm run pipeline

# View results
# Grafana: http://localhost:3001
# Reports: https://your-pages-url/
```

### Run Individual Phases

```bash
# 1. Clean everything
npm run clean

# 2. E2E with API capture
npm run e2e:capture

# 3. API tests (uses captured APIs)
npm run api

# 4. Performance tests
npm run k6 -- --type=stairs --vus=5 --duration=150s

# 5. Security scan
npm run zap

# 6. Publish reports
npm run publish
```

---

## 🏗️ Architecture

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
│                             ▼                                           │
│                    ┌─────────────────┐                                  │
│                    │  GRAFANA        │                                  │
│                    │ Centro Control  │ Real-time unified dashboard      │
│                    └─────────────────┘                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

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
├── universal_recorder_pro.js    # [PHASE 2] Advanced Test Recorder
│
├── e2e/                         # [PHASE 3] E2E Tests
│   ├── locators/                # Centralized selectors
│   ├── pages/                   # Page Object Model
│   ├── specs/                   # Test specifications
│   ├── test-base/               # Test base & fixtures
│   └── utils/                   # Utilities & Allure decorators
│
├── scripts/                     # Execution scripts
│   ├── run-e2e.mjs              # E2E + Allure + Metrics
│   ├── run-api.mjs              # Newman + Metrics
│   ├── run-k6.mjs               # K6 + Metrics
│   ├── run-zap.mjs              # OWASP ZAP + Metrics
│   └── run-pipeline.mjs         # Full pipeline
│
├── scripts_metricas/            # Metrics senders
│   ├── influx-client.mjs        # Shared InfluxDB client
│   ├── send-e2e-metrics.mjs
│   ├── send-api-metrics.mjs
│   └── send-zap-metrics.mjs
│
├── docker/                      # Docker configuration
│   ├── grafana/dashboards/      # Centro de Control dashboard
│   └── postgres/init.sql        # Test data schema
│
├── reports/                     # Generated reports (gitignored)
├── plantillas-istqb/            # ISTQB documentation templates
├── docker-compose.yml           # Service definitions
├── playwright.config.ts         # Playwright configuration
└── package.json                 # NPM scripts
```

---

## 📊 Grafana Centro de Control

Access the unified dashboard at `http://localhost:3001`

### Panels

| Section | Metrics | Source |
|---------|---------|--------|
| **E2E (Playwright)** | Pass Rate, Passed, Failed, Skipped, Duration | `e2e_tests` |
| **API (Newman)** | Pass Rate, Passed, Failed, Requests, Duration | `api_tests` |
| **Security (ZAP)** | High, Medium, Low, Informational alerts | `zap_security` |
| **Performance (K6)** | Success Rate, Response Time, VUs, Requests, Errors | Native K6 |

### Kiosk Mode (Full Screen)

```
http://localhost:3001/d/sigma-qa-control/sigma-qa-centro-de-control?kiosk=true
```

---

## 🎬 Universal Recorder Pro

Superior to Playwright Codegen:

| Feature | Playwright Codegen | Universal Recorder Pro |
|---------|-------------------|------------------------|
| Selector levels | 5 | **11** |
| Confidence score | No | **Yes (real-time)** |
| Dynamic pattern detection | Basic | **Advanced (UUID, timestamps, hashes)** |
| SVG/Path handling | Manual | **Automatic** |
| Debouncing | Basic | **Intelligent** |
| UI persistence | No | **Auto-respawn** |

### Usage

1. Open browser DevTools (F12)
2. Go to Console tab
3. Paste content of `universal_recorder_pro.js`
4. Interact with the page
5. Click "STOP & EXPORT"
6. Playwright code is copied to clipboard

---

## 🔬 Sigma Analyzer (Static Testing)

Analyze User Stories BEFORE writing code.

### Commands

```bash
cd sigma_analyzer

# Full analysis
python run_analysis.py

# Single HU analysis
python run_analysis.py --hu HU_SGINC_02

# Generate metrics dashboard
python generate_dashboard.py
```

### Outputs

- **Gap Report**: Coverage gaps detected
- **HU IDEAL**: Corrected HU with 100% coverage
- **CSVs**: Export for Jira/Xray/Azure DevOps
- **Dashboard**: Visual metrics

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run clean` | Clean all reports + reset Grafana metrics |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run e2e` | Run E2E tests |
| `npm run e2e:capture` | Run E2E with API capture |
| `npm run api` | Run API tests |
| `npm run k6` | Run performance tests |
| `npm run k6:reset` | Reset K6 metrics in Grafana |
| `npm run zap` | Run security scan |
| `npm run pipeline` | Run full pipeline |
| `npm run publish` | Publish reports to GitLab Pages |
| `npm run allure:open` | Open Allure report |

---

## 📋 Standards & Compliance

- **ISTQB CTFL v4.0** - Foundation Level syllabus
- **ISTQB CTAL** - Advanced Level practices
- **IEEE 829** - Test documentation standard
- **IEEE 830** - Requirements specification
- **ISO/IEC 27001** - Security considerations
- **ISO 9001** - Quality management
- **OWASP Top 10** - Security testing

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Elyer Maldonado**
- Tech Lead QA @ EPIDATA Consulting
- LinkedIn: [Profile]
- GitHub: [@E-Gregorio](https://github.com/E-Gregorio)

---

## 🙏 Acknowledgments

- Playwright team for the amazing E2E framework
- K6/Grafana Labs for performance testing tools
- OWASP for security scanning tools
- ISTQB for testing standards and methodologies

---

<div align="center">

**Built with ❤️ for the QA Community**

*Shift-Left Testing: Catch bugs before they're born*

</div>
