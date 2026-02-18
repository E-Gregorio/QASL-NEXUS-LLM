# INGRID - API REST Guide

## Descripción

INGRID expone una API REST que permite ejecutar tests y obtener resultados de forma remota. Esto facilita la integración con cualquier sistema externo, dashboards personalizados, o pipelines de CI/CD.

---

## Iniciar el Servidor

```bash
# Producción
npm run api

# Desarrollo (auto-reload)
npm run api:dev
```

El servidor inicia en `http://localhost:4000` por defecto.

Para cambiar el puerto:
```bash
API_PORT=5000 npm run api
```

---

## Endpoints

### Health Check

```http
GET /health
```

**Respuesta:**
```json
{
  "status": "ok",
  "service": "INGRID API",
  "version": "2.0.0",
  "timestamp": "2024-12-18T10:30:00.000Z",
  "uptime": 3600,
  "activeJobs": 0
}
```

---

### Listar Suites de Tests

```http
GET /api/v1/suites
```

**Respuesta:**
```json
{
  "success": true,
  "suites": [
    { "id": "all", "name": "All Tests", "description": "Ejecuta todos los tests" },
    { "id": "functional", "name": "Functional", "description": "Tests funcionales del chatbot" },
    { "id": "security", "name": "Security (OWASP)", "description": "Tests de seguridad OWASP LLM Top 10" },
    { "id": "performance", "name": "Performance", "description": "Tests de rendimiento" },
    { "id": "api", "name": "API Tests", "description": "Tests de API multi-modelo" },
    { "id": "smoke", "name": "Smoke", "description": "Tests rápidos de verificación" }
  ]
}
```

---

### Ejecutar Tests

```http
POST /api/v1/run
Content-Type: application/json

{
  "suite": "security",
  "chatbotUrl": "https://mi-chatbot.com",
  "generatePdf": true
}
```

**Parámetros:**
| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `suite` | string | `all` | Suite a ejecutar: all, functional, security, performance, api, smoke |
| `chatbotUrl` | string | env | URL del chatbot (override de CHATBOT_URL) |
| `generatePdf` | boolean | `true` | Generar reporte PDF al finalizar |

**Respuesta:**
```json
{
  "success": true,
  "message": "Tests iniciados",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "suite": "Security (OWASP)",
  "statusUrl": "/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Estado de un Job

```http
GET /api/v1/jobs/:id
```

**Respuesta:**
```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "suite": "security",
    "status": "completed",
    "startTime": "2024-12-18T10:30:00.000Z",
    "endTime": "2024-12-18T10:35:00.000Z",
    "result": {
      "total": 18,
      "passed": 16,
      "failed": 2,
      "skipped": 0,
      "duration": 300000
    },
    "pdfGenerated": true,
    "pdfPath": "INGRID-Report-2024-12-18.pdf"
  }
}
```

**Estados posibles:**
- `running` - Tests en ejecución
- `completed` - Tests finalizados exitosamente
- `failed` - Tests finalizados con errores

---

### Output de un Job

```http
GET /api/v1/jobs/:id/output
```

**Respuesta:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": "Running 18 tests using 1 worker..."
}
```

---

### Listar Todos los Jobs

```http
GET /api/v1/jobs
```

**Respuesta:**
```json
{
  "success": true,
  "total": 5,
  "jobs": [
    {
      "id": "...",
      "suite": "security",
      "status": "completed",
      "startTime": "...",
      "endTime": "...",
      "result": { ... }
    }
  ]
}
```

---

### Últimos Resultados

```http
GET /api/v1/results
```

**Respuesta:**
```json
{
  "success": true,
  "summary": {
    "total": 18,
    "passed": 16,
    "failed": 2,
    "skipped": 0,
    "duration": 300000,
    "passRate": "88.9%"
  },
  "suites": [
    { "title": "OWASP LLM Top 10 Security Tests", "tests": 10 },
    { "title": "Chatbot Functional Tests", "tests": 8 }
  ]
}
```

---

### Métricas LLM-as-Judge

```http
GET /api/v1/metrics
```

