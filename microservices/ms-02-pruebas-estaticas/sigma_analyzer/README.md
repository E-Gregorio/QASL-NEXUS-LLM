# MS-02 Pruebas Estaticas - QASL NEXUS LLM

Microservicio de analisis estatico de Historias de Usuario (HU) para deteccion de brechas de cobertura, generacion de escenarios de prueba y trazabilidad completa en base de datos, siguiendo la metodologia Shift-Left Testing y estandares ISTQB/IEEE.

**Plataforma:** QASL NEXUS LLM - QA con 12 Microservicios + Multi-LLM
**Metodologia:** Shift-Left Testing (ISTQB CTFL v4.0 Cap. 3)
**Estandares:** IEEE 829, IEEE 830, ISO/IEC 29119
**LLM:** Claude AI (Anthropic) - Analisis semantico de HUs

---

## ARQUITECTURA

```
MS-02 Pruebas Estaticas (Camino A - Standalone)

  HU_Original/           Anthropic API            MS-12 PostgreSQL
  (.html ISTQB)    -->   Claude AI          -->   (Single Source of Truth)
       |                     |                          |
   [1] Parser         [2] RTMAnalyzerAI          [5] DBWriter
       |                     |                          |
   parse_hu()          analizar()               guardar_analisis()
       |                     |                          |
       v                     v                          v
   HU object          resultado dict            9 tablas pobladas
                             |
                    [3] ReportGenerator
                    [4] HUIdealHTMLGenerator
                             |
                             v
                    reportes/ + hu_actualizadas/
```

### Conexion MS-02 --> MS-12

MS-02 escribe directamente en MS-12 PostgreSQL via `db_writer.py`:

| Tabla | Contenido |
|-------|-----------|
| `epic` | Epica de la HU |
| `user_story` | HU con VCR, BRs, escenarios |
| `static_analysis_gap` | Gaps detectados por Claude AI |
| `test_suite` | 3 suites: Positivos, Negativos, Seguridad-OWASP |
| `precondition` | 3 PRCs: Autenticacion, Datos, Navegacion |
| `test_case` | 1 TC por escenario (original + sugerido) |
| `test_case_step` | Pasos Gherkin: DADO/CUANDO/ENTONCES |
| `precondition_test_case` | Relacion M2M entre PRCs y TCs |
| `vcr_score` | VCR auto-calculado por trigger PostgreSQL |

---

## FLUJO DE EJECUCION (5 pasos)

```
[1/5] Parsear HU          --> parser.py (HTML/Markdown)
[2/5] Analisis Claude AI   --> rtm_analyzer_ai.py (gaps, coberturas, escenarios)
[3/5] Generar Reporte      --> report_generator.py (Markdown con semaforo)
[4/5] Generar HU Actualizada --> hu_ideal_html_generator.py (HTML ISTQB)
[5/5] Guardar en BD        --> db_writer.py (9 tablas MS-12 PostgreSQL)
```

---

## USO

### Requisitos Previos

```bash
# Python 3.8+
python --version

# Instalar dependencias
pip install -r requirements.txt

# Docker (MS-12 PostgreSQL)
cd ../../ms-12-database
docker-compose up -d
```

### Configuracion (.env)

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
DATABASE_URL=postgresql://qasl_admin:qasl_nexus_2026@localhost:5432/qasl_nexus
```

### Comandos de Ejecucion

```bash
# Analizar una HU especifica (con BD)
python run_analysis.py HU_LOGIN_01

# Analizar multiples HUs
python run_analysis.py HU_LOGIN_01 HU_CART_01 HU_PAY_01

# Analizar todas las HUs en HU_Original/
python run_analysis.py --all

# Sin conexion a BD (solo archivos locales)
python run_analysis.py HU_LOGIN_01 --no-db
```

### Output esperado

```
============================================================
QASL NEXUS LLM - MS-02 Pruebas Estaticas
Powered by Claude AI for semantic precision
============================================================

HUs a analizar: 1
BD (MS-12): Conectada

============================================================
Analizando: HU_LOGIN_01
============================================================
[1/5] Parseando HU...
[2/5] Ejecutando analisis RTM con Claude AI...
[3/5] Generando reporte...
[4/5] Generando HU Actualizada (formato ISTQB)...
[5/5] Guardando trazabilidad en MS-12 PostgreSQL...
   Suites: 3 | TCs: 10 | PRCs: 3 | Gaps: 7

[RESULTADOS]
   Cobertura inicial: 30.0%
   Gaps identificados: 7
   Gaps criticos: 4
   Reporte: HU_LOGIN_01_REPORT.md
   HU Actualizada: HU_LOGIN_01_ACTUALIZADA.html
   BD: Trazabilidad guardada en MS-12

============================================================
[OK] ANALISIS COMPLETADO
============================================================
```

---

## ESTRUCTURA DEL PROYECTO

```
sigma_analyzer/
├── run_analysis.py              # Orquestador principal (5 pasos)
├── parser.py                    # Parser de HUs (HTML + Markdown)
├── rtm_analyzer_ai.py           # Analizador RTM con Claude AI
├── report_generator.py          # Generador de reportes .md
├── hu_ideal_html_generator.py   # Generador de HU actualizada .html
├── db_writer.py                 # Escritor a MS-12 PostgreSQL (9 tablas)
├── generate_dashboard.py        # Generador de dashboard HTML
├── requirements.txt             # Dependencias Python
├── .env                         # API keys y conexion BD
├── metricas_globales.json       # Metricas acumuladas JSON
├── METRICAS_RESUMEN.md          # Resumen ejecutivo de metricas
├── HU_Original/                 # INPUT: HUs en formato HTML ISTQB
│   └── HU_LOGIN_01.html
├── reportes/                    # OUTPUT: Reportes de analisis (.md)
│   └── HU_LOGIN_01_REPORT.md
├── hu_actualizadas/             # OUTPUT: HUs con escenarios sugeridos (.html)
│   └── HU_LOGIN_01_ACTUALIZADA.html
├── templates/                   # Plantillas HTML
└── docs/                        # Documentacion tecnica
    └── FLUJO-CORRECTO-SHFT-LEFT-testing.md
