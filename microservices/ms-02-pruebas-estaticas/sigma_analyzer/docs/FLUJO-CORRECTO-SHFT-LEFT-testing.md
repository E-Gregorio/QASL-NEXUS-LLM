# Flujo Shift-Left Testing - QASL NEXUS LLM

## Contexto

QASL NEXUS LLM implementa Shift-Left Testing: detectar defectos ANTES del desarrollo,
analizando Historias de Usuario con Claude AI y generando trazabilidad completa en PostgreSQL.

**Estandares:** ISTQB CTFL v4.0 | IEEE 829 (Test Documentation) | IEEE 830 (Requirements) | ISO 29119

---

## Flujo Completo del Proceso

```
1. HU Original (Analista Funcional / Product Owner)
   Archivo: HU_Original/HU_XXX_01.html (formato ISTQB)
   Contenido: BRs, Escenarios Gherkin, VCR, Scope
   |
   v
2. Analisis Estatico (MS-02 - run_analysis.py)
   Motor: Claude AI (Anthropic SDK)
   Accion: Parsear HU + Analisis semantico de cobertura
   Detecta: Gaps (CRITICO/ALTO/MEDIO/BAJO)
   Genera: Escenarios sugeridos en formato Gherkin
   |
   v
3. Artefactos Generados (locales)
   |
   ├── reportes/HU_XXX_01_REPORT.md
   |   Semaforo de estado, matriz cobertura, lista de gaps
   |
   ├── hu_actualizadas/HU_XXX_01_ACTUALIZADA.html
   |   HU con escenarios originales + sugeridos (100% cobertura)
   |
   └── metricas_globales.json
       Metricas acumuladas de todas las HUs analizadas
   |
   v
4. Trazabilidad en Base de Datos (MS-02 --> MS-12)
   Motor: db_writer.py --> PostgreSQL (MS-12)
   |
   ├── epic                      Epica de la HU
   ├── user_story                HU con VCR, BRs, escenarios
   ├── static_analysis_gap       Gaps detectados por Claude AI
   ├── test_suite (x3)           Positivos | Negativos | Seguridad-OWASP
   ├── precondition (x3)         Autenticacion | Datos | Navegacion
   ├── test_case                 1 TC por escenario (original + sugerido)
   ├── test_case_step            DADO -> datos | CUANDO -> accion | ENTONCES -> resultado
   ├── precondition_test_case    Relacion M2M (PRC <-> TC)
   └── vcr_score                 Auto-calculado por trigger PostgreSQL
   |
   v
5. Consumo por otros Microservicios
   |
   ├── MS-03 Pruebas Funcionales   Lee TCs para ejecutar con Playwright
   ├── MS-04 Pruebas API            Lee TCs tipo API para Newman/Postman
   ├── MS-06 Pruebas Performance    Lee HUs para escenarios K6
   ├── MS-07 Pruebas Seguridad      Lee gaps OWASP para ZAP
   ├── MS-09 Reportes               Lee vistas para Allure/PDF
   └── MS-11 Dashboard              Lee metricas para Grafana
```

---

## Diagrama de Trazabilidad

```
EPIC
  |
  └── USER_STORY (HU)
       |
       ├── STATIC_ANALYSIS_GAP (N gaps)
       |   - tipo: CRITICO | ALTO | MEDIO | BAJO
       |   - descripcion, recomendacion, br_afectada
       |
       ├── TEST_SUITE (3 suites por HU)
       |   |
       |   ├── TS-01: Escenarios Positivos (Funcional)
       |   ├── TS-02: Escenarios Negativos (Funcional - Negativa)
       |   └── TS-03: Escenarios Seguridad (OWASP)
       |       |
       |       └── TEST_CASE (1 por escenario)
       |            |
       |            └── TEST_CASE_STEP (N pasos)
       |                - DADO que... -> datos_entrada
       |                - CUANDO...   -> paso_accion
       |                - ENTONCES... -> resultado_esperado
       |
       ├── PRECONDITION (3 PRCs por HU)
       |   ├── PRC-01: Autenticacion (usuario logueado)
       |   ├── PRC-02: Datos (registros en BD)
       |   └── PRC-03: Navegacion (modulo accesible)
       |       |
       |       └── PRECONDITION_TEST_CASE (M2M)
       |           Cada PRC se asocia a los TCs que la requieren
       |
       └── VCR_SCORE (1 por TC)
           - valor (1-3) + costo (1-3) + riesgo (prob x impacto)
           - total = valor + costo + riesgo
           - decision: AUTOMATIZAR (>=9) | MANUAL (<9)
           - Calculado automaticamente por trigger PostgreSQL
```

---

## Clasificacion Automatica de Escenarios

MS-02 clasifica cada escenario en una suite basandose en palabras clave:

