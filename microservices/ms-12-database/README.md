# MS-12: Database (PostgreSQL)

## Puerto: 5432

## Rol
Single Source of Truth de toda la plataforma QASL NEXUS LLM.
Todos los microservicios escriben y leen de esta base de datos.

## Levantar

```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar PostgreSQL + pgAdmin
docker-compose up -d

# Verificar que esta corriendo
docker-compose ps
```

## Acceso

| Servicio | URL | Credenciales |
|----------|-----|-------------|
| PostgreSQL | localhost:5432 | qasl_admin / qasl_nexus_2026 |
| pgAdmin | http://localhost:5050 | admin@qaslnexus.io / admin2026 |

## Connection String

```
postgresql://qasl_admin:qasl_nexus_2026@localhost:5432/qasl_nexus
```

## Esquema

### 15 Tablas

| Tabla | Descripcion | Quien ESCRIBE | Quien LEE |
|-------|-------------|---------------|-----------|
| epic | Epicas del proyecto | MS-02 | MS-10, MS-11 |
| user_story | Historias de Usuario con VCR | MS-02 | MS-09, MS-10, MS-11 |
| test_suite | Suites agrupadas por funcionalidad | MS-02, MS-05 | MS-03, MS-04 |
| test_case | Casos de prueba (header) | MS-02, MS-05 | MS-03, MS-04, MS-06 |
| test_case_step | Pasos separados por TC | MS-02 | MS-03, MS-04 |
| precondition | Precondiciones reutilizables | MS-02 | MS-03, MS-04 |
| precondition_test_case | Relacion PRC-TC (N:N) | MS-02 | MS-03 |
| defect | Bugs (ISTQB/IEEE 829) | MS-03, MS-04, MS-06 | MS-10, MS-11 |
| test_execution | Resultados de ejecucion | MS-03, MS-04, MS-06 | MS-07, MS-11 |
| vcr_score | Scores VCR calculados por IA | MS-09 | MS-03, MS-08 |
| metric | Metricas extraidas de reportes | MS-03, MS-04, MS-06 | MS-07, MS-11 |
| static_analysis_gap | Gaps detectados en HUs | MS-02 | MS-09, MS-11 |
| report | Reportes generados | MS-11 | MS-07 |
| notification | Notificaciones enviadas | MS-11 | MS-07 |
| pipeline_run | Ejecuciones de CI/CD | MS-08 | MS-07, MS-11 |

### 8 Views

| View | Para que sirve |
|------|---------------|
| v_test_coverage | Cobertura de TCs por User Story |
| v_pass_rate | Pass rate por suite y fuente |
| v_technical_debt | TCs con VCR >= 9 sin automatizar |
| v_defect_summary | Resumen de bugs por severidad/estado |
| v_traceability | Trazabilidad Epic > US > TS > TC |
| v_pending_gaps | Gaps de analisis estatico pendientes |
| v_pipeline_metrics | Metricas de ejecuciones CI/CD |
| v_executive_summary | Resumen ejecutivo para reportes PDF |

### Triggers

- Auto-update de `updated_at` en todas las tablas
- Auto-calculo de VCR (riesgo = probabilidad x impacto, decision = AUTOMATIZAR si >= 9)
- Auto-calculo de pass_rate en pipeline_run

## Estructura de archivos

```
ms-12-database/
├── sql/
│   ├── 01_schema.sql      # 15 tablas
│   ├── 02_indexes.sql      # Indexes de performance
│   ├── 03_views.sql        # 8 views para dashboards
│   └── 04_triggers.sql     # Triggers automaticos
├── docker-compose.yml       # PostgreSQL + pgAdmin
├── .env.example             # Variables de entorno
└── README.md
```
