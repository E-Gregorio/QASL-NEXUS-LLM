# MS-07 QASL-SENTINEL-UNIFIED

> **Command Center Unificado de Monitoreo E2E** - Backend APIs + Frontend DOM + Pipeline Metrics + Seguridad OWASP + Seguridad IA/LLM + Testing Mobile con IA + Chatbot INGRID + Informes PDF Profesionales

```
+======================================================================================+
|                    QASL-SENTINEL-UNIFIED - COMMAND CENTER                             |
|                    Monitoreo Unificado de Sistemas                                   |
+======================================================================================+
|  Proyecto: QASL NEXUS LLM                                                            |
|  Plataforma QA con 12 Microservicios + Multi-LLM                                    |
|  Lider Tecnico QA: Elyer Gregorio Maldonado                                          |
+======================================================================================+
```

![Status](https://img.shields.io/badge/status-production-success)
![Version](https://img.shields.io/badge/version-4.0.0-blue)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.48-green)](https://playwright.dev/)
[![Claude AI](https://img.shields.io/badge/Claude-Opus--4.6-purple)](https://www.anthropic.com/)
[![OWASP ZAP](https://img.shields.io/badge/OWASP-ZAP-orange)](https://www.zaproxy.org/)
[![NVIDIA Garak](https://img.shields.io/badge/NVIDIA-Garak-76B900)](https://github.com/NVIDIA/garak)
[![QASL-MOBILE](https://img.shields.io/badge/QASL--MOBILE-Maestro-blueviolet)](https://maestro.mobile.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://www.docker.com/)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboard-orange)](https://grafana.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![PDFKit](https://img.shields.io/badge/PDFKit-PDF%20Reports-red)](https://pdfkit.org/)

---

## Que es MS-07 QASL-SENTINEL-UNIFIED?

Microservicio #07 de QASL NEXUS LLM. Sistema de monitoreo unificado E2E que combina multiples fuentes de datos en un solo Command Center con chatbot inteligente integrado:

| Componente | Funcion |
|------------|---------|
| **Backend Monitor** | Monitoreo 24/7 de APIs con Prometheus |
| **Frontend Monitor** | Deteccion de cambios DOM con Playwright + InfluxDB |
| **Pipeline Metrics** | Metricas de pipeline QA desde PostgreSQL (MS-12) |
| **Mobile Testing** | Testing mobile con IA en dispositivos Android |
| **Dashboard Unificado** | Grafana Command Center con 4 datasources |
| **INGRID Chatbot** | Asistente IA integrado en Grafana con Claude AI |
| **Informes PDF** | Reportes profesionales enviados por email |
| **Seguridad IA/LLM** | Evaluacion de seguridad de modelos LLM con NVIDIA Garak |

---

## Ejecucion Desde Cero

### Prerequisitos

- Node.js 18+
- Docker Desktop corriendo
- MS-12 PostgreSQL corriendo (puerto 5432)
- API Key de Anthropic (Claude AI) para INGRID
- Python 3.x + NVIDIA Garak (opcional, para escaneos de seguridad IA/LLM)

### Paso 1: Levantar Infraestructura Docker

```bash
# Navegar al proyecto
cd microservices/ms-07-sentinel-unified/QASL-SENTINEL-UNIFIED/unified

# Levantar los 5 contenedores
docker-compose up -d

# Verificar que todos estan corriendo
docker-compose ps
```

Contenedores que se levantan:

| Contenedor | Puerto | Servicio |
|------------|--------|----------|
| qasl-grafana-unified | 3003 | Grafana Command Center |
| qasl-prometheus-unified | 9095 | Prometheus |
| qasl-influxdb-unified | 8088 | InfluxDB 2.7 |
| qasl-sentinel-metrics | 9096 | Pushgateway |
| qasl-video-server | 8766 | nginx (video mobile) |

### Paso 2: Instalar Dependencias (solo primera vez)

```bash
# Backend Monitor
cd sentinel-backend && npm install && cd ..

# Frontend Monitor
cd sentinel-frontend && npm install && npx playwright install chromium && cd ..

# INGRID Chatbot
cd qasl-ingrid && npm install && cd ..
```

### Paso 3: Configurar Variables de Entorno (solo primera vez)

```bash
# Verificar/editar los archivos .env en cada componente:
# sentinel-backend/.env   - APIs a monitorear
# sentinel-frontend/.env  - URLs del frontend a monitorear
# qasl-ingrid/.env         - API keys (Claude, SMTP)
```

### Paso 4: Iniciar Monitores (cada terminal por separado)

```bash
# Terminal 1: Backend Monitor (monitoreo 24/7 de APIs)
cd sentinel-backend
node cli/sentinel-cli.mjs start --watch

# Terminal 2: Frontend Monitor (escaneo DOM + OWASP ZAP)
cd sentinel-frontend
npx tsx src/guardian.ts

# Terminal 3: INGRID Chatbot
cd qasl-ingrid
npm start
```

### Paso 5: Importar Metricas Garak (opcional)

```bash
# Importar ultimo reporte de NVIDIA Garak
cd sentinel-backend
node src/importers/garak-importer.mjs --latest
```

### Paso 6: Abrir Command Center

```
http://localhost:3003
Credenciales: admin / sentinel2024
```

### Ejecucion Automatizada (PowerShell)

```powershell
# Ejecuta TODO: Docker + Backend + Frontend + INGRID + Garak + Grafana
.\run-unified.ps1
```

---

## Apagar Todo

```bash
# Matar procesos Node (Backend, Frontend, INGRID)
# Windows PowerShell:
Get-Process node | Stop-Process -Force

# Bajar contenedores Docker
cd microservices/ms-07-sentinel-unified/QASL-SENTINEL-UNIFIED/unified
docker-compose down
```

### Reset Completo (limpiar metricas)

```powershell
# Elimina TODOS los datos: Prometheus, InfluxDB, Grafana, snapshots, reportes
.\clean-metrics.ps1
```

---

## Dashboards Grafana

### 00-command-center.json — QASL SENTINEL Command Center Unificado (39 paneles)

Dashboard principal que muestra datos de **Prometheus** (APIs backend, Garak, compliance, ML) e **InfluxDB** (frontend DOM, seguridad OWASP). Se llena cuando los monitores (Backend + Frontend) estan corriendo y envian metricas.

**9 secciones:**

| Seccion | Fuente | Contenido |
|---------|--------|-----------|
| Salud del Sistema | Prometheus + InfluxDB | Frontend Health, Backend Health, Puntaje General |
| Metricas Globales | Prometheus | APIs monitoreadas, Checks, Exitosos, Fallidos, Latencia, Uptime |
| Frontend DOM | InfluxDB | Estado DOM, Cambios detectados, Confianza IA, Tests en Riesgo |
| Estado de APIs | Prometheus | Tabla HTTP, Disponibilidad por API, Latencia timeseries |
| Seguridad OWASP ZAP | InfluxDB | Vulnerabilidades por severidad, Top Vulnerabilidades |
| Enterprise Security ML | Prometheus | Security Score, Anomalias ML, Compliance (SOC2/ISO/PCI/HIPAA) |
| Tendencias Historicas | Prometheus + InfluxDB | Uptime 7d, Historial escaneos |
| Seguridad IA/LLM (Garak) | Prometheus | DEFCON, Probes, Pass Rate, Modelo evaluado |
| QASL-MOBILE | InfluxDB-Mobile | Pass Rate, Tests, Video MP4, Ejecuciones recientes |

### 01-pipeline-metrics.json — QASL NEXUS Pipeline Metrics (11 paneles)

Dashboard que muestra datos del **pipeline QA** desde **PostgreSQL** (MS-12). Se llena cuando se ejecutan pipelines desde MS-00 Command Center o MS-08 CI/CD.

**Paneles:**

| Panel | Tipo | Query |
|-------|------|-------|
| Pipeline Pass Rate (Ultimos 20) | timeseries | pipeline_run.pass_rate |
| Pipeline Status | piechart | pipeline_run.estado (Success/Failed/Running) |
| Tests Totales Ejecutados | stat | SUM(total_tc_ejecutados) |
| Pass Rate Promedio | gauge | AVG(pass_rate) con thresholds |
| Pipelines Recientes | table | Ultimas 15 ejecuciones con detalles |
| Tests Generados por AI (MS-09) | stat | COUNT(generated_test_case) |
| Tests Passed vs Failed | stat | SUM(total_passed) vs SUM(total_failed) |
| Defectos por Severidad | barchart | defect.severidad |
| Defectos por Estado | piechart | defect.estado |
| Ejecuciones de Tests | table | Ultimas 20 test_execution |
| Executive Summary | table | v_executive_summary view |

---

## Datasources Grafana (4 fuentes)

| Datasource | Tipo | URL | Datos | Default |
|------------|------|-----|-------|---------|
| **PostgreSQL-QASL** | postgres | host.docker.internal:5432 | MS-12: pipeline_run, test_execution, defect, generated_test_case | Si |
| **Prometheus** | prometheus | http://prometheus:9090 | APIs backend (qasl_*) + Garak (garak_*) | No |
| **InfluxDB-Sentinel** | influxdb (Flux) | http://influxdb:8086 | Frontend DOM + OWASP ZAP | No |
| **InfluxDB-Mobile** | influxdb (InfluxQL) | http://host.docker.internal:8089 | QASL-MOBILE test executions | No |

---

## Alimentacion de Dashboards — Como se llenan

### Dashboard 00 (Command Center) se llena con:

1. **Backend Monitor** (`sentinel-backend/`) → Exporta metricas qasl_* a Prometheus via exporter :9097
2. **Frontend Monitor** (`sentinel-frontend/`) → Envia metricas sentinel_* a InfluxDB Flux
3. **Garak Importer** → Parsea JSONL → Pushgateway → Prometheus (metricas garak_*)
4. **QASL-MOBILE** (proyecto satelite) → Publica en InfluxDB-Mobile :8089

### Dashboard 01 (Pipeline Metrics) se llena con:

1. **MS-08 CI/CD Pipeline** → Escribe pipeline_run en MS-12
2. **MS-09 Orquestador LLM** → Escribe generated_test_case en MS-12
3. **MS-03 QASL Framework** → Escribe test_execution en MS-12
4. **MS-10 MCP Interfaz** → Escribe defect en MS-12

### MS-03 Scripts de Metricas (alimentan InfluxDB del dashboard 00)

MS-03 QASL Framework tiene scripts dedicados que envian metricas a InfluxDB despues de cada ejecucion:

| Script | Funcion | Metricas |
|--------|---------|----------|
| `scripts_metricas/send-e2e-metrics.mjs` | Envia resultados E2E | passed, failed, skipped, pass_rate, duration |
| `scripts_metricas/send-api-metrics.mjs` | Envia resultados Newman | passed, failed, total_requests, pass_rate |
| `scripts_metricas/send-k6-metrics.mjs` | K6 envia directo a InfluxDB | http_req_duration, http_reqs, vus |
| `scripts_metricas/send-zap-metrics.mjs` | Envia resultados ZAP | high, medium, low, informational, total |
| `scripts_metricas/influx-client.mjs` | Cliente compartido | sendMetric(), sendE2EMetrics(), sendAPIMetrics(), sendZAPMetrics() |

Los scripts `run-e2e.mjs`, `run-api.mjs`, `run-k6.mjs`, `run-zap.mjs` llaman automaticamente a los scripts de metricas al finalizar cada ejecucion.

---

## URLs de Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Grafana Command Center** | http://localhost:3003 | admin / sentinel2024 |
| **INGRID Chat API** | http://localhost:3100/api/chat | - |
| INGRID Health | http://localhost:3100/api/health | - |
| Prometheus | http://localhost:9095 | - |
| InfluxDB | http://localhost:8088 | admin / sentinel2024 |
| Pushgateway | http://localhost:9096 | - |
| Backend Metrics | http://localhost:9097/metrics | - |
| Video Server (Mobile) | http://localhost:8766 | - |

---

## QASL-INGRID - Chatbot Inteligente

INGRID (Intelligent Grafana Report & Insights Dashboard) es un chatbot con IA integrado directamente en el dashboard de Grafana. Permite consultar el estado del sistema en lenguaje natural y generar informes profesionales por email.

### Preguntas que INGRID puede responder

```
"¿Como estan las APIs?"
"¿Cual es la disponibilidad actual?"
"¿Hay alguna API con latencia alta?"
"¿Cual es el nivel DEFCON actual?"
"¿Como esta el compliance?"
"Enviame el reporte de garak"
"Enviame informe completo por email"
```

### Envio de Informes por Email

```
"Enviame el reporte de garak"     -> PDF solo con seccion Garak
"Enviame informe de las APIs"     -> PDF solo con APIs
"Enviame reporte de ZAP"          -> PDF solo con OWASP ZAP
"Enviame informe de compliance"   -> PDF solo con compliance
"Enviame el reporte completo"     -> PDF con todo el sistema
```

### Configuracion INGRID (.env)

```env
# Claude AI
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Servidor
INGRID_PORT=3100

# Prometheus
PROMETHEUS_URL=http://localhost:9095

# InfluxDB
INFLUXDB_URL=http://localhost:8088
INFLUXDB_TOKEN=qasl-sentinel-token-2024
INFLUXDB_ORG=qasl
INFLUXDB_BUCKET=sentinel_metrics

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
FROM_EMAIL=correo@gmail.com
```

---

## NVIDIA Garak - Seguridad IA/LLM

Pipeline de integracion:

```
NVIDIA Garak -> JSONL -> garak-importer.mjs -> Pushgateway -> Prometheus -> Grafana
```

### Comandos Garak

```bash
# 1. Ejecutar scan Garak
python -m garak --model_type openai --model_name gpt-3.5-turbo --probes encoding.InjectBase64

# 2. Importar metricas al dashboard
cd sentinel-backend
node src/importers/garak-importer.mjs --latest
```

---

## Comandos Disponibles

### Backend Monitor (sentinel-backend/)

| Comando | Descripcion |
|---------|-------------|
| `node cli/sentinel-cli.mjs start --watch` | Monitoreo 24/7 de APIs |
| `node cli/sentinel-cli.mjs check` | Verificacion rapida de APIs |
| `node cli/sentinel-cli.mjs metrics` | Ver metricas actuales |
| `node cli/sentinel-cli.mjs live-dashboard` | Dashboard interactivo en terminal |
| `node cli/sentinel-cli.mjs pdf-report --type daily` | Reporte PDF diario |
| `node cli/sentinel-cli.mjs pdf-report --type executive` | Reporte ejecutivo |
| `node cli/sentinel-cli.mjs email --send-report` | Enviar reporte por email |
| `node cli/sentinel-cli.mjs compliance --all` | Verificar SOC2, ISO 27001, PCI-DSS, HIPAA |
| `node cli/sentinel-cli.mjs anomaly` | Detectar anomalias ML |
| `node cli/sentinel-cli.mjs predict` | Predecir posibles fallos |
| `node cli/sentinel-cli.mjs ai-report` | Informe con IA |
| `node cli/sentinel-cli.mjs ai-ask "pregunta"` | Preguntar a la IA sobre metricas |
| `node cli/sentinel-cli.mjs import -f postman -i archivo.json` | Importar desde Postman |
| `node cli/sentinel-cli.mjs import -f swagger -i archivo.json` | Importar desde Swagger |
| `node src/importers/garak-importer.mjs --latest` | Importar ultimo reporte Garak |

### Frontend Monitor (sentinel-frontend/)

| Comando | Descripcion |
|---------|-------------|
| `npx tsx src/guardian.ts` | Monitoreo completo (DOM + ZAP + Email) |
| `npx tsx src/scripts/capture-snapshot.ts` | Solo captura snapshots |
| `npx tsx src/scripts/show-changes.ts` | Muestra ultimos cambios detectados |

### INGRID (qasl-ingrid/)

| Comando | Descripcion |
|---------|-------------|
| `npm start` | Inicia servidor INGRID en puerto 3100 |
| `npm run dev` | Modo desarrollo con hot-reload |

### Docker

| Comando | Descripcion |
|---------|-------------|
| `docker-compose up -d` | Levantar infraestructura |
| `docker-compose down` | Detener infraestructura |
| `docker-compose ps` | Ver estado de contenedores |
| `docker-compose logs -f grafana` | Logs de Grafana |
| `docker-compose restart grafana` | Reiniciar Grafana |
| `docker-compose build grafana` | Reconstruir imagen Grafana (si cambia Dockerfile) |

---

## Infraestructura Docker

### Servicios Docker

| Servicio | Imagen | Container | Puerto Host | Puerto Interno |
|----------|--------|-----------|-------------|----------------|
| Prometheus | prom/prometheus:latest | qasl-prometheus-unified | 9095 | 9090 |
| InfluxDB | influxdb:2.7 | qasl-influxdb-unified | 8088 | 8086 |
| Grafana | qasl-grafana-ingrid:latest | qasl-grafana-unified | 3003 | 3000 |
| Pushgateway | prom/pushgateway:latest | qasl-sentinel-metrics | 9096 | 9091 |
| Video Server | nginx:alpine | qasl-video-server | 8766 | 80 |

### Servicios Node.js

| Servicio | Directorio | Puerto | Funcion |
|----------|-----------|--------|---------|
| Backend Monitor | sentinel-backend/ | 9097 | Prometheus exporter + monitoreo APIs |
| Frontend Monitor | sentinel-frontend/ | - | Escaneo DOM + OWASP ZAP |
| INGRID Chatbot | qasl-ingrid/ | 3100 | API chat + widget + PDF reports |

### Prometheus Scrape Targets

| Job | Target | Datos |
|-----|--------|-------|
| api-sentinel | host.docker.internal:9091 | QASL-API-SENTINEL (proyecto externo) |
| sentinel-metrics-unified | host.docker.internal:9097 | Backend Monitor (qasl_*) |
| pushgateway | pushgateway:9091 | Garak metrics (garak_*) |
| prometheus | localhost:9090 | Self-monitoring |

### Volumenes Persistentes

| Volumen | Datos |
|---------|-------|
| prometheus-data | Metricas APIs (qasl_*) + Garak (garak_*) |
| influxdb-data | Metricas Frontend (sentinel_*) + E2E/API/ZAP (qa_metrics) |
| influxdb-config | Configuracion InfluxDB |
| grafana-data | Estado de dashboards y configuracion |

---

## Metricas

### Prometheus — Backend APIs (qasl_*)

| Metrica | Tipo | Descripcion |
|---------|------|-------------|
| `qasl_api_up` | Gauge | Estado de la API (1=UP, 0=DOWN) |
| `qasl_api_healthy` | Gauge | API saludable (1=OK, 0=FALLA) |
| `qasl_api_status` | Gauge | Codigo HTTP de respuesta |
| `qasl_api_latency_ms` | Gauge | Latencia en milisegundos |
| `qasl_api_uptime_percentage` | Gauge | Uptime por API individual |
| `qasl_uptime_percentage` | Gauge | Uptime global |
| `qasl_latency_avg_ms` | Gauge | Latencia promedio global |
| `qasl_checks_total` | Counter | Total de verificaciones |
| `qasl_checks_success_total` | Counter | Verificaciones exitosas |
| `qasl_checks_failed_total` | Counter | Verificaciones fallidas |
| `qasl_compliance_score` | Gauge | Score por framework (SOC2, ISO, PCI, HIPAA) |
| `qasl_security_score` | Gauge | Score de seguridad global |
| `qasl_ml_anomalies` | Gauge | Anomalias detectadas por ML |
| `qasl_ml_predicted_failures` | Gauge | Fallos predichos |
| `qasl_zap_vulnerabilities_total` | Gauge | Total vulnerabilidades ZAP |
| `qasl_zap_vulnerabilities` | Gauge | Vulnerabilidades por severidad |

### Prometheus — Garak IA/LLM (garak_*)

| Metrica | Tipo | Descripcion |
|---------|------|-------------|
| `garak_defcon_level` | Gauge | Nivel DEFCON (1=critico, 5=perfecto) |
| `garak_probes_total` | Gauge | Total de probes ejecutados |
| `garak_probes_passed` | Gauge | Probes resistidos |
| `garak_probes_failed` | Gauge | Probes vulnerados |
| `garak_pass_rate` | Gauge | Tasa de exito (%) |
| `garak_model_info` | Gauge | Info del modelo (labels: model, type) |

### InfluxDB — Frontend DOM (sentinel_*)

**Bucket:** `sentinel_metrics` | **Org:** `qasl`

| Measurement | Campos |
|-------------|--------|
| `sentinel_scan` | changes, confidence, execution_time, impacted_tests, status_code |
| `sentinel_security` | high, medium, low, informational, total, regressions, resolved |

### InfluxDB — QA Metrics de MS-03 (qa_metrics)

**Database:** `qa_metrics` | Viene de los scripts_metricas de MS-03

| Measurement | Campos | Fuente |
|-------------|--------|--------|
| `e2e_tests` | passed, failed, skipped, total, pass_rate, duration | send-e2e-metrics.mjs |
| `api_tests` | passed, failed, total_requests, pass_rate, duration | send-api-metrics.mjs |
| `zap_security` | high, medium, low, informational, total_alerts | send-zap-metrics.mjs |

### PostgreSQL — Pipeline QA (MS-12)

| Tabla | Campos principales |
|-------|-------------------|
| `pipeline_run` | pipeline_id, estado, tipo, total_tc_ejecutados, pass_rate, target_url, objective |
| `test_execution` | pipeline_id, resultado, source_ms, duracion_ms, ambiente |
| `generated_test_case` | pipeline_id, test_name, test_type, test_code, status |
| `defect` | severidad, estado, descripcion |
| `v_executive_summary` | View con resumen ejecutivo completo |

---

## Reportes Automaticos

| Tarea | Horario | Descripcion |
|-------|---------|-------------|
| Health Checks Criticos | Cada 30 segundos | APIs criticas |
| Health Checks Normales | Cada 2 minutos | APIs normales |
| Health Checks Bajos | Cada 5 minutos | APIs de baja prioridad |
| Predicciones ML | Cada 1 hora | Anomalias y prediccion de fallos |
| Compliance | Al inicio + cada 6h | SOC2, ISO 27001, PCI-DSS, HIPAA |
| Reporte Diario | 8:00 AM | PDF + email automatico |
| Limpieza de Datos | 3:00 AM | Elimina datos > 30 dias |

INGRID genera reportes PDF on-demand cuando el usuario lo solicita desde el chat.

---

## Arquitectura del Sistema

```
ms-07-sentinel-unified/
+-- QASL-SENTINEL-UNIFIED/
    +-- unified/
        +-- docker-compose.yml              # 5 servicios Docker
        +-- run-unified.ps1                 # Ejecucion automatizada
        +-- clean-metrics.ps1               # Limpieza total de metricas
        +-- monitor-all.sh                  # Alternativa bash (Linux/Mac)
        |
        +-- grafana/
        |   +-- Dockerfile                  # Custom build con widget INGRID
        |   +-- dashboards/
        |   |   +-- 00-command-center.json  # Dashboard unificado (39 paneles)
        |   |   +-- 01-pipeline-metrics.json # Pipeline QA metrics (11 paneles)
        |   +-- provisioning/
        |       +-- datasources/
        |       |   +-- datasources.yml     # 4 datasources: PostgreSQL + Prometheus + InfluxDB x2
        |       +-- dashboards/
        |           +-- dashboards.yml      # Auto-carga de dashboards
        |
        +-- monitoring/
        |   +-- prometheus/
        |       +-- prometheus.yml          # 4 scrape targets
        |
        +-- qasl-ingrid/                    # INGRID - Chatbot IA (:3100)
        |   +-- server.mjs                  # Servidor Express
        |   +-- .env                        # API keys y config SMTP
        |   +-- public/
        |   |   +-- ingrid-widget.js        # Widget v7 (Grafana theme)
        |   |   +-- ingrid-widget.css       # Estilos del widget
        |   +-- src/
        |       +-- query-engine.mjs        # Motor de consultas Prometheus
        |       +-- claude-client.mjs       # Cliente Claude AI
        |       +-- report-service.mjs      # PDF + envio email
        |
        +-- sentinel-backend/               # Monitor de APIs (:9097)
        |   +-- cli/sentinel-cli.mjs        # CLI principal
        |   +-- src/
        |   |   +-- core/                   # sentinel, scheduler, config
        |   |   +-- modules/               # metrics, ml, security, notifications, watcher, reports
        |   |   +-- monitors/              # conectividad, dependencias, contratos, RUM
        |   |   +-- ai/                    # Claude AI brain
        |   |   +-- auth/                  # Bearer, Keycloak, OAuth2
        |   |   +-- importers/            # garak, postman, swagger, har
        |   +-- config/                    # monitoring.json, alerts.json, auth.json
        |
        +-- sentinel-frontend/             # Monitor de Frontend
            +-- src/
            |   +-- guardian.ts            # Orquestador principal
            |   +-- watchers/             # Captura snapshots DOM (Playwright)
            |   +-- analyzer/             # Detecta cambios + Claude AI
            |   +-- security/             # OWASP ZAP
            |   +-- notifier/             # Email + metricas InfluxDB
            +-- snapshots/                # Snapshots DOM historicos
            +-- reports/zap/              # Reportes OWASP ZAP
```

---

## Troubleshooting

### Docker no levanta

```bash
docker ps                          # Verificar Docker Desktop esta corriendo
docker-compose down && docker-compose up -d  # Reiniciar contenedores
```

### Grafana muestra "No data" en Dashboard 00

```bash
# Los monitores deben estar corriendo para enviar metricas
# Verificar Backend Monitor:
curl http://localhost:9097/metrics

# Verificar Prometheus scrapea:
curl http://localhost:9095/api/v1/targets

# Reiniciar Grafana:
docker-compose restart grafana
```

### Grafana muestra "No data" en Dashboard 01

```bash
# Verificar que MS-12 PostgreSQL esta corriendo
# Verificar que hay pipeline_runs ejecutados
# El dashboard se llena cuando se ejecutan pipelines desde MS-00 o MS-08
```

### INGRID no responde

```bash
curl http://localhost:3100/api/health
# Si no responde: cd qasl-ingrid && npm start
```

### Widget INGRID no aparece en Grafana

```bash
# Reconstruir imagen Grafana
docker-compose build grafana
docker-compose up -d grafana
```

### Garak no muestra metricas

```bash
# Verificar Pushgateway
curl http://localhost:9096/metrics | grep garak

# Re-importar
cd sentinel-backend
node src/importers/garak-importer.mjs --latest
```

### Reset completo

```bash
# Detener todo
Get-Process node | Stop-Process -Force
docker-compose down

# Limpiar metricas
.\clean-metrics.ps1

# Volver a ejecutar
.\run-unified.ps1
```

---

## Stack Tecnologico

| Tecnologia | Uso |
|------------|-----|
| Node.js 18+ | Runtime principal |
| TypeScript | Frontend Monitor |
| JavaScript (ESM) | Backend Monitor + INGRID |
| Express.js | Servidor INGRID |
| Playwright | Automatizacion de navegador |
| Claude AI (Anthropic) | Chatbot INGRID + analisis inteligente |
| PDFKit | Generacion de informes PDF |
| Nodemailer | Envio de emails |
| OWASP ZAP | Escaneo de seguridad web |
| NVIDIA Garak | Evaluacion de seguridad LLM |
| Prometheus | Metricas backend APIs |
| InfluxDB 2.7 | Metricas frontend DOM + QA metrics |
| PostgreSQL 16 | Pipeline QA (MS-12) |
| Grafana | Dashboard de visualizacion unificado |
| Docker Compose | Orquestacion de infraestructura |
| Pushgateway | Gateway de metricas Prometheus |
| nginx | Servidor de video MP4 |

---

## Autor

**ELYER GREGORIO MALDONADO**
Lider Tecnico QA | QASL NEXUS LLM

---

**MS-07 QASL-SENTINEL-UNIFIED v4.0.0**
Command Center Unificado de Monitoreo E2E
QASL NEXUS LLM - Plataforma QA con 12 Microservicios + Multi-LLM
