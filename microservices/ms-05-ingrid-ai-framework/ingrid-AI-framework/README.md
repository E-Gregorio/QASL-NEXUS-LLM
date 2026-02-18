# INGRID - AI Testing Framework

[![Author](https://img.shields.io/badge/Author-Elyer%20Maldonado-blue)](https://github.com/E-Gregorio)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0-orange)](https://github.com/E-Gregorio/ingrid-AI-framework)
[![CI/CD](https://github.com/E-Gregorio/ingrid-AI-framework/actions/workflows/ingrid-tests.yml/badge.svg)](https://github.com/E-Gregorio/ingrid-AI-framework/actions)

> **I**ntelligent **N**etwork for **G**enerative **R**esponse **I**nspection & **D**efense

Framework profesional para testing automatizado de Chatbots e Inteligencia Artificial, basado en OWASP LLM Top 10 2025 y metodologia LLM-as-Judge.

**Creado por [Elyer Maldonado](https://github.com/E-Gregorio)** - Diciembre 2024

---

## Que hace INGRID?

1. **Testea IA** automaticamente con Playwright
2. **Evalua respuestas** usando Claude como juez (LLM-as-Judge)
3. **Detecta vulnerabilidades** de seguridad (OWASP LLM Top 10 2025)
4. **Mide performance** de tiempos de respuesta
5. **Muestra metricas** en tiempo real en Grafana
6. **Genera reportes** profesionales (Allure + PDF)
7. **API REST** para integracion con sistemas externos
8. **CI/CD** con GitHub Actions

---

## Requisitos

- Node.js 18+
- Docker Desktop (para Grafana)
- API Key de Anthropic (Claude)

---

## Instalacion Rapida

```bash
# 1. Clonar repositorio
git clone https://github.com/E-Gregorio/ingrid-AI-framework.git
cd ingrid-AI-framework

# 2. Instalar dependencias
npm install

# 3. Instalar navegadores de Playwright
npx playwright install

# 4. Configurar API Key en archivo .env
echo "ANTHROPIC_API_KEY=tu-api-key-de-anthropic" > .env
```

---

## Comandos Disponibles

### Tests
| Comando | Descripcion |
|---------|-------------|
| `npm test` | Ejecutar todos los tests |
| `npm run test:gemini` | Tests en Google Gemini (web real) |
| `npm run test:chatbot:functional` | Tests funcionales chatbot |
| `npm run test:chatbot:security` | Tests seguridad OWASP |
| `npm run test:chatbot:performance` | Tests performance |
| `npm run test:security` | Todos los tests de seguridad |
| `npm run test:api` | Tests de API multi-modelo |
| `npm run test:smoke` | Tests rapidos de verificacion |

### Servidores
| Comando | Descripcion |
|---------|-------------|
| `npm run demo` | Levantar chatbot demo (puerto 3333) |
| `npm run api` | Levantar API REST (puerto 4000) |
| `npm run api:dev` | API en modo desarrollo (auto-reload) |

### Reportes
| Comando | Descripcion |
|---------|-------------|
| `npm run report` | Generar y abrir reporte Allure |
| `npm run report:generate` | Solo generar reporte Allure |
| `npm run pdf` | Generar reporte PDF profesional |
| `npm run pdf:compare` | Generar PDF comparativo multi-modelo |

### Grafana (Metricas en Tiempo Real)
| Comando | Descripcion |
|---------|-------------|
| `npm run grafana:up` | Levantar Grafana + Prometheus |
| `npm run grafana:down` | Apagar Grafana |
| `npm run grafana:reset` | Reiniciar con datos limpios |
| `npm run grafana:logs` | Ver logs de Grafana |

### Limpieza
| Comando | Descripcion |
|---------|-------------|
| `npm run clean` | Limpiar reportes Allure |
| `npm run clean:metrics` | Limpiar metricas de Grafana |
| `npm run clean:all` | Limpiar todo (incluye node_modules) |

### Validacion
| Comando | Descripcion |
|---------|-------------|
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm run validate` | Typecheck + ejecutar tests |

---

## Comandos de Limpieza de Puertos (PowerShell)

Antes de ejecutar los demos, asegurate de que los puertos esten libres.

### Matar procesos en puertos especificos

```powershell
# Ver que proceso usa un puerto especifico
netstat -ano | findstr :3333
netstat -ano | findstr :3002
netstat -ano | findstr :4000

# Matar proceso por PID (reemplazar PID con el numero)
taskkill /PID <PID> /F

# Matar Node.js (libera puertos 3333, 4000)
taskkill /F /IM node.exe

# Matar procesos de Playwright
taskkill /F /IM playwright.exe
```

### Liberar puertos comunes de INGRID

```powershell
# Liberar puerto 3333 (Demo chatbot)
$pid3333 = (Get-NetTCPConnection -LocalPort 3333 -ErrorAction SilentlyContinue).OwningProcess
if ($pid3333) { Stop-Process -Id $pid3333 -Force }

# Liberar puerto 4000 (API)
$pid4000 = (Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue).OwningProcess
if ($pid4000) { Stop-Process -Id $pid4000 -Force }

# Liberar puertos de Grafana (3002, 9090, 9091)
npm run grafana:down
```

### Limpieza completa Docker

```powershell
# Detener todos los contenedores
docker stop $(docker ps -aq)

# Eliminar todos los contenedores
docker rm $(docker ps -aq)

# Eliminar volumenes (limpia metricas antiguas)
docker volume rm $(docker volume ls -q)

# Reiniciar Docker Desktop (si hay problemas)
Restart-Service docker
```

---

## Demo Rapido: Orden Logico de Comandos

### PASO 0: Limpieza previa (IMPORTANTE)

```powershell
# 1. Matar procesos Node.js existentes
taskkill /F /IM node.exe 2>$null

# 2. Detener y limpiar Docker/Grafana
npm run grafana:down

# 3. Limpiar datos anteriores
npm run clean:metrics
npm run clean
```

### PASO 1: Levantar infraestructura

```powershell
# Levantar Grafana (esperar 15 segundos)
npm run grafana:up

# Verificar que este corriendo
docker ps
```

### PASO 2: Levantar chatbot demo (si es necesario)

```powershell
# En una terminal separada
npm run demo
```

### PASO 3: Ejecutar tests

```powershell
# Tests funcionales
npm run test:chatbot:functional

# O tests de seguridad OWASP
npm run test:chatbot:security

# O todos los tests
npm test
```

### PASO 4: Ver resultados

```powershell
# Abrir Grafana
start http://localhost:3002
# Usuario: admin | Password: admin

# Generar reportes
npm run report    # Allure (interactivo)
npm run pdf       # PDF profesional
```

### PASO 5: Limpieza final

```powershell
# Apagar Grafana
npm run grafana:down

# Matar demo server
taskkill /F /IM node.exe
```

---

## Demo 1: Tests Funcionales del Chatbot Demo

Testea el chatbot de prueba incluido con evaluacion LLM-as-Judge.

```powershell
# ═══════════════════════════════════════════════════════════════
# PASO 0: LIMPIEZA PREVIA
# ═══════════════════════════════════════════════════════════════
taskkill /F /IM node.exe 2>$null
npm run grafana:down

# ═══════════════════════════════════════════════════════════════
# PASO 1: LIMPIAR DATOS ANTERIORES
# ═══════════════════════════════════════════════════════════════
npm run clean:metrics
npm run clean

# ═══════════════════════════════════════════════════════════════
# PASO 2: LEVANTAR GRAFANA (requiere Docker Desktop)
# ═══════════════════════════════════════════════════════════════
npm run grafana:up
# Esperar 15 segundos para que inicie completamente

# ═══════════════════════════════════════════════════════════════
# PASO 3: LEVANTAR CHATBOT DEMO (nueva terminal)
# ═══════════════════════════════════════════════════════════════
npm run demo

# ═══════════════════════════════════════════════════════════════
# PASO 4: EJECUTAR TESTS FUNCIONALES (en terminal principal)
# ═══════════════════════════════════════════════════════════════
npm run test:chatbot:functional

# ═══════════════════════════════════════════════════════════════
# PASO 5: VER METRICAS EN GRAFANA
# ═══════════════════════════════════════════════════════════════
# Abrir: http://localhost:3002
# Usuario: admin | Password: admin
#
# NOTA: Los paneles OWASP mostraran "N/A" (gris) porque solo
# se ejecutaron tests funcionales, no tests de seguridad.

# ═══════════════════════════════════════════════════════════════
# PASO 6: GENERAR REPORTES
# ═══════════════════════════════════════════════════════════════
npm run report   # Allure (interactivo en navegador)
npm run pdf      # PDF profesional

# ═══════════════════════════════════════════════════════════════
# PASO 7: APAGAR TODO
# ═══════════════════════════════════════════════════════════════
npm run grafana:down
taskkill /F /IM node.exe
```

---

## Demo 2: Tests de Seguridad OWASP

Ejecuta tests de seguridad basados en OWASP LLM Top 10 2025.

```powershell
# ═══════════════════════════════════════════════════════════════
# PASO 0: LIMPIEZA PREVIA
# ═══════════════════════════════════════════════════════════════
taskkill /F /IM node.exe 2>$null
npm run grafana:down

# ═══════════════════════════════════════════════════════════════
# PASO 1: RESET COMPLETO DE GRAFANA (limpia metricas antiguas)
# ═══════════════════════════════════════════════════════════════
npm run grafana:reset
# Esperar 15 segundos

# ═══════════════════════════════════════════════════════════════
# PASO 2: LIMPIAR DATOS LOCALES
# ═══════════════════════════════════════════════════════════════
npm run clean:metrics
npm run clean

# ═══════════════════════════════════════════════════════════════
# PASO 3: LEVANTAR CHATBOT DEMO (nueva terminal)
# ═══════════════════════════════════════════════════════════════
npm run demo

# ═══════════════════════════════════════════════════════════════
# PASO 4: EJECUTAR TESTS DE SEGURIDAD
# ═══════════════════════════════════════════════════════════════
npm run test:chatbot:security

# ═══════════════════════════════════════════════════════════════
# PASO 5: VER METRICAS EN GRAFANA
# ═══════════════════════════════════════════════════════════════
# Abrir: http://localhost:3002
# Los paneles OWASP mostraran PASS (verde) o FAIL (rojo)

# ═══════════════════════════════════════════════════════════════
# PASO 6: GENERAR REPORTES
# ═══════════════════════════════════════════════════════════════
npm run report
npm run pdf

# ═══════════════════════════════════════════════════════════════
# PASO 7: APAGAR TODO
# ═══════════════════════════════════════════════════════════════
npm run grafana:down
taskkill /F /IM node.exe
```

---

## Demo 3: Tests Completos (Funcionales + Seguridad)

```powershell
# ═══════════════════════════════════════════════════════════════
# PASO 0: LIMPIEZA COMPLETA
# ═══════════════════════════════════════════════════════════════
taskkill /F /IM node.exe 2>$null
npm run grafana:reset
npm run clean:metrics && npm run clean

# ═══════════════════════════════════════════════════════════════
# PASO 1: LEVANTAR CHATBOT DEMO
# ═══════════════════════════════════════════════════════════════
npm run demo

# ═══════════════════════════════════════════════════════════════
# PASO 2: EJECUTAR TODOS LOS TESTS
# ═══════════════════════════════════════════════════════════════
npm test

# ═══════════════════════════════════════════════════════════════
# PASO 3: VER RESULTADOS
# ═══════════════════════════════════════════════════════════════
# Grafana: http://localhost:3002
npm run report
npm run pdf

# ═══════════════════════════════════════════════════════════════
# PASO 4: APAGAR TODO
# ═══════════════════════════════════════════════════════════════
npm run grafana:down
taskkill /F /IM node.exe
```

---

## Demo 4: Testear Google Gemini (IA Real)

Testea Google Gemini en vivo.

```powershell
# ═══════════════════════════════════════════════════════════════
# PASO 0: LIMPIEZA
# ═══════════════════════════════════════════════════════════════
taskkill /F /IM node.exe 2>$null
npm run grafana:reset
npm run clean:metrics && npm run clean

# ═══════════════════════════════════════════════════════════════
# PASO 1: EJECUTAR TESTS DE GEMINI (abre navegador)
# ═══════════════════════════════════════════════════════════════
npm run test:gemini

# ═══════════════════════════════════════════════════════════════
# PASO 2: VER RESULTADOS
# ═══════════════════════════════════════════════════════════════
# Grafana: http://localhost:3002
npm run report
npm run pdf

# ═══════════════════════════════════════════════════════════════
# PASO 3: APAGAR
# ═══════════════════════════════════════════════════════════════
npm run grafana:down
```

---

## Demo 5: Testear SvitlaBot (Chatbot Externo)

Testea el chatbot de Svitla Systems.

```powershell
# ═══════════════════════════════════════════════════════════════
# PASO 0: LIMPIEZA
# ═══════════════════════════════════════════════════════════════
taskkill /F /IM node.exe 2>$null
npm run grafana:reset
npm run clean:metrics && npm run clean

# ═══════════════════════════════════════════════════════════════
# PASO 1: EJECUTAR TESTS DE SVITLABOT
# ═══════════════════════════════════════════════════════════════
npm run test:svitlabot

# ═══════════════════════════════════════════════════════════════
# PASO 2: VER RESULTADOS
# ═══════════════════════════════════════════════════════════════
# Grafana: http://localhost:3002
npm run report
npm run pdf

# ═══════════════════════════════════════════════════════════════
# PASO 3: APAGAR
# ═══════════════════════════════════════════════════════════════
npm run grafana:down
```

---

## Puertos Utilizados

| Servicio | Puerto | URL |
|----------|--------|-----|
| Chatbot Demo | 3333 | http://localhost:3333 |
| Grafana | 3002 | http://localhost:3002 |
| API REST | 4000 | http://localhost:4000 |
| Prometheus | 9090 | http://localhost:9090 |
| Pushgateway | 9091 | http://localhost:9091 |

---

## Credenciales Grafana

- **Usuario**: admin
- **Password**: admin

### Si Grafana no responde (reset de credenciales):
```bash
docker exec -it ingrid-grafana grafana-cli admin reset-admin-password admin
```

---

## Comportamiento de Metricas OWASP en Grafana

### Cuando solo ejecutas tests funcionales:
- Los paneles OWASP mostraran **"N/A"** (gris)
- Esto es correcto porque no se ejecutaron tests de seguridad

### Cuando ejecutas tests de seguridad:
- Los paneles OWASP mostraran **"PASS"** (verde) o **"FAIL"** (rojo)
- Segun el resultado de cada test OWASP LLM Top 10

### Si Grafana muestra datos antiguos:
```powershell
# Ejecutar reset completo
npm run grafana:reset
npm run clean:metrics
```

---

## Archivos Generados

| Archivo | Ubicacion |
|---------|-----------|
| Metricas JSON | `reports/metrics-store.json` |
| Reporte PDF | `reports/INGRID-AI-Security-Assessment-*.pdf` |
| Screenshots | `reports/*.png` |
| Reporte HTML | `reports/html/index.html` |
| Allure Results | `allure-results/` |
| Videos | `test-results/` |

---

## API REST

INGRID incluye una API REST para ejecutar tests remotamente.

### Iniciar API

```bash
npm run api
# Servidor en http://localhost:4000
```

### Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor |
| GET | `/api/v1/suites` | Listar suites de tests |
| POST | `/api/v1/run` | Ejecutar tests |
| GET | `/api/v1/jobs` | Listar todos los jobs |
| GET | `/api/v1/jobs/:id` | Estado de un job |
| GET | `/api/v1/results` | Ultimos resultados |
| GET | `/api/v1/metrics` | Metricas LLM-as-Judge |
| GET | `/api/v1/report` | Descargar PDF |

### Ejemplo

```bash
# Ejecutar tests de seguridad
curl -X POST http://localhost:4000/api/v1/run \
  -H "Content-Type: application/json" \
  -d '{"suite": "security"}'

# Ver resultados
curl http://localhost:4000/api/v1/results

# Descargar PDF
curl -o reporte.pdf http://localhost:4000/api/v1/report
```

Ver documentacion completa: [docs/API-GUIDE.md](docs/API-GUIDE.md)

---

## Tests de Seguridad (OWASP LLM Top 10 2025)

| ID | Vulnerabilidad | Que prueba |
|----|----------------|------------|
| LLM01 | Prompt Injection | Inyeccion de instrucciones maliciosas |
| LLM02 | Insecure Output | XSS, codigo malicioso en respuestas |
| LLM03 | Training Data Poisoning | Sesgo y discriminacion en respuestas |
| LLM04 | Model Denial of Service | Resistencia a prompts largos |
| LLM05 | Supply Chain Vulnerabilities | Extraccion de info de plugins |
| LLM06 | Sensitive Info Disclosure | Fuga de system prompt |
| LLM07 | Insecure Plugin Design | Ejecucion de comandos |
| LLM08 | Excessive Agency | Control de acciones autonomas |
| LLM09 | Overreliance | Alucinaciones, info falsa |
| LLM10 | Model Theft | Extraccion de arquitectura |

---

## Metricas LLM-as-Judge

Claude evalua cada respuesta con 5 metricas (0-10):

| Metrica | Que mide | Umbral |
|---------|----------|--------|
| Relevancia | Responde lo preguntado? | >= 7 |
| Precision | Informacion correcta? | >= 8 |
| Coherencia | Logica y estructura? | >= 7 |
| Completitud | Cubre todo? | >= 6 |
| Alucinacion | Inventa datos? | <= 2 |

---

## Estructura del Proyecto

```
INGRID/
├── src/
│   ├── judge.ts          # LLM-as-Judge (Claude evalua)
│   ├── attacks.ts        # Ataques OWASP LLM Top 10
│   ├── runner.ts         # Orquestador de tests
│   ├── client.ts         # Cliente para chatbot
│   ├── metrics-store.ts  # Guarda metricas
│   └── reporter.ts       # Envia a Prometheus
│
├── tests/
│   ├── gemini.spec.ts              # Tests Google Gemini
│   ├── svitlabot.spec.ts           # Tests SvitlaBot
│   ├── chatbot-functional.spec.ts  # Tests funcionales
│   ├── chatbot-security.spec.ts    # Tests seguridad
│   └── chatbot-performance.spec.ts # Tests performance
│
├── api/
│   └── server.js         # API REST server
│
├── scripts/
│   ├── generate-pdf.mjs           # Generador de reportes PDF
│   └── generate-comparative-pdf.mjs # PDF comparativo
│
├── demo/
│   └── server.js         # Chatbot de prueba
│
├── grafana/              # Docker Compose Grafana
├── docs/                 # Documentacion
└── reports/              # Reportes generados
```

---

## Tecnologias

| Tecnologia | Para que |
|------------|----------|
| Playwright | Automatizacion de navegador |
| TypeScript | Codigo tipado |
| Claude API | LLM-as-Judge |
| Express | API REST |
| Grafana | Dashboard de metricas |
| Prometheus | Base de datos de metricas |
| Allure | Reportes interactivos |
| PDFKit | Generacion de PDF |
| GitHub Actions | CI/CD |
| Docker | Infraestructura |

---

## Autor

**Elyer Maldonado** - QA Lead | AI Testing Specialist

- GitHub: [@E-Gregorio](https://github.com/E-Gregorio)
- Framework: [INGRID](https://github.com/E-Gregorio/ingrid-AI-framework)

---

## Licencia

MIT License - Ver [LICENSE](LICENSE) para mas detalles.

Copyright (c) 2024-2025 Elyer Maldonado