**Respuesta:**
```json
{
  "success": true,
  "metrics": {
    "totalEvaluations": 18,
    "averageScores": {
      "relevance": "8.2",
      "accuracy": "7.8",
      "helpfulness": "8.5",
      "safety": "9.1",
      "coherence": "8.0"
    },
    "owaspResults": { ... },
    "lastUpdated": "2024-12-18T10:35:00.000Z"
  }
}
```

---

### Descargar Reporte PDF

```http
GET /api/v1/report
```

Descarga el último PDF generado.

---

### Info del Reporte

```http
GET /api/v1/report/info
```

**Respuesta:**
```json
{
  "success": true,
  "report": {
    "name": "INGRID-Report-2024-12-18.pdf",
    "size": 156789,
    "sizeHuman": "153.1 KB",
    "created": "2024-12-18T10:35:00.000Z",
    "downloadUrl": "/api/v1/report"
  }
}
```

---

### Generar PDF Manualmente

```http
POST /api/v1/report/generate
```

**Respuesta:**
```json
{
  "success": true,
  "message": "PDF generado exitosamente",
  "report": {
    "name": "INGRID-Report-2024-12-18.pdf",
    "downloadUrl": "/api/v1/report"
  }
}
```

---

### Eliminar Job

```http
DELETE /api/v1/jobs/:id
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Job eliminado"
}
```

---

## Ejemplos de Uso

### cURL

```bash
# Health check
curl http://localhost:4000/health

# Ejecutar tests de seguridad
curl -X POST http://localhost:4000/api/v1/run \
  -H "Content-Type: application/json" \
  -d '{"suite": "security"}'

# Ver estado del job
curl http://localhost:4000/api/v1/jobs/JOB_ID

# Descargar PDF
curl -o report.pdf http://localhost:4000/api/v1/report
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API = 'http://localhost:4000';

async function runTests() {
  // Ejecutar tests
  const { data } = await axios.post(`${API}/api/v1/run`, {
    suite: 'security',
    generatePdf: true
  });

  console.log('Job iniciado:', data.jobId);

  // Polling del estado
  let job;
  do {
    await new Promise(r => setTimeout(r, 5000)); // Esperar 5s
    const response = await axios.get(`${API}/api/v1/jobs/${data.jobId}`);
    job = response.data.job;
    console.log('Estado:', job.status);
  } while (job.status === 'running');

  // Resultados
  console.log('Resultados:', job.result);
}

runTests();
```

### Python

```python
import requests
import time

API = "http://localhost:4000"

# Ejecutar tests
response = requests.post(f"{API}/api/v1/run", json={
    "suite": "security",
    "generatePdf": True
})

job_id = response.json()["jobId"]
print(f"Job iniciado: {job_id}")

# Polling
while True:
    status = requests.get(f"{API}/api/v1/jobs/{job_id}").json()
    if status["job"]["status"] != "running":
        break
    time.sleep(5)

print(f"Resultado: {status['job']['result']}")
```

---

## Integración con CI/CD

### GitHub Actions

```yaml
- name: Run INGRID Tests via API
  run: |
    # Iniciar API en background
    npm run api &
    sleep 3

    # Ejecutar tests
    JOB=$(curl -s -X POST http://localhost:4000/api/v1/run \
      -H "Content-Type: application/json" \
      -d '{"suite": "security"}' | jq -r '.jobId')

    # Esperar resultado
    while true; do
      STATUS=$(curl -s http://localhost:4000/api/v1/jobs/$JOB | jq -r '.job.status')
      [ "$STATUS" != "running" ] && break
      sleep 10
    done

    # Verificar resultado
    FAILED=$(curl -s http://localhost:4000/api/v1/jobs/$JOB | jq '.job.result.failed')
    [ "$FAILED" -gt 0 ] && exit 1
```

---

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `API_PORT` | `4000` | Puerto del servidor API |
| `CHATBOT_URL` | `http://localhost:3000` | URL base del chatbot |
| `ANTHROPIC_API_KEY` | - | API key para LLM-as-Judge |

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 202 | Job aceptado (tests en ejecución) |
| 400 | Request inválido (suite no existe, etc.) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

*INGRID AI Testing Framework - API Guide v2.0*
