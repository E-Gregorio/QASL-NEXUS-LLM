# Changelog

All notable changes to QASL NEXUS LLM - MS-03 Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] - 2026-02-18

### Changed - QASL NEXUS LLM Migration
- **Rebranding completo**: SIGMA/EPIDATA eliminado de todo el proyecto
- **Arquitectura 12 Microservicios**: MS-03 ahora forma parte de QASL NEXUS LLM
- **Integracion MS-03 a MS-12**: DBReader lee planes de prueba desde PostgreSQL central
- **E2E Architecture overhaul**: Separacion estricta locators/pages/test-base/specs/utils
- **Docker containers**: Todos renombrados de `epidata-*`/`sigma-*` a `qasl-*`
- **Dashboards Grafana**: Renombrados a QASL NEXUS LLM
- **Scripts**: Bloques de comentarios eliminados, branding actualizado
- **Package.json**: `qasl-nexus-framework` v4.0.0, autor Elyer Gregorio Maldonado
- **CI/CD**: Removido `.gitlab-ci.yml` local (CI/CD centralizado en MS-08)
- **Publish**: GitLab Pages migrado a GitHub Pages

### Added
- `e2e/utils/DBReader.ts` - Conexion MS-03 a MS-12 (PostgreSQL)
- `e2e/locators/LoginLocators.ts` - Selectores separados (golden rule)
- `e2e/pages/LoginPage.ts` - POM sin hardcoding de selectores
- `e2e/specs/login.spec.ts` - 10 TCs basados en HU_LOGIN_01 de MS-12
- `e2e/test-base/TestBase.ts` - Fixtures de Playwright limpios
- `.env` - Configuracion DATABASE_URL, BASE_URL, RECORD_HAR

### Removed
- `.gitlab-ci.yml` - CI/CD va en MS-08
- `e2e/locators/DemoQaLocators.ts` - Selectores de DemoQA obsoletos
- `e2e/vitest-module/` - Duplicado de unit/
- `docs/README-GITHUB.md` - Redundante, lleno de SIGMA
- `docs/README-INTERNO.md` - 100% SIGMA/EPIDATA

---

## [1.1.0] - 2025-12-15

### Added
- Phase 7: Infrastructure Observability (Loki + Promtail)
- Infrastructure Logs Dashboard en Grafana
- CLI Health Check: `npm run infra:check`
- Loki + Promtail Docker services

---

## [1.0.0] - 2025-12-05

### Added
- Unified Shift-Left Testing Pipeline completo
- Grafana Centro de Control con metricas en tiempo real
- InfluxDB Integration para todos los tipos de test
- Phase 3: E2E Testing (Playwright + Allure)
- Phase 4: API Testing (Newman + HTMLExtra)
- Phase 5: Performance Testing (K6 + 5 tipos de prueba)
- Phase 6: Security Testing (OWASP ZAP)
- Universal Recorder Pro v5.0 (11 niveles de selectores)
- Docker Compose con 13 servicios
- 102 Unit Tests (Vitest)

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 4.0.0 | 2026-02-18 | QASL NEXUS LLM migration, MS-12 integration, E2E architecture |
| 1.1.0 | 2025-12-15 | Phase 7: Infrastructure Observability (Loki + Promtail) |
| 1.0.0 | 2025-12-05 | First stable release with all 7 phases |

---

## Author

**Elyer Gregorio Maldonado** - QA Tech Lead | Test Automation Architect

- GitHub: [github.com/E-Gregorio](https://github.com/E-Gregorio)
- LinkedIn: [linkedin.com/in/elyerm](https://linkedin.com/in/elyerm)
