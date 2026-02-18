# MS-08: CI/CD Pipeline

## Puerto: 8888
## Rol: Director de orquesta - ejecuta pipelines completos

## Pipeline de 3 fases (~30 min)

```
FASE 1 - Analisis (5 min):
├── MS-02: Analisis estatico de HUs
└── MS-09: Calculo VCR

FASE 2 - Ejecucion (20 min, en paralelo):
├── MS-03: E2E + API + K6 + ZAP
├── MS-04: Mobile tests
└── MS-06: Garak LLM security scan

FASE 3 - Reportes (5 min):
├── MS-11: Notifica resultado (Slack/Teams/Email)
├── MS-10: Crea bugs en Jira para failures
└── MS-07: Dashboards actualizados (lee MS-12)
```

## Tipos de pipeline

| Tipo | Que ejecuta |
|------|-------------|
| full | Todo (MS-02 + MS-03 + MS-04 + MS-06 + MS-09 + MS-10 + MS-11) |
| regression | MS-02 + MS-03 + MS-09 |
| smoke | MS-03 (solo tests criticos) |
| security | MS-06 (Garak LLM scan) |
| mobile | MS-04 (Maestro tests) |

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/pipeline/run | Ejecuta pipeline (async) |
| GET | /api/pipeline/status/:id | Estado de un pipeline |
| GET | /api/pipeline/history | Historial de ejecuciones |
| GET | /api/pipeline/health | Health check de todos los MS |

## Ejemplo

```bash
# Ejecutar pipeline full
curl -X POST http://localhost:8888/api/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"type": "full", "triggerType": "manual", "triggeredBy": "qa-lead"}'

# Ver estado
curl http://localhost:8888/api/pipeline/status/PL-XXXXXX

# Health check (verifica todos los MS)
curl http://localhost:8888/api/pipeline/health
```

## Estructura

```
ms-08-cicd-pipeline/
├── src/
│   ├── server.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── microservices.ts       # URLs de todos los MS
│   ├── services/
│   │   └── pipeline-executor.ts   # Ejecutor de 3 fases
│   ├── routes/
│   │   └── pipeline.routes.ts
│   └── types/
├── docker/ + docker-compose.yml
├── .env.example
└── README.md
```
