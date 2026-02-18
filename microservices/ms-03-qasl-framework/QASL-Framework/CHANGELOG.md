# Changelog

All notable changes to QASL Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2025-12-18

### Changed
- **Rebranding**: Project officially named **QASL Framework** (Quality Assurance Shift-Left)
- Updated README.md with new branding and author badges
- Updated AUTHOR.md with complete project documentation
- Updated LICENSE with QASL Framework reference
- Added reference to INGRID AI Testing Framework

### Added
- Author badges in README header
- Link to INGRID framework for AI/LLM testing integration
- LinkedIn profile in author section

---

## [1.1.0] - 2025-12-15

### Added

#### Phase 7: Infrastructure Observability (Loki + Promtail)
- **Loki Integration**: Lightweight log aggregation (~350MB RAM vs 16-32GB for ELK/OpenShift)
- **Promtail Agent**: Automatic Docker container log collection via Docker socket
- **Infrastructure Logs Dashboard**: Real-time error/warning detection across all containers
  - ERRORS panel with color-coded thresholds (green/yellow/red)
  - WARNINGS panel for review items
  - TOTAL LOGS counter
  - CONTAINERS count showing active services
  - Timeline chart showing log volume by container
  - Error Logs stream for diagnostics
  - All Logs stream with container filter
- **CLI Health Check**: `npm run infra:check` for quick infrastructure status
  - Supports time range: `--time=1h`
  - Supports container filter: `--container=postgres`
- **Dashboard Command**: `npm run infra:logs` opens Infrastructure Logs dashboard

#### Configuration Files
- `docker/loki/loki-config.yml`: Loki server configuration (TSDB store, schema v13)
- `docker/promtail/promtail-config.yml`: Docker service discovery configuration
- `docker/grafana/dashboards/infrastructure-logs.json`: Professional dashboard
- `scripts/run-infra-check.mjs`: CLI tool for Loki queries

### Changed
- Updated `docker-compose.yml` with Loki and Promtail services
- Updated `datasources.yml` with Loki datasource
- README.md updated with Phase 7 documentation

---

## [1.0.0] - 2025-12-05

### Added

#### Core Framework
- **Unified Shift-Left Testing Pipeline**: Complete workflow from static analysis to security testing
- **Grafana Centro de Control**: Real-time dashboard with all test metrics
- **InfluxDB Integration**: Centralized metrics storage for all test types

#### Phase 1: Static Analysis (sigma_analyzer)
- AI-powered User Story analysis
- Gap detection in test coverage
- HU IDEAL generation with 100% coverage
- CSV export for Jira/Xray/Azure DevOps/TestRail
- ISTQB/IEEE compliance checking
- Interactive dashboard for metrics visualization
- Presentation generators for stakeholders

#### Phase 2: Universal Recorder Pro v5.0
- 11-level intelligent selector strategy
- Real-time confidence score (0-100%)
- Dynamic pattern detection (UUIDs, timestamps, hashes)
- Smart element type detection (checkbox, radio, select, etc.)
- Advanced debouncing to eliminate duplicates
- SVG/Path automatic handling
- Auto-respawn persistent UI
- Shadow DOM and iframe support

#### Phase 3: E2E Testing
- Playwright integration with Allure reports
- **Automatic API Capture**: Record APIs during E2E execution
- Multi-browser support (Chromium, Firefox, WebKit)
- Allure decorators for ISTQB traceability
- Metrics auto-send to InfluxDB/Grafana

#### Phase 4: API Testing
- Newman integration with HTMLExtra reports
- Auto-reads captured APIs from `.api-captures/`
- Dynamic Postman collection generation
- Metrics auto-send to InfluxDB/Grafana

#### Phase 5: Performance Testing
- K6 integration with multiple test types:
  - `load`: Normal load testing
  - `stairs`: Visual escalation in Grafana
  - `stress`: Push to limits
  - `spike`: Sudden load bursts
  - `soak`: Endurance testing
- Native InfluxDB streaming
- HTML report generation

#### Phase 6: Security Testing
- OWASP ZAP integration via Docker
- Baseline security scanning
- Vulnerability severity classification (HIGH, MEDIUM, LOW, INFO)
- Metrics auto-send to InfluxDB/Grafana

#### Infrastructure
- Docker Compose with all services
- PostgreSQL with test data
- Adminer for database management
- n8n for automation workflows
- Redis for caching

#### Documentation
- ISTQB-compliant templates
- Master Test Plan template
- Sprint Test Plan template
- Bug/Defect report templates
- VCR estimation guide

### Fixed
- Windows PowerShell npm argument passing with dedicated scripts
- E2E metrics paths corrected to `reports/e2e/allure-results`
- Metrics now sent even when tests fail
- Clean command now resets Grafana/InfluxDB metrics

### Changed
- `npm run clean` now includes InfluxDB database reset
- Added `npm run e2e:capture` for Windows compatibility

---

## [0.9.0] - 2025-11-29 (Beta)

### Added
- Initial sigma_analyzer implementation
- Basic E2E structure with Playwright
- Initial Grafana dashboard

### Changed
- Migrated from Jest to Playwright Test

---

## [0.1.0] - 2025-11-15 (Alpha)

### Added
- Project scaffolding
- Basic npm scripts
- Docker compose initial setup

---

## Roadmap

### [1.3.0] - Planned
- [ ] **INGRID Integration**: Connect QASL with INGRID via API for AI/LLM testing
- [ ] Visual regression testing integration
- [ ] Accessibility testing (axe-core)
- [ ] Mobile testing support (Playwright devices)
- [ ] Slack/Teams notifications

### [1.4.0] - Planned
- [ ] AI-powered test generation from HU IDEAL
- [ ] Self-healing selectors
- [ ] Test impact analysis

### [2.0.0] - Future
- [ ] Web UI for framework configuration
- [ ] Multi-project support
- [ ] Cloud execution (Playwright Test Cloud)
- [ ] SaaS version

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.0 | 2025-12-18 | Official QASL Framework branding |
| 1.1.0 | 2025-12-15 | Phase 7: Infrastructure Observability (Loki + Promtail) |
| 1.0.0 | 2025-12-05 | First stable release with all 6 phases |
| 0.9.0 | 2025-11-29 | Beta with sigma_analyzer |
| 0.1.0 | 2025-11-15 | Initial alpha |

---

## Author

**Elyer Maldonado** - QA Tech Lead | Test Automation Architect

- GitHub: [github.com/E-Gregorio](https://github.com/E-Gregorio)
- LinkedIn: [linkedin.com/in/elyerm](https://linkedin.com/in/elyerm)

---

*QASL Framework - Quality Assurance Shift-Left*

© 2024-2025 Elyer Maldonado. All rights reserved.
