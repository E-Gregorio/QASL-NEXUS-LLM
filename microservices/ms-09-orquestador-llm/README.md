# MS-09: Orquestador LLM

## Puerto: 8000
## Rol: Cerebro Multi-LLM de QASL NEXUS LLM

## Que hace
- Decision Engine: decide que LLM usar segun la tarea
- VCR Calculator: calcula Value + Cost + Risk con IA
- Template Filler: llena plantillas ISTQB con contexto IA
- Bug Description: genera descripciones de bugs para Jira

## Decision Engine - Que LLM para que tarea

| Tarea | LLM | Razon |
|-------|-----|-------|
| Analisis de gaps | Claude | Mejor razonamiento logico |
| Calculo VCR | Claude | Mejor evaluacion de riesgo |
| Llenar templates | Claude | Mejor formato estructurado |
| Descripcion de bugs | Claude | Descripciones tecnicas precisas |
| Generacion de tests | OpenAI GPT | Edge cases creativos |
| Generacion de test data | OpenAI GPT | Datos variados y realistas |
| Mapeo de campos | OpenAI GPT Mini | Tarea simple, modelo economico |
| Analisis de screenshots | Gemini | Capacidad multimodal |

## API Endpoints

| Metodo | Ruta | Descripcion | Usado por |
|--------|------|-------------|-----------|
| POST | /api/llm/process | Procesa tarea con LLM automatico | MS-02, MS-04, MS-05, MS-10 |
| POST | /api/llm/vcr/calculate | Calcula VCR y guarda en MS-12 | MS-02, MS-08 |
| POST | /api/llm/template/fill-bug | Genera informe de bug con IA | MS-10 |
| POST | /api/llm/template/fill | Llena plantilla generica | MS-10 |
| GET | /api/llm/health | Health check + estado de providers | Todos |

## Ejemplos de uso

### Analizar gaps en una HU (MS-02 llama a MS-09):
```bash
curl -X POST http://localhost:8000/api/llm/process \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "gap_analysis",
    "prompt": "Analiza gaps en esta HU",
    "context": "HU_SGINC_02: Alta de Inconsistencias..."
  }'
```

### Calcular VCR (MS-08 llama a MS-09):
```bash
curl -X POST http://localhost:8000/api/llm/vcr/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "us_id": "HU_SGINC_02",
    "nombre_hu": "Alta de Inconsistencias",
    "prioridad": "Alta - MVP 1",
    "criterios_aceptacion": "E1: DADO que...",
    "reglas_negocio": "BR1: Solo usuarios con perfil CARGA..."
  }'
```

## Levantar

```bash
# Instalar dependencias
npm install

# Desarrollo (hot reload)
npm run dev

# Produccion
npm run build && npm start

# Docker
docker-compose up -d
```

## Variables de entorno requeridas

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| ANTHROPIC_API_KEY | API key de Claude | Minimo 1 de las 3 |
| OPENAI_API_KEY | API key de OpenAI | Minimo 1 de las 3 |
| GOOGLE_AI_API_KEY | API key de Gemini | Minimo 1 de las 3 |
| DB_HOST | Host de PostgreSQL (MS-12) | Si |
| DB_PORT | Puerto PostgreSQL | Si (default: 5432) |
| DB_NAME | Nombre de la BD | Si (default: qasl_nexus) |

## Estructura

```
ms-09-orquestador-llm/
├── src/
│   ├── server.ts              # Express server (puerto 8000)
│   ├── config/
│   │   ├── database.ts        # Conexion a MS-12 (PostgreSQL)
│   │   └── llm-rules.ts       # Reglas del Decision Engine
│   ├── services/
│   │   ├── decision-engine.ts  # Decide que LLM usar
│   │   ├── llm-providers.ts    # Conexiones Claude/OpenAI/Gemini
│   │   ├── vcr-calculator.ts   # Calcula VCR con IA
│   │   └── template-filler.ts  # Llena templates con IA
│   ├── routes/
│   │   └── llm.routes.ts      # API endpoints
│   └── types/
│       └── index.ts           # TypeScript types
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```
