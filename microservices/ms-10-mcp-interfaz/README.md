# MS-10: MCP Interfaz (Integration Hub)

## Puerto: 5000
## Rol: Conecta QASL NEXUS LLM con herramientas externas del cliente

## Conectores disponibles

| Herramienta | Que hace | Archivo |
|-------------|----------|---------|
| Jira | Crea bugs, issues, links bidireccionales | jira.connector.ts |
| X-Ray | Importa test cases, reporta ejecuciones | xray.connector.ts |
| TestRail | Crea test cases, runs, resultados | testrail.connector.ts |
| Azure DevOps | Crea work items (bugs), links | azure-devops.connector.ts |

## Flujo de creacion de bugs (7 pasos)

```
MS-03/04/06 detecta fallo → POST /api/mcp/bug/create
  │
  ├─ Paso 1: Fetch template de MS-01
  ├─ Paso 2: Query trazabilidad en MS-12 (TC → TS → US → Epic)
  ├─ Paso 3: MS-09 genera descripcion con IA
  ├─ Paso 4: Construye payload del bug
  ├─ Paso 5: Crea issue en Jira/Azure DevOps
  ├─ Paso 6: Crea links bidireccionales
  └─ Paso 7: Guarda referencia en MS-12 (defect.jira_key)
```

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/mcp/bug/create | Flujo completo 7 pasos |
| POST | /api/mcp/jira/issue | Crea issue directo en Jira |
| GET | /api/mcp/jira/issue/:key | Obtiene estado de issue |
| POST | /api/mcp/xray/execution | Importa ejecucion a X-Ray |
| POST | /api/mcp/testrail/result | Reporta resultado a TestRail |
| POST | /api/mcp/azure/bug | Crea bug en Azure DevOps |
| GET | /api/mcp/connectors/status | Estado de conectores |
| GET | /api/mcp/health | Health check |

## Ejemplo: Test falla en MS-03 y se crea bug automatico

```bash
curl -X POST http://localhost:5000/api/mcp/bug/create \
  -H "Content-Type: application/json" \
  -d '{
    "tc_id": "TC-001",
    "ts_id": "HU_SGINC_02_TS01",
    "us_id": "HU_SGINC_02",
    "titulo_tc": "Validar acceso con perfil CARGA",
    "resultado_esperado": "Usuario accede al modulo",
    "resultado_real": "Error 403 Forbidden",
    "pasos": ["Autenticar usuario", "Navegar al modulo", "Click en acceder"],
    "modulo": "Alta de Inconsistencias",
    "ambiente": "QA",
    "source_ms": "ms-03"
  }'
```

## Estructura

```
ms-10-mcp-interfaz/
├── src/
│   ├── server.ts
│   ├── config/
│   │   └── database.ts
│   ├── connectors/
│   │   ├── jira.connector.ts
│   │   ├── xray.connector.ts
│   │   ├── testrail.connector.ts
│   │   └── azure-devops.connector.ts
│   ├── services/
│   │   └── bug-creation-flow.ts    # Flujo 7 pasos
│   ├── routes/
│   │   └── mcp.routes.ts
│   └── types/
│       └── index.ts
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```
