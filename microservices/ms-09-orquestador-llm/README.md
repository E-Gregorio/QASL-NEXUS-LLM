# MS-09: Orquestador LLM

## Puerto: 8000
## Rol: Cerebro Multi-LLM de QASL NEXUS LLM

## Que hace
- Decision Engine: decide que LLM usar segun la tarea
- VCR Calculator: calcula Value + Cost + Risk con IA
- Template Filler: llena plantillas ISTQB con contexto IA
- Bug Description: genera descripciones de bugs para Jira

## Decision Engine - Estrategia Multi-LLM Optimizada

### Opus (Tareas criticas - razonamiento profundo)

| Tarea | Modelo | Razon |
|-------|--------|-------|
| Analisis de gaps | claude-opus-4-6 | Razonamiento profundo para detectar gaps que otros modelos no ven |
| Calculo VCR | claude-opus-4-6 | Evaluacion precisa de riesgo/valor, un VCR mal calculado es costoso |
| Generacion de tests | claude-opus-4-6 | Cobertura exhaustiva de edge cases y escenarios criticos |

### Sonnet (Tareas estructuradas - velocidad > profundidad)

| Tarea | Modelo | Razon |
|-------|--------|-------|
| Descripcion de bugs | claude-sonnet-4-5 | Redaccion tecnica precisa, no requiere razonamiento profundo |
| Llenar templates | claude-sonnet-4-5 | Tarea mecanica de llenar campos estructurados |
| Generacion de test data | claude-sonnet-4-5 | Datos variados, no necesita razonamiento complejo |
| Mapeo de campos | claude-sonnet-4-5 | Mapeo simple entre sistemas |

### Gemini (Vision multimodal)

| Tarea | Modelo | Razon |
|-------|--------|-------|
| Analisis de screenshots | gemini-2.5-pro | Mejor vision multimodal para analisis de UI/screenshots |

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
    "context": "HU_LOGIN_01: Inicio de sesion con email y contrasena..."
  }'
```

### Calcular VCR (MS-08 llama a MS-09):
```bash
curl -X POST http://localhost:8000/api/llm/vcr/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "us_id": "HU_LOGIN_01",
    "nombre_hu": "Inicio de Sesion",
    "prioridad": "Alta - MVP 1",
    "criterios_aceptacion": "E1: DADO que...",
    "reglas_negocio": "BR1: Solo usuarios con perfil activo..."
  }'
```

## Levantar

```bash
// Instalar dependencias
npm install

// Desarrollo (hot reload)
npm run dev

// Produccion
npm run build && npm start

// Docker
docker-compose up -d
```

## Variables de entorno requeridas

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| ANTHROPIC_API_KEY | API key de Claude (Opus + Sonnet) | Si |
| OPENAI_API_KEY | API key de OpenAI | Opcional (fallback) |
| GOOGLE_AI_API_KEY | API key de Gemini | Si (para screenshots) |
| DB_HOST | Host de PostgreSQL (MS-12) | Si |
| DB_PORT | Puerto PostgreSQL | Si (default: 5432) |
| DB_NAME | Nombre de la BD | Si (default: qasl_nexus) |

## Estructura

```
ms-09-orquestador-llm/
├── src/
│   ├── server.ts              // Express server (puerto 8000)
│   ├── config/
│   │   ├── database.ts        // Conexion a MS-12 (PostgreSQL)
│   │   └── llm-rules.ts       // Reglas del Decision Engine (Opus/Sonnet/Gemini)
│   ├── services/
│   │   ├── decision-engine.ts  // Decide que LLM usar
│   │   ├── llm-providers.ts    // Conexiones Claude/OpenAI/Gemini
│   │   ├── vcr-calculator.ts   // Calcula VCR con IA
│   │   └── template-filler.ts  // Llena templates con IA
│   ├── routes/
│   │   └── llm.routes.ts      // API endpoints
│   └── types/
│       └── index.ts           // TypeScript types
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```
