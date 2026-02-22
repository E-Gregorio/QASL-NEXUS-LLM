# QASL-SENTINEL-UNIFIED

> **Command Center Unificado de Monitoreo E2E** - Backend APIs + Frontend DOM + Seguridad OWASP + Seguridad IA/LLM + Testing Mobile con IA + Chatbot INGRID + Informes PDF Profesionales

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
![Version](https://img.shields.io/badge/version-3.0.0-blue)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.48-green)](https://playwright.dev/)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet--4.5-purple)](https://www.anthropic.com/)
[![OWASP ZAP](https://img.shields.io/badge/OWASP-ZAP-orange)](https://www.zaproxy.org/)
[![NVIDIA Garak](https://img.shields.io/badge/NVIDIA-Garak-76B900)](https://github.com/NVIDIA/garak)
[![QASL-MOBILE](https://img.shields.io/badge/QASL--MOBILE-Maestro-blueviolet)](https://maestro.mobile.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://www.docker.com/)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboard-orange)](https://grafana.com/)
[![PDFKit](https://img.shields.io/badge/PDFKit-PDF%20Reports-red)](https://pdfkit.org/)

---

## Que es QASL-SENTINEL-UNIFIED?

Sistema de monitoreo unificado E2E que combina multiples herramientas en un solo Command Center con chatbot inteligente integrado:

| Componente | Origen | Funcion |
|------------|--------|---------|
| **Backend Monitor** | QASL-API-SENTINEL | Monitoreo 24/7 de APIs con Prometheus |
| **Frontend Monitor** | QASL-SENTINEL | Deteccion de cambios DOM con Playwright + InfluxDB |
| **Mobile Testing** | QASL-MOBILE (satelite) | Testing mobile con IA en dispositivos Android |
| **Dashboard Unificado** | Grafana | Command Center con todas las fuentes de datos |
| **INGRID Chatbot** | QASL-INGRID | Asistente IA integrado en Grafana con Claude AI |
| **Informes PDF** | QASL-INGRID | Reportes profesionales enviados por email |
| **Seguridad IA/LLM** | NVIDIA Garak | Evaluacion de seguridad de modelos LLM |

### Capacidades Integradas

- **Monitoreo de APIs** - Estado, latencia, disponibilidad de 7 APIs en tiempo real
- **Deteccion de Cambios DOM** - Captura snapshots del frontend y detecta cambios
- **Testing Mobile con IA** - Ejecucion de tests en dispositivos Android con Maestro + INGRID AI
- **Analisis con IA** - Claude AI predice tests afectados y genera recomendaciones
- **Chatbot INGRID** - Asistente conversacional integrado en Grafana para consultas en lenguaje natural
- **Informes PDF por Email** - Generacion on-demand de reportes profesionales enviados al correo
- **Escaneo de Seguridad** - OWASP ZAP automatico para vulnerabilidades
- **Seguridad IA/LLM** - Evaluacion de modelos LLM con NVIDIA Garak (probes, detectors, DEFCON)
- **Video de Ejecucion Mobile** - Grabacion MP4 de tests en dispositivo Android integrada al dashboard
- **Machine Learning** - Deteccion de anomalias y prediccion de fallos
- **Compliance** - Verificacion SOC2, ISO 27001, PCI-DSS, HIPAA
- **Dashboard Grafana** - Command Center unificado con 9 secciones + canales satelite
- **Alertas por Email** - Reportes tecnicos con screenshot del dashboard

---

## QASL-INGRID - Chatbot Inteligente

INGRID (Intelligent Grafana Report & Insights Dashboard) es un chatbot con IA integrado directamente en el dashboard de Grafana. Permite consultar el estado del sistema en lenguaje natural y generar informes profesionales por email.

### Funcionalidades

| Funcionalidad | Descripcion |
|---------------|-------------|
| **Consultas en lenguaje natural** | Pregunta sobre APIs, uptime, seguridad, compliance en espanol |
| **Datos en tiempo real** | Consulta directamente Prometheus para metricas actualizadas |
| **Informe PDF por email** | Genera un PDF profesional y lo envia al correo que indiques |
| **Reportes contextuales** | Detecta que tipo de reporte necesitas: garak, apis, zap, compliance o full |
| **Widget integrado en Grafana** | Boton flotante en el dashboard, no requiere otra ventana |
| **Powered by Claude AI** | Usa Claude Sonnet 4.5 para respuestas inteligentes y contextuales |

### Preguntas que INGRID puede responder

```
"¿Como estan las APIs?"
"¿Cual es la disponibilidad actual?"
"¿Hay alguna API con latencia alta?"
"¿Cual es el nivel DEFCON actual?"
"¿Como esta el compliance?"
"¿Hay errores en alguna API?"
"¿Cual es el score de seguridad?"
"¿Que APIs estan caidas?"
"¿Como estan los certificados SSL?"
"¿Hay alertas activas?"
"Enviame el reporte de garak"
"Enviame informe completo por email"
```

### Envio de Informes por Email

INGRID permite generar y enviar informes PDF profesionales por correo electronico. Los reportes son contextuales segun lo que el usuario solicite:

```
"Enviame el reporte de garak"     -> PDF solo con seccion Garak
"Enviame informe de las APIs"     -> PDF solo con APIs
"Enviame reporte de ZAP"          -> PDF solo con OWASP ZAP
"Enviame informe de compliance"   -> PDF solo con compliance
"Enviame el reporte completo"     -> PDF con todo el sistema
```

Ejemplos de flujo conversacional:

```
Usuario: "Enviame un informe por correo"
INGRID:  "¿A que direccion de correo electronico queres que envie el informe?"
Usuario: "juan@empresa.com"
INGRID:  "Listo, te envie el informe profesional a juan@empresa.com"
```

Tambien soporta envio directo:
```
Usuario: "Enviame el informe a juan@empresa.com"
INGRID:  "Listo, te envie el informe profesional a juan@empresa.com"
```

### Informe PDF Profesional

El PDF generado por INGRID incluye:

| Seccion | Contenido |
|---------|-----------|
| **Header** | Titulo QASL-SENTINEL-UNIFIED con fecha y hora de generacion |
| **Resumen Ejecutivo** | 4 cards: Disponibilidad, APIs Monitoreadas, Latencia Promedio, Security Score |
| **Metricas de Rendimiento** | Tabla con disponibilidad, latencia, checks, SSL, CORS |
| **Estado de APIs** | Tabla detallada por API: estado, latencia, uptime |
| **Seguridad OWASP ZAP** | Vulnerabilidades por severidad + top vulnerabilidades detectadas |
| **Seguridad IA/LLM (Garak)** | Estado DEFCON, probes ejecutados, resistidos, vulnerados, pass rate, modelo |
| **Compliance** | Scores de SOC2, ISO 27001, PCI-DSS, HIPAA |
| **Recomendaciones** | Acciones priorizadas basadas en las metricas actuales |
| **Firma** | QASL NEXUS LLM - Plataforma QA Multi-LLM |

El diseno del PDF sigue el estilo profesional de QASL-API-SENTINEL: tema azul Google (#1a73e8), header oscuro, tablas con filas alternadas, cards con barras de color, circulos numerados para recomendaciones.

### Arquitectura de INGRID

```
Grafana Dashboard (:3003)
  |
  +-- Widget JS/CSS (inyectado en Grafana via Dockerfile)
  |     |
  |     +-- Boton flotante -> Abre modal de chat
  |     +-- Quick Actions: Estado APIs, Uptime, Seguridad, Compliance, Resumen
  |     +-- Textarea con envio por Enter
  |
  +-- POST /api/chat (:3100)
        |
        +-- Deteccion de intento de email
        |     +-- detectReportType() -> 'garak' | 'apis' | 'zap' | 'compliance' | 'full'
        |     +-- "enviame reporte de garak" -> Pide email -> Envia PDF Garak
        |     +-- "enviame informe completo a x@y.com" -> Envia PDF completo directo
        |
        +-- Procesamiento normal
              +-- Query Engine -> Prometheus (:9095) -> 18+ metricas core
              +-- Claude Client -> Anthropic API -> Respuesta contextual
```

---

## NVIDIA Garak - Seguridad IA/LLM

NVIDIA Garak es un framework de evaluacion de seguridad para modelos de lenguaje (LLM). Permite ejecutar probes de seguridad contra modelos como GPT, Claude, LLaMA, entre otros, para detectar vulnerabilidades como prompt injection, encoding attacks, data leakage y mas.

### Integracion con QASL-SENTINEL-UNIFIED

Garak se integra al Command Center a traves del siguiente pipeline:

```
NVIDIA Garak -> JSONL -> garak-importer.mjs -> Pushgateway -> Prometheus -> Grafana
```

1. **Garak** ejecuta probes de seguridad contra el modelo LLM objetivo y genera un reporte en formato JSONL
2. **garak-importer.mjs** parsea el JSONL, calcula metricas (pass rate, DEFCON, vulnerabilidades) y las envia a Pushgateway
3. **Pushgateway** expone las metricas para que Prometheus las scrapee
4. **Prometheus** almacena las metricas con el prefijo `garak_*`
5. **Grafana** visualiza las metricas en la seccion "Seguridad IA/LLM" del dashboard

### Comandos Garak

```powershell
# 1. Ejecutar scan Garak
python -m garak --model_type openai --model_name gpt-3.5-turbo --probes encoding.InjectBase64

# 2. Importar metricas al dashboard
node sentinel-backend/src/importers/garak-importer.mjs "C:\Users\Epidater\.local\share\garak\garak_runs\garak.XXXXX.report.jsonl"

# O importar automaticamente el ultimo reporte
node sentinel-backend/src/importers/garak-importer.mjs --latest
```

El script `run-unified.ps1` auto-importa el ultimo reporte Garak disponible al iniciar el sistema, por lo que las metricas de seguridad IA/LLM se cargan automaticamente si existe un reporte previo.

---

## QASL-MOBILE - Testing Mobile con IA (Canal Satelite)

QASL-MOBILE es un proyecto satelite que ejecuta tests automatizados en dispositivos Android utilizando Maestro como framework de testing e INGRID (Claude Vision) para analisis inteligente de screenshots.

### Arquitectura Satelite

```
QASL-MOBILE (proyecto independiente)
  |
  +-- Ejecuta tests en dispositivo Android (Maestro)
  +-- Graba video MP4 de la ejecucion
  +-- Streaming en vivo del dispositivo (:8765)
  +-- Publica metricas a InfluxDB (:8089)
  +-- Dashboard propio en Grafana (:3004)
  |
  +-- QASL-SENTINEL-UNIFIED (solo lee datos)
        +-- InfluxDB-Mobile datasource -> lee metricas de test_execution
        +-- Video Server (nginx :8766) -> sirve MP4 como solo lectura
        +-- Dashboard muestra: Pass Rate, Tests, Video, Ejecuciones
```

### Lo que muestra el Command Center

| Panel | Fuente | Descripcion |
|-------|--------|-------------|
| Pass Rate | InfluxDB-Mobile | Porcentaje de tests exitosos (gauge) |
| Total Tests | InfluxDB-Mobile | Cantidad total de ejecuciones |
| Passed / Failed | InfluxDB-Mobile | Tests exitosos y fallidos |
| Avg Duration | InfluxDB-Mobile | Duracion promedio (segundos) |
| Screenshots | InfluxDB-Mobile | Capturas tomadas durante tests |
| Video MP4 | Video Server (:8766) | Grabacion de ultima ejecucion |
| Info Card | HTML estatico | Motor, plataforma, botones, comandos INGRID |
| Ejecuciones Recientes | InfluxDB-Mobile | Tabla con historial de ejecuciones |

> **Importante:** El Command Center NO ejecuta tests ni modifica codigo de QASL-MOBILE. Solo lee datos publicados por el proyecto satelite.

---

## Ejecucion Rapida

### Prerequisitos

- Node.js 18+
- Docker Desktop
- Conexion VPN (si se requiere acceso a APIs remotas)
- API Key de Anthropic (Claude AI) para INGRID
- Python 3.x + NVIDIA Garak (opcional, para escaneos de seguridad IA/LLM)

### Comando Unico (Recomendado)

```powershell
# Desde PowerShell, navegar al proyecto
cd C:\Users\Epidater\Desktop\Proyectos\QASL-SENTINEL-UNIFIED\unified

# Ejecutar TODO automaticamente
.\run-unified.ps1
```

Este comando:
1. Verifica directorio del proyecto
2. Verifica Docker Desktop
3. Levanta Prometheus + InfluxDB + Grafana + Pushgateway + Video Server
4. Instala dependencias (si es necesario)
5. Inicia Backend Monitor (API Sentinel) + verifica canales satelite
6. Inicia Frontend Monitor (DOM Sentinel)
7. Inicia INGRID Chatbot
8. Importa metricas Garak (si hay reporte disponible)
9. Abre el Command Center en el navegador

---

## Comandos de Ejecucion (En Orden)

### Instalacion Inicial (Solo primera vez)

```powershell
# 1. Navegar al proyecto
cd C:\Users\Epidater\Desktop\Proyectos\QASL-SENTINEL-UNIFIED\unified

# 2. Instalar dependencias del Backend
cd sentinel-backend
npm install
cd ..

# 3. Instalar dependencias del Frontend
cd sentinel-frontend
npm install
npx playwright install chromium
cd ..

# 4. Instalar dependencias de INGRID
cd qasl-ingrid
npm install
cd ..

# 5. Verificar archivos .env (ya configurados)
# sentinel-backend/.env  - Configuracion del Backend
# sentinel-frontend/.env - Configuracion del Frontend
# qasl-ingrid/.env       - Configuracion de INGRID (Claude API, SMTP)
```

### Configuracion de DNS (Solo primera vez - Requiere Administrador)

```powershell
# Abrir PowerShell como Administrador y ejecutar:
Add-Content -Path 'C:\Windows\System32\drivers\etc\hosts' -Value '127.0.0.1 localhost'
```

### Ejecucion Manual (Paso a Paso)

Si se prefiere ejecutar cada componente por separado:

```powershell
# 1. Conectar VPN (si aplica)

# 2. Navegar al proyecto
cd C:\Users\Epidater\Desktop\Proyectos\QASL-SENTINEL-UNIFIED\unified

# 3. Levantar infraestructura Docker
docker-compose up -d

# 4. Esperar a que los servicios inicien
Start-Sleep -Seconds 20

# 5. Iniciar Backend Monitor (dejar corriendo - nueva terminal)
cd sentinel-backend
node cli/sentinel-cli.mjs start --watch

# 6. Iniciar Frontend Monitor (nueva terminal)
cd sentinel-frontend
npx tsx src/guardian.ts

# 7. Iniciar INGRID Chatbot (nueva terminal)
cd qasl-ingrid
npm start

# 8. Importar metricas Garak (si hay reporte disponible)
cd sentinel-backend
node src/importers/garak-importer.mjs --latest

# 9. Abrir Command Center
Start-Process "http://localhost:3003/d/qasl-command-center-unified"
```

### Limpieza de Metricas (Reset Completo)

```powershell
# Elimina TODOS los datos: Prometheus, InfluxDB, Grafana, snapshots, reportes
.\clean-metrics.ps1
```

### Apagar Todo

```powershell
# Primero: mata todos los procesos Node (Backend, Frontend, INGRID)
Get-Process node | Stop-Process -Force

# Segundo: baja los contenedores Docker
cd C:\Users\Epidater\Desktop\Proyectos\QASL-SENTINEL-UNIFIED\unified
docker-compose down
```

En una sola linea:

```powershell
Get-Process node | Stop-Process -Force; cd C:\Users\Epidater\Desktop\Proyectos\QASL-SENTINEL-UNIFIED\unified; docker-compose down
```

---

## URLs de Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Command Center (Grafana)** | http://localhost:3003 | admin / sentinel2024 |
| Dashboard Directo | http://localhost:3003/d/qasl-command-center-unified | admin / sentinel2024 |
| **INGRID Chat API** | http://localhost:3100/api/chat | - |
| INGRID Health | http://localhost:3100/api/health | - |
| INGRID Widget JS | http://localhost:3100/widget/ingrid-widget.js | - |
| INGRID Sugerencias | http://localhost:3100/api/suggestions | - |
| Prometheus | http://localhost:9095 | - |
| InfluxDB | http://localhost:8088 | admin / sentinel2024 |
| Pushgateway | http://localhost:9096 | - |
| Backend Metrics | http://localhost:9097/metrics | - |
| Video Server (Mobile) | http://localhost:8766 | - |

### URLs de Canales Satelite (cuando estan activos)

| Servicio | URL | Proyecto |
|----------|-----|----------|
| QASL-MOBILE Grafana | http://localhost:3004 | QASL-MOBILE |
| QASL-MOBILE Streaming | http://localhost:8765/viewer | QASL-MOBILE |
| QASL-MOBILE InfluxDB | http://localhost:8089 | QASL-MOBILE |
| QASL-API-SENTINEL Grafana | http://localhost:3001 | QASL-API-SENTINEL |
| QASL-API-SENTINEL Metrics | http://localhost:9091/metrics | QASL-API-SENTINEL |

---

## Comandos Disponibles

### Scripts PowerShell

| Comando | Descripcion |
|---------|-------------|
| `.\run-unified.ps1` | Ejecuta TODO: Docker + Backend + Frontend + INGRID + Garak + Grafana |
| `.\clean-metrics.ps1` | Limpia todas las metricas y datos historicos |

### Backend Monitor (sentinel-backend/)

| Comando | Descripcion |
|---------|-------------|
| `node cli/sentinel-cli.mjs start --watch` | Inicia monitoreo 24/7 de APIs |
| `node cli/sentinel-cli.mjs check` | Verificacion rapida de APIs |
| `node cli/sentinel-cli.mjs metrics` | Ver metricas actuales |
| `node cli/sentinel-cli.mjs live-dashboard` | Dashboard interactivo en terminal |
| `node cli/sentinel-cli.mjs pdf-report --type daily` | Generar reporte PDF diario |
| `node cli/sentinel-cli.mjs pdf-report --type executive` | Reporte ejecutivo |
| `node cli/sentinel-cli.mjs email --send-report` | Enviar reporte por email |
| `node cli/sentinel-cli.mjs email --test` | Email de prueba |
| `node cli/sentinel-cli.mjs compliance --all` | Verificar todos los estandares |
| `node cli/sentinel-cli.mjs anomaly` | Detectar anomalias ML |
| `node cli/sentinel-cli.mjs predict` | Predecir posibles fallos |
| `node cli/sentinel-cli.mjs ai-report` | Informe con IA |
| `node cli/sentinel-cli.mjs ai-ask "pregunta"` | Preguntar a la IA sobre metricas |
| `node cli/sentinel-cli.mjs import -f postman -i archivo.json` | Importar APIs desde Postman |
| `node cli/sentinel-cli.mjs import -f swagger -i archivo.json` | Importar APIs desde Swagger |
| `node src/importers/garak-importer.mjs <file.jsonl>` | Importar reporte Garak a Pushgateway |
| `node src/importers/garak-importer.mjs --latest` | Importar ultimo reporte Garak |

### Frontend Monitor (sentinel-frontend/)

| Comando | Descripcion |
|---------|-------------|
| `npx tsx src/guardian.ts` | Ejecuta monitoreo completo (DOM + ZAP + Email) |
| `npx tsx src/scripts/capture-snapshot.ts` | Solo captura snapshots |
| `npx tsx src/scripts/check-vpn.ts` | Verifica conexion VPN |
| `npx tsx src/scripts/show-changes.ts` | Muestra ultimos cambios detectados |

### INGRID Chatbot (qasl-ingrid/)

| Comando | Descripcion |
|---------|-------------|
| `npm start` | Inicia servidor INGRID en puerto 3100 |
| `npm run dev` | Modo desarrollo con hot-reload |

### INGRID API Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/api/chat` | Enviar mensaje al chatbot. Body: `{"message": "..."}` |
| GET | `/api/health` | Health check del servicio |
| GET | `/api/suggestions` | Lista de preguntas sugeridas |
| GET | `/widget/ingrid-widget.js` | Widget JavaScript para Grafana |
| GET | `/widget/ingrid-widget.css` | Estilos CSS del widget |

### Docker

| Comando | Descripcion |
|---------|-------------|
| `docker-compose up -d` | Levantar infraestructura |
| `docker-compose down` | Detener infraestructura |
| `docker-compose ps` | Ver estado de contenedores |
| `docker-compose logs -f` | Ver logs en tiempo real |
| `docker-compose restart grafana` | Reiniciar Grafana |

---

## Dashboard Command Center

Acceder a `http://localhost:3003/d/qasl-command-center-unified` (admin/sentinel2024)

### Seccion 1: Salud del Sistema
- **Frontend Health**: Porcentaje de salud del frontend (InfluxDB)
- **Backend Health**: Porcentaje de APIs saludables (Prometheus)
- **Puntaje General**: Promedio combinado Frontend + Backend

### Seccion 2: Metricas Globales
- APIs monitoreadas, Checks totales, Exitosos, Fallidos, Latencia promedio, Uptime

### Seccion 3: Monitoreo Frontend - Cambios DOM
- **Estado**: Semaforo visual (ESTABLE / CAMBIOS / CRITICO)
- **Cambios detectados**: Numero de cambios DOM en ultima ejecucion
- **Confianza IA**: Porcentaje de confianza del analisis de Claude AI
- **Tests en Riesgo**: Cantidad de tests que podrian verse afectados
- **Cambios por Dia**: Grafico de barras con tendencia 7 dias
- **Confianza IA**: Timeseries con evolucion de confianza

### Seccion 4: Estado de Cada API
- **Tabla HTTP**: Estado HTTP de cada API con colores (200=verde, 500=rojo)
- **Disponibilidad**: Bargauge LCD por API individual
- **Latencia**: Timeseries de latencia por API (ms)

### Seccion 5: Seguridad OWASP ZAP
- **Estado**: Semaforo de seguridad (ESTABLE / DEGRADADO / CRITICO)
- **Vulnerabilidades**: Criticas, Altas, Medias, Bajas, Total
- **Tendencia 7d**: Timeseries de vulnerabilidades por severidad
- **Top Vulnerabilidades**: Tabla con nombre, riesgo e instancias

### Seccion 6: Enterprise Security ML & Compliance
- Security Score, Anomalias ML, Fallos Predichos, Confianza ML
- Compliance por framework: SOC2, ISO 27001, PCI-DSS, HIPAA

### Seccion 7: Tendencias Historicas
- Tendencia de Uptime (7 dias)
- Historial de Escaneos Frontend (cambios + confianza)

### Seccion 8: Seguridad IA/LLM (NVIDIA Garak)
- **Estado**: Semaforo de seguridad IA (basado en DEFCON level)
- **DEFCON**: Nivel DEFCON de seguridad IA (1=critico, 5=perfecto)
- **Probes Total**: Cantidad total de probes ejecutados
- **Resistidos**: Probes que el modelo resistio exitosamente
- **Vulnerados**: Probes que lograron vulnerar al modelo
- **Pass Rate**: Tasa de exito del modelo (%)
- **Modelo**: Nombre y tipo del modelo evaluado
- **Tendencia**: Timeseries de pass rate y vulnerabilidades a lo largo del tiempo

### Seccion 9: QASL-MOBILE - Testing Mobile con IA
- **Pass Rate**: Porcentaje de tests exitosos (gauge)
- **Total Tests**: Cantidad total de ejecuciones
- **Passed / Failed**: Tests exitosos y fallidos
- **Avg Duration**: Duracion promedio de ejecucion
- **Screenshots**: Total de capturas tomadas durante tests
- **Video MP4**: Grabacion de la ultima ejecucion de tests en el dispositivo Android
- **Info Card**: Motor (Maestro), plataforma (Android), botones a Grafana Mobile (:3004) y Streaming (:8765)
- **Ejecuciones Recientes**: Tabla con historial de ejecuciones (tiempo, estado, duracion, passed, failed)

> Datos provenientes del canal satelite QASL-MOBILE via InfluxDB-Mobile (:8089)

### Widget INGRID (Chatbot)
- **Boton flotante verde** en esquina inferior derecha del dashboard
- Abre modal de chat con diseno Grafana theme (#73BF69 / #1f1f1f)
- Quick actions: Estado APIs, Uptime, Seguridad, Compliance, Resumen
- Soporte para envio de informes PDF por email desde el chat

---

## APIs Monitoreadas (7 APIs)

### APIs Backend (QA)

| # | API | Metodo | Endpoint | Prioridad |
|---|-----|--------|----------|-----------|
| 0 | Frontend App | GET | http://localhost:4200 | Critica |
| 1 | selections/query | POST | /selections/query | Normal |
| 2 | expedient/query | POST | /expedient/query | Normal |
| 3 | inconsistencies/query | POST | /incons/query | Normal |
| 4 | inspection/query | POST | /inspection/query | Normal |

### SADE (Homologacion)

| # | API | Metodo | Endpoint | Prioridad |
|---|-----|--------|----------|-----------|
| 5 | SADE Token | POST | /api/gde-token-process-api/token | Normal |
| 6 | SADE Caratulacion EE | POST | /Expediente/caratulacion | Normal |

### Modulos Frontend Monitoreados (SIPQ)

| # | Modulo | Ruta |
|---|--------|------|
| 1 | Dashboard Principal | `/` |
| 2 | Alta de Inconsistencias | `/alta-inconsistencias` |
| 3 | Seleccion de Candidatos | `/seleccion-candidatos` |
| 4 | Fiscalizacion | `/fiscalizacion` |

---

## Arquitectura del Sistema

```
QASL-SENTINEL-UNIFIED/
+-- unified/
    +-- docker-compose.yml              # Orquestacion de 5 servicios Docker
    +-- run-unified.ps1                 # Script automatico: Docker + Monitores + INGRID + Garak + Grafana
    +-- clean-metrics.ps1               # Limpieza total de metricas
    +-- monitor-all.sh                  # Alternativa bash (Linux/Mac)
    |
    +-- grafana/
    |   +-- Dockerfile                  # Custom build con widget INGRID inyectado
    |   +-- dashboards/
    |   |   +-- 00-command-center.json  # Dashboard unificado (39 paneles)
    |   +-- provisioning/
    |       +-- datasources/
    |       |   +-- datasources.yml     # Prometheus + InfluxDB-Sentinel + InfluxDB-Mobile
    |       +-- dashboards/
    |           +-- dashboards.yml      # Auto-carga de dashboards
    |
    +-- monitoring/
    |   +-- prometheus/
    |       +-- prometheus.yml          # Configuracion de scraping
    |
    +-- qasl-ingrid/                    # INGRID - Chatbot IA
    |   +-- server.mjs                  # Servidor Express (:3100)
    |   +-- .env                        # API keys y config SMTP
    |   +-- public/
    |   |   +-- ingrid-widget.js        # Widget v7 (Grafana theme)
    |   |   +-- ingrid-widget.css       # Estilos v7 (Grafana theme)
    |   +-- src/
    |       +-- query-engine.mjs        # Motor de consultas Prometheus (18+ metricas)
    |       +-- claude-client.mjs       # Cliente Claude AI con system prompt
    |       +-- report-service.mjs      # Generacion PDF + envio email
    |
    +-- sentinel-backend/               # Monitor de APIs (de QASL-API-SENTINEL)
    |   +-- cli/
    |   |   +-- sentinel-cli.mjs        # CLI principal
    |   +-- src/
    |   |   +-- core/                   # Nucleo: sentinel, scheduler, config
    |   |   +-- modules/
    |   |   |   +-- metrics/            # Prometheus exporter (:9097)
    |   |   |   +-- ml/                 # Machine Learning
    |   |   |   +-- security/           # Security Scanner
    |   |   |   +-- notifications/      # Email, webhooks
    |   |   |   +-- watcher/            # Vigilancia 24/7
    |   |   |   +-- reports/            # Reportes programados
    |   |   +-- monitors/               # Conectividad, dependencias, contratos, RUM
    |   |   +-- ai/                     # Claude AI brain
    |   |   +-- auth/                   # Estrategias de auth (Bearer, Keycloak, OAuth2)
    |   |   +-- reporters/              # PDF, compliance
    |   |   +-- importers/
    |   |       +-- garak-importer.mjs  # NVIDIA Garak JSONL -> Pushgateway
    |   |       +-- postman-importer.mjs
    |   |       +-- swagger-importer.mjs
    |   |       +-- har-importer.mjs
    |   +-- config/                     # monitoring.json, alerts.json, auth.json
    |   +-- data/                       # APIs, historial, baselines
    |   +-- .env                        # Configuracion Backend
    |
    +-- sentinel-frontend/              # Monitor de Frontend (de QASL-SENTINEL)
        +-- src/
        |   +-- guardian.ts             # Orquestador principal
        |   +-- watchers/
        |   |   +-- dom-watcher.ts      # Captura snapshots DOM (Playwright)
        |   +-- analyzer/
        |   |   +-- change-detector.ts  # Detecta cambios DOM
        |   |   +-- ai-analyzer.ts      # Analisis con Claude AI
        |   +-- security/
        |   |   +-- zap-scanner.ts      # OWASP ZAP
        |   |   +-- security-baseline.ts
        |   +-- notifier/
        |       +-- email.ts            # Reportes por email
        |       +-- metrics.ts          # Metricas a InfluxDB
        |       +-- grafana-screenshot.ts
        +-- snapshots/                  # Snapshots DOM historicos
        +-- reports/zap/                # Reportes OWASP ZAP
        +-- security-baselines/         # Baselines de seguridad
        +-- .env                        # Configuracion Frontend
```

---

## Flujo de Ejecucion

```
+---------------------------------------------------------------------+
|              QASL-SENTINEL-UNIFIED - Flujo de Ejecucion              |
+---------------------------------------------------------------------+
|                                                                      |
|  .\run-unified.ps1                                                   |
|    |                                                                 |
|    +-- [1] Verificar Docker Desktop                                  |
|    +-- [2] docker-compose up -d                                      |
|    |       +-- Prometheus    (:9095) -> Scraping metricas            |
|    |       +-- InfluxDB      (:8088) -> Almacen metricas frontend    |
|    |       +-- Grafana       (:3003) -> Command Center + INGRID      |
|    |       +-- Pushgateway   (:9096) -> Gateway de metricas          |
|    |       +-- Video Server  (:8766) -> MP4 de QASL-MOBILE (nginx)   |
|    |                                                                 |
|    +-- [3] npm install (si necesario)                                |
|    |                                                                 |
|    +-- [4] Verificar canales satelite (solo lectura)                 |
|    |       +-- QASL-API-SENTINEL  (:9091) -> Opcional                |
|    |       +-- QASL-MOBILE        (:8089) -> Opcional                |
|    |                                                                 |
|    +-- [5] Backend Monitor (sentinel-backend/)                       |
|    |       +-- Monitoreo 24/7 de 7 APIs                              |
|    |       +-- Health checks: critico 30s, normal 2min, bajo 5min    |
|    |       +-- Prometheus Exporter (:9097)                           |
|    |       +-- ML: anomalias + predicciones cada 1h                  |
|    |       +-- Compliance: al inicio + cada 6h                       |
|    |       +-- Reporte diario automatico: 8:00 AM                    |
|    |                                                                 |
|    +-- [6] Frontend Monitor (sentinel-frontend/)                     |
|    |       +-- Playwright navega a modulos del sistema               |
|    |       +-- Captura snapshots DOM                                 |
|    |       +-- Detecta cambios vs snapshot anterior                  |
|    |       +-- Claude AI analiza tests afectados                     |
|    |       +-- OWASP ZAP escanea vulnerabilidades                    |
|    |       +-- Envia metricas a InfluxDB                             |
|    |       +-- Email con reporte + screenshot Grafana                |
|    |                                                                 |
|    +-- [7] INGRID Chatbot (qasl-ingrid/)                             |
|    |       +-- Servidor Express (:3100)                              |
|    |       +-- Widget inyectado en Grafana (boton flotante)          |
|    |       +-- Query Engine -> Prometheus (18+ metricas core)        |
|    |       +-- Claude AI genera respuestas contextuales              |
|    |       +-- PDF profesional + envio por email on-demand           |
|    |       +-- Reportes contextuales: garak, apis, zap, compliance   |
|    |                                                                 |
|    +-- [8] Garak Import (sentinel-backend/)                          |
|    |       +-- garak-importer.mjs --latest                           |
|    |       +-- Importa ultimo reporte JSONL a Pushgateway            |
|    |       +-- Pipeline: NVIDIA Garak -> JSONL -> garak-importer     |
|    |       |             -> Pushgateway -> Prometheus -> Grafana      |
|    |                                                                 |
|    +-- [9] Abrir Command Center en navegador                         |
|            http://localhost:3003/d/qasl-command-center-unified        |
|                                                                      |
+---------------------------------------------------------------------+
|                                                                      |
|  GRAFANA COMMAND CENTER                                              |
|    +-- Datasource: Prometheus      -> Metricas APIs (qasl_*)        |
|    +-- Datasource: Prometheus      -> Metricas Garak (garak_*)      |
|    +-- Datasource: InfluxDB        -> Metricas Frontend (sentinel_*)|
|    +-- Datasource: InfluxDB-Mobile -> Metricas Mobile (test_exec)   |
|    +-- 9 secciones + widget INGRID                                   |
|    +-- Video MP4 integrado (nginx :8766)                             |
|    +-- Widget INGRID: Chatbot IA integrado (boton flotante verde)   |
|    +-- Actualizacion automatica cada 30 segundos                     |
|                                                                      |
+---------------------------------------------------------------------+
```

---

## Infraestructura Docker

### Servicios

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

### Canales Satelite (Proyectos Externos - Solo Lectura)

El Command Center funciona como un **televisor**: solo lee datos de los proyectos satelite que publican metricas en sus bases de datos. No ejecuta ni modifica codigo de proyectos externos.

| Proyecto Satelite | Base de Datos | Puerto | Datasource Grafana |
|-------------------|---------------|--------|--------------------|
| QASL-API-SENTINEL | Prometheus (exporter) | 9091 | Prometheus (via scraping) |
| QASL-MOBILE | InfluxDB v1 | 8089 | InfluxDB-Mobile |

### Volumenes Persistentes

| Volumen | Datos |
|---------|-------|
| prometheus-data | Metricas de APIs (qasl_*) + Metricas Garak (garak_*) |
| influxdb-data | Metricas Frontend (sentinel_scan, sentinel_security) |
| influxdb-config | Configuracion InfluxDB |
| grafana-data | Estado de dashboards y configuracion |

### Datasources Grafana

| Datasource | Tipo | URL | Datos |
|------------|------|-----|-------|
| Prometheus | prometheus | http://prometheus:9090 | APIs backend (qasl_*) + Garak (garak_*) |
| InfluxDB-Sentinel | influxdb (Flux) | http://influxdb:8086 | Frontend DOM + OWASP ZAP |
| InfluxDB-Mobile | influxdb (InfluxQL) | http://host.docker.internal:8089 | QASL-MOBILE test executions |

### Red

- **qasl-unified** (bridge) - Red interna entre contenedores

---

## Metricas

### Prometheus (Backend APIs)

| Metrica | Tipo | Descripcion |
|---------|------|-------------|
| `qasl_api_up` | Gauge | Estado de la API (1=UP, 0=DOWN) |
| `qasl_api_healthy` | Gauge | API saludable (1=OK, 0=FALLA) |
| `qasl_api_status` | Gauge | Codigo HTTP de respuesta |
| `qasl_api_latency_ms` | Gauge | Latencia en milisegundos |
| `qasl_api_uptime_percentage` | Gauge | Uptime por API individual |
| `qasl_apis_total` | Gauge | Total de APIs monitoreadas |
| `qasl_uptime_percentage` | Gauge | Porcentaje de uptime global |
| `qasl_latency_avg_ms` | Gauge | Latencia promedio global |
| `qasl_checks_total` | Counter | Total de verificaciones |
| `qasl_checks_success_total` | Counter | Verificaciones exitosas |
| `qasl_checks_failed_total` | Counter | Verificaciones fallidas |
| `qasl_compliance_score` | Gauge | Score por framework (SOC2, ISO, PCI, HIPAA) |
| `qasl_security_score` | Gauge | Score de seguridad global |
| `qasl_defcon_level` | Gauge | Nivel DEFCON del sistema |
| `qasl_connectivity_ssl_days` | Gauge | Dias restantes certificado SSL |
| `qasl_connectivity_issues_total` | Gauge | Problemas de conectividad (CORS, etc) |
| `qasl_zap_vulnerabilities_total` | Gauge | Total vulnerabilidades ZAP |
| `qasl_zap_vulnerabilities` | Gauge | Vulnerabilidades por severidad |
| `qasl_zap_top_vulnerability` | Gauge | Top vulnerabilidades detectadas |
| `qasl_zap_scan_status` | Gauge | Estado del escaneo ZAP |
| `qasl_ml_anomalies` | Gauge | Anomalias detectadas por ML |
| `qasl_ml_predicted_failures` | Gauge | Fallos predichos |
| `qasl_ml_confidence` | Gauge | Confianza del modelo ML |

### Prometheus (Garak - Seguridad IA/LLM)

| Metrica | Tipo | Descripcion |
|---------|------|-------------|
| `garak_defcon_level` | Gauge | Nivel DEFCON (1=critico, 5=perfecto) |
| `garak_probes_total` | Gauge | Total de probes ejecutados |
| `garak_probes_passed` | Gauge | Probes resistidos |
| `garak_probes_failed` | Gauge | Probes vulnerados |
| `garak_pass_rate` | Gauge | Tasa de exito (%) |
| `garak_vulnerability_rate` | Gauge | Tasa de vulnerabilidad (%) |
| `garak_elapsed_seconds` | Gauge | Duracion del scan |
| `garak_model_info` | Gauge | Info del modelo (labels: model, type) |
| `garak_scan_info` | Gauge | Info del scan (labels: probe_spec, garak_version) |
| `garak_detector_pass_rate` | Gauge | Tasa por detector |
| `garak_category_pass_rate` | Gauge | Tasa por categoria |
| `garak_probe_pass_rate` | Gauge | Tasa por probe |

### InfluxDB (Frontend DOM + Seguridad)

**Bucket:** `sentinel_metrics` | **Org:** `qasl`

| Measurement | Campos | Descripcion |
|-------------|--------|-------------|
| `sentinel_scan` | changes, confidence, execution_time, impacted_tests, status_code | Resultado del escaneo DOM |
| `sentinel_security` | high, medium, low, informational, total, regressions, resolved | Vulnerabilidades OWASP ZAP |
| `sentinel_security_alert` | instances, position, risk_code | Detalle por vulnerabilidad |

### InfluxDB-Mobile (QASL-MOBILE - Canal Satelite)

**Database:** `qasl_mobile` | **Puerto:** 8089

| Measurement | Campos | Descripcion |
|-------------|--------|-------------|
| `test_execution` | passed, failed, total_steps, passed_steps, failed_steps, duration_ms, avg_step_duration, screenshots_count, selector_confidence | Resultado de ejecucion de test mobile |

| Tag | Valores | Descripcion |
|-----|---------|-------------|
| `test_id` | TC-CONTACTS-001, etc. | Identificador del test case |
| `status` | passed, failed | Estado de la ejecucion |
| `platform` | android | Plataforma del dispositivo |
| `device` | sdk_gphone64_x86_64 | Nombre del dispositivo |
| `framework` | maestro | Framework de testing mobile |

---

## Reportes Automaticos

Cuando el Backend Monitor esta corriendo, ejecuta tareas automaticamente:

| Tarea | Horario | Descripcion |
|-------|---------|-------------|
| **Health Checks Criticos** | Cada 30 segundos | APIs criticas |
| **Health Checks Normales** | Cada 2 minutos | APIs normales |
| **Health Checks Bajos** | Cada 5 minutos | APIs de baja prioridad |
| **Predicciones ML** | Cada 1 hora | Anomalias y prediccion de fallos |
| **Compliance** | Al inicio + cada 6h | SOC2, ISO 27001, PCI-DSS, HIPAA |
| **Reporte Diario** | 8:00 AM | PDF + email automatico |
| **Limpieza de Datos** | 3:00 AM | Elimina datos > 30 dias |

**INGRID Chatbot** genera reportes PDF on-demand cuando el usuario lo solicita desde el chat. Los reportes son contextuales: garak, apis, zap, compliance o full.

**Zona horaria:** America/Argentina/Buenos_Aires

---

## Configuracion de INGRID (.env)

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
INFLUXDB_TOKEN=...
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

## Troubleshooting

### Docker no levanta

```powershell
# Verificar Docker Desktop esta corriendo
docker ps

# Reiniciar contenedores
cd C:\Users\Epidater\Desktop\Proyectos\QASL-SENTINEL-UNIFIED\unified
docker-compose down
docker-compose up -d
```

### Grafana muestra "No data"

```powershell
# Verificar que el Backend Monitor este corriendo
curl http://localhost:9097/metrics

# Verificar Prometheus esta scrapeando
curl http://localhost:9095/api/v1/targets

# Reiniciar Grafana
docker-compose restart grafana
```

### INGRID no responde

```powershell
# Verificar que INGRID este corriendo
curl http://localhost:3100/api/health

# Si no responde, reiniciar
cd qasl-ingrid
npm start

# Verificar logs
# Los logs se muestran en la terminal donde corre INGRID
```

### Widget INGRID no aparece en Grafana

```powershell
# El widget se inyecta via Dockerfile de Grafana
# Reconstruir la imagen
docker-compose build grafana
docker-compose up -d grafana
```

### Email de INGRID no llega

```
# Verificar configuracion SMTP en qasl-ingrid/.env
# Para Gmail, usar App Password (no la contrasena normal)
# Generar en: https://myaccount.google.com/apppasswords
```

### Garak no muestra metricas

```powershell
# Verificar que Pushgateway tiene metricas Garak
curl http://localhost:9096/metrics | findstr garak

# Re-importar el ultimo reporte
node sentinel-backend/src/importers/garak-importer.mjs --latest

# Verificar que Prometheus scrapea Pushgateway
curl http://localhost:9095/api/v1/query?query=garak_probes_total
```

### QASL-MOBILE muestra "No data"

```
# El proyecto satelite QASL-MOBILE debe estar corriendo por separado
# Verificar que InfluxDB de QASL-MOBILE esta activo
curl http://localhost:8089/ping

# Si no responde, iniciar QASL-MOBILE desde su propio proyecto
# (NO desde QASL-SENTINEL-UNIFIED)
```

### Video de QASL-MOBILE no se reproduce

```powershell
# Verificar que el video server nginx esta corriendo
curl http://localhost:8766/test-execution.mp4

# Si no responde, reiniciar contenedores
docker-compose restart video-server
```

### Puerto 9097 en uso

```powershell
# Ya hay un Backend Monitor corriendo. Detenerlo:
Get-Process node | Stop-Process -Force

# O buscar el proceso especifico:
netstat -ano | findstr :9097
```

### VPN no conectada

```
Error: VPN connection required
```
**Solucion:** Conectar la VPN antes de ejecutar los monitores.

### Frontend Monitor falla con Playwright

```powershell
# Reinstalar navegadores
cd sentinel-frontend
npx playwright install chromium
```

### Reset completo (empezar de cero)

```powershell
# 1. Detener todo
Get-Process node | Stop-Process -Force
docker-compose down

# 2. Limpiar metricas
.\clean-metrics.ps1

# 3. Volver a ejecutar
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
| Maestro | Framework de testing mobile (QASL-MOBILE) |
| Claude AI (Anthropic) | Chatbot INGRID + analisis inteligente |
| PDFKit | Generacion de informes PDF profesionales |
| Nodemailer | Envio de emails con adjuntos PDF |
| OWASP ZAP | Escaneo de seguridad web |
| NVIDIA Garak | Evaluacion de seguridad de modelos LLM |
| Prometheus | Base de datos de metricas backend |
| InfluxDB 2.7 | Base de datos de metricas frontend |
| InfluxDB 1.x | Base de datos de metricas mobile (QASL-MOBILE) |
| Grafana | Dashboard de visualizacion unificado |
| Docker Compose | Orquestacion de infraestructura |
| Pushgateway | Gateway de metricas Prometheus |
| nginx | Servidor de video MP4 (QASL-MOBILE) |

---

## Origen del Proyecto

QASL-SENTINEL-UNIFIED nace de la unificacion de multiples proyectos independientes:

| Proyecto Original | Puerto Grafana | Funcion | Estado |
|-------------------|----------------|---------|--------|
| QASL-SENTINEL | :3002 | Monitoreo Frontend DOM | Integrado |
| QASL-API-SENTINEL | :3001 | Monitoreo Backend APIs | Integrado |
| NVIDIA Garak | - | Seguridad IA/LLM | Integrado |
| QASL-MOBILE | :3004 | Testing Mobile con IA | Canal Satelite |
| **QASL-SENTINEL-UNIFIED** | **:3003** | **Command Center Unificado** | **Activo** |
| **QASL-INGRID** | **:3100** | **Chatbot IA + Informes PDF** | **Activo** |

Los proyectos originales se mantienen en `source-projects/` como referencia.
QASL-MOBILE opera como canal satelite independiente, publicando metricas a InfluxDB (:8089) que el Command Center lee en modo solo-lectura.

---

## Autor

**ELYER GREGORIO MALDONADO**
Lider Tecnico QA | QASL NEXUS LLM

---

## Licencia

Proyecto de Elyer Gregorio Maldonado
Plataforma QA con 12 Microservicios + Multi-LLM

---

**QASL-SENTINEL-UNIFIED v3.0.0**
Command Center Unificado de Monitoreo E2E
QASL NEXUS LLM - Plataforma QA con 12 Microservicios + Multi-LLM

Backend APIs + Frontend DOM + Seguridad OWASP + Seguridad IA/LLM (Garak) + Testing Mobile (QASL-MOBILE) + Chatbot INGRID + Informes PDF | Machine Learning | Powered by Claude AI
