# QASL-MOBILE

<div align="center">

```
 ██████╗  █████╗ ███████╗██╗         ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗
██╔═══██╗██╔══██╗██╔════╝██║         ████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝
██║   ██║███████║███████╗██║         ██╔████╔██║██║   ██║██████╔╝██║██║     █████╗
██║▄▄ ██║██╔══██║╚════██║██║         ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝
╚██████╔╝██║  ██║███████║███████╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗
 ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝
```

**Shift-Left Mobile Testing Framework with AI Validation**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Maestro](https://img.shields.io/badge/Maestro-Mobile%20Testing-orange.svg)](https://maestro.mobile.dev/)
[![Claude AI](https://img.shields.io/badge/Claude%20AI-INGRID%20Vision-purple.svg)](https://anthropic.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

**Developed by Elyer Gregorio Maldonado - Lider Tecnico QA**

</div>

---

## Descripcion

QASL-MOBILE es un framework profesional de automatizacion de pruebas para aplicaciones moviles Android. Combina la potencia de Maestro para la ejecucion de tests con INGRID (Claude Vision AI) para analisis inteligente de UX/UI, metricas en tiempo real con InfluxDB/Grafana, y streaming en vivo del dispositivo.

### Caracteristicas Principales

- **Grabacion de Tests**: Captura automatica de flujos de usuario
- **Ejecucion Automatizada**: Tests con reintentos automaticos y screenshots
- **Analisis AI (INGRID)**: Validacion de UX/UI con Claude Vision
- **Metricas en Tiempo Real**: Dashboard Grafana con InfluxDB
- **Streaming en Vivo**: Visualizacion del dispositivo en tiempo real via WebSocket
- **Reportes Allure**: Reportes detallados de ejecucion

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           QASL-MOBILE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ Recorder │───>│ Generator│───>│  Runner  │───>│ Reporter │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │                               │               │                  │
│       v                               v               v                  │
│  ┌──────────┐                  ┌──────────┐    ┌──────────┐            │
│  │  YAML    │                  │  INGRID  │    │  Allure  │            │
│  │  Tests   │                  │ (AI/UX)  │    │ Reports  │            │
│  └──────────┘                  └──────────┘    └──────────┘            │
│                                      │                                   │
│                                      v                                   │
│                               ┌──────────┐    ┌──────────┐              │
│                               │ InfluxDB │───>│ Grafana  │              │
│                               └──────────┘    └──────────┘              │
│                                                     │                    │
│                               ┌──────────┐         │                    │
│                               │ Streamer │─────────┘                    │
│                               │ (Live)   │                              │
│                               └──────────┘                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Requisitos Previos

- **Node.js** 18+
- **Android Studio** con emulador configurado
- **Maestro CLI** instalado (`curl -Ls "https://get.maestro.mobile.dev" | bash`)
- **Docker** (para InfluxDB y Grafana)
- **ADB** configurado en PATH

---

## Instalacion

```bash
# 1. Clonar el repositorio
git clone https://github.com/E-Gregorio/QASL-NEXUS-LLM.git
cd QASL-NEXUS-LLM/microservices/ms-04-qasl-mobile/qasl-mobile

# 2. Instalar dependencias
npm install

# 3. Compilar TypeScript
npm run build

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY
```

---

## Guia de Uso Diario - Comandos en Orden

Esta seccion describe el flujo de trabajo completo para un dia laboral de testing.

### PASO 1: Levantar Infraestructura

```bash
# 1.1 Iniciar Docker (InfluxDB + Grafana)
docker-compose up -d

# 1.2 Verificar que los contenedores esten corriendo
docker ps

# Resultado esperado:
# CONTAINER ID   IMAGE          STATUS         PORTS
# xxxx           influxdb:1.8   Up             0.0.0.0:8086->8086/tcp
# xxxx           grafana/grafana Up            0.0.0.0:3001->3000/tcp
```

### PASO 2: Iniciar el Emulador Android

```bash
# 2.1 Listar emuladores disponibles
emulator -list-avds

# 2.2 Iniciar el emulador (reemplazar con tu nombre de emulador)
emulator -avd Pixel_6_API_34 &

# 2.3 Esperar a que el emulador este listo
adb wait-for-device

# 2.4 Verificar conexion
adb devices
```

### PASO 3: Iniciar el Streaming en Vivo

```bash
# 3.1 Iniciar el servidor de streaming (en una terminal separada)
npm run cli -- stream

# Resultado esperado:
# ╔════════════════════════════════════════════════════════╗
# ║  QASL-MOBILE Screen Streamer                           ║
# ╠════════════════════════════════════════════════════════╣
# ║  HTTP Server: http://localhost:8765                    ║
# ║  Viewer:      http://localhost:8765/viewer             ║
# ╚════════════════════════════════════════════════════════╝

# 3.2 Abrir el viewer en el navegador (opcional)
# http://localhost:8765/viewer
```

### PASO 4: Acceder al Dashboard de Grafana

```bash
# 4.1 Abrir Grafana en el navegador
# URL: http://localhost:3001
# Usuario: admin
# Password: admin

# 4.2 Importar el dashboard (solo la primera vez)
# - Ir a Dashboards > Import
# - Subir el archivo: grafana/dashboards/qasl-mobile-dashboard.json
# - Seleccionar datasource: influxdb-qasl

# 4.3 O importar via API:
curl -X POST "http://admin:admin@localhost:3001/api/dashboards/db" \
  -H "Content-Type: application/json" \
  -d "{\"dashboard\": $(cat grafana/dashboards/qasl-mobile-dashboard.json), \"overwrite\": true}"
```

### PASO 5: Grabar un Nuevo Test (Opcional)

```bash
# 5.1 Iniciar grabacion interactiva
npm run cli -- record

# 5.2 Seguir las instrucciones:
# - Seleccionar app a testear
# - Realizar las acciones en el emulador
# - Guardar el test cuando termine

# 5.3 El test se guarda en: tests/tu-test.yaml
```

### PASO 6: Ejecutar Tests

```bash
# 6.1 Ejecutar un test especifico
npm run cli -- run --flow tests/test-settings.yaml

# 6.2 Ejecutar todos los tests de un directorio
npm run cli -- run --flow tests/

# 6.3 Ejecutar con analisis INGRID (AI)
npm run cli -- run --flow tests/test-settings.yaml --analyze

# Resultado esperado:
# 🚀 Starting test execution: xxxxx-xxxx-xxxx
# 📱 Device: sdk_gphone64_x86_64
# 📄 Flow: tests/test-settings.yaml
# 📸 Screenshot saved: screenshots/test-settings-before-xxx.png
# ✅ Test PASSED in 25000ms
# 📊 Metrics sent to InfluxDB: TEST-SETTINGS
```

### PASO 7: Ver Resultados en Tiempo Real

```bash
# 7.1 Dashboard Grafana (metricas)
# http://localhost:3001/d/qasl-mobile-main/qasl-mobile-dashboard

# 7.2 Streaming del dispositivo (ejecucion en vivo)
# http://localhost:8765/viewer

# 7.3 Ver screenshots capturados
ls -la screenshots/
```

### PASO 8: Generar Reportes Allure

```bash
# 8.1 Generar reporte HTML
npm run cli -- report --format allure

# 8.2 Ver el reporte (requiere allure CLI instalado)
allure serve reports/allure-results

# 8.3 O abrir directamente el HTML
# reports/allure-report/index.html
```

### PASO 9: Limpiar Datos y Reportes

```bash
# 9.1 Limpiar screenshots antiguos
rm -rf screenshots/*.png

# 9.2 Limpiar reportes
rm -rf reports/allure-results/*
rm -rf reports/allure-report/*

# 9.3 Limpiar output temporal
rm -rf output/*

# 9.4 Limpiar metricas de InfluxDB (opcional - borra todo el historial)
curl -X POST "http://localhost:8086/query?db=qasl_mobile" \
  --data-urlencode "q=DROP SERIES FROM test_execution"
```

### PASO 10: Detener Todo al Final del Dia

```bash
# 10.1 Detener el streaming (Ctrl+C en la terminal del streamer)

# 10.2 Detener el emulador
adb emu kill

# 10.3 Detener Docker (InfluxDB + Grafana)
docker-compose down

# 10.4 (Opcional) Detener y eliminar volumenes
docker-compose down -v
```

---

## Comandos Rapidos de Referencia

| Comando | Descripcion |
|---------|-------------|
| `npm run cli -- record` | Grabar nuevo test |
| `npm run cli -- run --flow <archivo>` | Ejecutar test |
| `npm run cli -- run --flow <archivo> --analyze` | Ejecutar con analisis AI |
| `npm run cli -- stream` | Iniciar streaming |
| `npm run cli -- report --format allure` | Generar reporte |
| `npm run cli -- init` | Inicializar proyecto |
| `docker-compose up -d` | Levantar infraestructura |
| `docker-compose down` | Detener infraestructura |

---

## Configuracion

### qasl-mobile.config.json

```json
{
  "appId": "com.example.app",
  "device": "Pixel_6",
  "platform": "android",
  "maestroTimeout": 30000,
  "retryCount": 3,
  "autoScreenshot": true,
  "recordVideo": false,
  "enableINGRID": true,
  "outputDir": "./output",
  "testsDir": "./tests",
  "screenshotsDir": "./screenshots",
  "reportsDir": "./reports",
  "influxdb": {
    "url": "http://localhost:8086",
    "database": "qasl_mobile"
  }
}
```

### Variables de Entorno (.env)

```env
ANTHROPIC_API_KEY=tu-api-key-de-anthropic
INFLUXDB_URL=http://localhost:8086
INFLUXDB_DATABASE=qasl_mobile
GRAFANA_URL=http://localhost:3001
```

---

## Estructura del Proyecto

```
qasl-mobile/
├── src/
│   ├── cli.ts                 # CLI principal
│   ├── index.ts               # Punto de entrada
│   ├── types/                 # Definiciones TypeScript
│   ├── recorder/              # Grabador de tests
│   ├── generator/             # Generador de YAML
│   ├── runner/                # Ejecutor Maestro
│   ├── ingrid/                # Analizador AI (Claude Vision)
│   ├── metrics/               # Collector InfluxDB
│   ├── streaming/             # Screen Streamer WebSocket
│   └── reporters/             # Reportes Allure
├── tests/                     # Tests YAML
├── screenshots/               # Capturas de pantalla
├── reports/                   # Reportes generados
├── grafana/
│   └── dashboards/            # Dashboard JSON
├── docker-compose.yml         # InfluxDB + Grafana
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dashboard Grafana

El dashboard incluye:

- **Pass Rate**: Porcentaje de tests exitosos
- **Total Tests / Passed / Failed**: Contadores de ejecucion
- **Avg Duration**: Tiempo promedio de ejecucion
- **Selector Confidence**: Confianza de selectores AI
- **Screenshots Captured**: Total de capturas
- **Test Duration Over Time**: Grafico de tendencia
- **Test Results Distribution**: Distribucion passed/failed
- **Device Stream**: Vista en vivo del dispositivo
- **Recent Test Executions**: Tabla de ejecuciones recientes

---

## INGRID - Analisis AI

INGRID (Intelligent Network for Graphical Recognition and Interface Detection) utiliza Claude Vision para:

- Analizar screenshots capturados
- Detectar problemas de UX/UI
- Validar accesibilidad
- Generar recomendaciones de mejora

---

## Troubleshooting

### El emulador no conecta
```bash
adb kill-server
adb start-server
adb devices
```

### Grafana no muestra datos
```bash
# Verificar InfluxDB
curl -G "http://localhost:8086/query?db=qasl_mobile" \
  --data-urlencode "q=SELECT * FROM test_execution LIMIT 5"
```

### El streaming no funciona
```bash
# Verificar que ADB este conectado
adb devices

# Verificar el servidor de streaming
curl http://localhost:8765/health
```

---

## Licencia

MIT License - Desarrollado por **Elyer Gregorio Maldonado**

---

## Contacto

- **Autor**: Elyer Gregorio Maldonado
- **Rol**: Lider Tecnico QA
- **Framework**: QASL-MOBILE v1.0.0

---

<div align="center">

**QASL-MOBILE** - Shift-Left Mobile Testing with AI Validation

*Powered by Maestro + INGRID AI + Grafana*

</div>