| Suite | Categoria | Palabras Clave |
|-------|-----------|----------------|
| TS-01 | Positivos | exitoso, correcto, valido, satisfactorio, permite |
| TS-02 | Negativos | error, invalido, fallido, rechazo, incorrecto, falla |
| TS-03 | Seguridad-OWASP | seguridad, inyeccion, XSS, SQL, bloqueo, CSRF, OWASP |

Si un escenario no coincide con ninguna, va a TS-01 (Positivos) por defecto.

---

## Mapeo Gherkin a Test Case Steps

Cada escenario en formato Gherkin se mapea a pasos de TC:

| Gherkin | Campo en test_case_step |
|---------|------------------------|
| DADO que... | `datos_entrada` (paso_numero = 1) |
| CUANDO... | `paso_accion` (paso_numero = 2) |
| ENTONCES... | `resultado_esperado` (paso_numero = 3) |

---

## Metodologia VCR (Value-Cost-Risk)

Extraido de la HU y almacenado en `user_story` + `vcr_score`:

```
VCR Total = Valor + Costo + Riesgo

Valor (1-3):    Impacto de negocio de la funcionalidad
Costo (1-3):    Esfuerzo de automatizar las pruebas
Riesgo:         Probabilidad (1-3) x Impacto (1-3)

Decision:
  VCR >= 9  -->  AUTOMATIZAR (deuda tecnica, regresion critica)
  VCR < 9   -->  MANUAL (bajo riesgo, esfuerzo no justificado)
```

El trigger de PostgreSQL calcula automaticamente:
- `riesgo = prob_riesgo * impacto_riesgo`
- `vcr_total = valor + costo + riesgo`
- `decision = CASE WHEN vcr_total >= 9 THEN 'AUTOMATIZAR' ELSE 'MANUAL' END`

---

## Cobertura de Reglas de Negocio

### Objetivo: 100% Cobertura
Por cada Regla de Negocio (BR):
- Minimo 1 escenario POSITIVO (caso feliz)
- Minimo 1 escenario NEGATIVO (rechazo/error)
- Opcional: 1 escenario LIMITE (valores frontera)

### Semaforo
| Cobertura | Estado | Accion |
|-----------|--------|--------|
| >= 80% | VERDE | Aprobado |
| 50-79% | AMARILLO | Requiere revision |
| < 50% | ROJO | Requiere accion inmediata |

---

## Formato de HU Original (Input)

Las HUs deben estar en `HU_Original/` en formato HTML con estructura ISTQB:

```html
<h2>Informacion General</h2>
  ID, Nombre, Epica, Prioridad, Estado

<h2>Reglas de Negocio</h2>
  BR1: Descripcion...
  BR2: Descripcion...

<h2>Escenarios / Criterios de Aceptacion</h2>
  E1 - Titulo:
    DADO QUE...
    CUANDO...
    ENTONCES...

<h2>Estimaciones</h2>
  Valor: X | Costo: X | Probabilidad Riesgo: X | Impacto Riesgo: X
```

---

## UPSERT e Idempotencia

`db_writer.py` usa `ON CONFLICT ... DO UPDATE` en todas las tablas.
Esto permite re-ejecutar el analisis sobre la misma HU sin duplicar datos:

```python
INSERT INTO user_story (id_hu, nombre_hu, epic_id, ...)
VALUES (%s, %s, %s, ...)
ON CONFLICT (id_hu) DO UPDATE SET
  nombre_hu = EXCLUDED.nombre_hu,
  ...
```

---

## Ejecucion

```bash
# Desde sigma_analyzer/
python run_analysis.py HU_LOGIN_01          # 1 HU con BD
python run_analysis.py --all                # Todas las HUs
python run_analysis.py HU_LOGIN_01 --no-db  # Sin BD (solo archivos)
```

---

## Vistas SQL para Consulta

| Vista | Proposito |
|-------|-----------|
| `v_traceability` | Epic -> HU -> Suite -> TC completa |
| `v_test_coverage` | Cobertura y % automatizado por HU |
| `v_pending_gaps` | Gaps estaticos pendientes de resolver |
| `v_technical_debt` | VCR >= 9 sin automatizar aun |
| `v_pass_rate` | Tasa de aprobacion por suite |
| `v_defect_summary` | Resumen de defectos por severidad |
| `v_pipeline_metrics` | Metricas de pipeline CI/CD |
| `v_executive_summary` | Resumen ejecutivo para reportes PDF |

---

## Verificacion en pgAdmin

```
QASL NEXUS (servidor)
  └── qasl_nexus (base de datos)
       └── Esquemas
            └── public
                 ├── Tablas    --> Click derecho --> View/Edit Data --> All Rows
                 └── Vistas    --> Click derecho --> View/Edit Data --> All Rows
```

---

*QASL NEXUS LLM - MS-02 Pruebas Estaticas*
*Shift-Left Testing (ISTQB CTFL v4.0)*
*Fecha: 2026-02-18*