```

---

## MODULOS

### parser.py
- `HUHTMLParser`: Parsea HUs en formato HTML (BeautifulSoup)
- `HUParser`: Parsea HUs en formato Markdown
- `parse_hu()`: Auto-detecta formato y retorna objeto `HU`

### rtm_analyzer_ai.py
- `RTMAnalyzerAI`: Envia HU a Claude AI para analisis semantico
- Detecta gaps de cobertura (CRITICO/ALTO/MEDIO/BAJO)
- Genera escenarios sugeridos en formato Gherkin
- Calcula metricas: cobertura por BR, total escenarios, VCR

### report_generator.py
- `ReportGenerator`: Genera reporte Markdown con:
  - Semaforo de estado (ROJO/AMARILLO/VERDE)
  - Matriz de cobertura BR vs Escenarios
  - Lista de gaps con severidad
  - Escenarios sugeridos

### hu_ideal_html_generator.py
- `HUIdealHTMLGenerator`: Genera HU actualizada en HTML ISTQB
  - Escenarios originales + sugeridos por Claude AI
  - Formato profesional con estilos CSS

### db_writer.py
- `DBWriter`: Conecta MS-02 con MS-12 PostgreSQL
  - `connect()`: Establece conexion via DATABASE_URL
  - `guardar_analisis()`: Inserta en 9 tablas en una transaccion
  - UPSERT (ON CONFLICT) para idempotencia en re-ejecuciones
  - VCR auto-calculado por trigger de PostgreSQL

---

## INTERPRETACION DEL REPORTE

### Semaforo de Estado
| Estado | Significado |
|--------|-------------|
| ROJO | Gaps CRITICOS detectados - Requiere accion inmediata |
| AMARILLO | Gaps ALTOS o cobertura < 50% - Requiere revision |
| VERDE | Cobertura >= 80% y sin gaps criticos |

### Severidad de Gaps
| Severidad | Descripcion |
|-----------|-------------|
| CRITICO | Bloqueante - Gaps de seguridad o funcionalidad core |
| ALTO | Importante - Funcionalidad principal sin validar |
| MEDIO | Moderado - Validaciones secundarias faltantes |
| BAJO | Menor - Mejoras de cobertura opcionales |

### Cobertura por BR
- **100%**: Tiene escenario positivo Y negativo
- **50%**: Solo tiene positivo O solo negativo
- **0%**: Sin escenarios que validen la BR

---

## TRAZABILIDAD

```
Epic --> User Story --> Test Suite --> Test Case --> Test Case Step
                   \                            /
                    --> Precondition -----------
                   \
                    --> Static Analysis Gap
                   \
                    --> VCR Score (auto-trigger)
```

### Clasificacion automatica de Suites
| Suite | Categoria | Criterio |
|-------|-----------|----------|
| TS-01 | Positivos | Escenarios con "exitoso", "correcto", "valido" |
| TS-02 | Negativos | Escenarios con "error", "invalido", "fallido", "rechazo" |
| TS-03 | Seguridad-OWASP | Escenarios con "seguridad", "inyeccion", "XSS", "bloqueo" |

### VCR (Value-Cost-Risk)
- **Valor** (1-3): Impacto de negocio
- **Costo** (1-3): Esfuerzo de automatizacion
- **Riesgo**: Probabilidad x Impacto
- **Total**: Valor + Costo + Riesgo
- **VCR >= 9**: AUTOMATIZAR | **VCR < 9**: MANUAL

---

## DEPENDENCIAS

```
anthropic>=0.40.0          # Claude AI SDK
python-dotenv>=1.0.0       # Variables de entorno
beautifulsoup4>=4.12.0     # Parser HTML
psycopg2-binary>=2.9.0     # PostgreSQL driver
```

---

## VERIFICACION EN BASE DE DATOS

### pgAdmin (localhost:5050)
```
QASL NEXUS --> qasl_nexus --> Esquemas --> public --> Tablas
```

### Consultas utiles
```sql
-- Trazabilidad completa
SELECT * FROM v_traceability;

-- Gaps pendientes
SELECT * FROM v_pending_gaps;

-- Cobertura por HU
SELECT * FROM v_test_coverage;

-- Resumen ejecutivo
SELECT * FROM v_executive_summary;
```

---

## VERSION

- **v4.0** - Shift-Left Testing con Trazabilidad en PostgreSQL (MS-12)
- **Fecha:** 2026-02-18
- **Autor:** Elyer Gregorio Maldonado
- **Plataforma:** QASL NEXUS LLM
- **Repositorio:** https://github.com/E-Gregorio/QASL-NEXUS-LLM

---

*Generado por QASL NEXUS LLM - MS-02 Pruebas Estaticas*
*Metodologia: Shift-Left Testing (ISTQB CTFL v4.0)*
