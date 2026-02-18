# SIGMA Static Analyzer v3.0

Herramienta de analisis estatico de Historias de Usuario para deteccion de brechas de cobertura y generacion de escenarios de prueba siguiendo la metodologia Shift-Left Testing y estandares ISTQB/IEEE.

**Cliente:** AGIP
**Metodologia:** Shift-Left Testing (ISTQB CTFL v4.0 Cap. 3)
**Estandares:** IEEE 829, IEEE 830, ISO/IEC 27001, ISO 9001

---

## EQUIPO QA

| Rol | Nombre |
|-----|--------|
| Tech Lead QA | Elyer Maldonado |
| QA Analyst | Kelly Ybarra |

---

## ESTADO ACTUAL - FASE 2 COMPLETADA

| HU | Nombre | Cobertura Inicial | Cobertura Final | Test Cases |
|----|--------|-------------------|-----------------|------------|
| HU_SGINC_02 | Alta de Inconsistencias | 37.5% | **100%** | 8 |
| HU_SGINC_03 | Grilla de Inconsistencias | 50.0% | **100%** | 11 |
| HU_SGINC_04 | Importar Lote | 41.7% | **100%** | 10 |
| HU_SGINC_05 | Carga Individual | 50.0% | **100%** | 8 |
| HU_SGINC_06 | Generar Expediente Lote | 37.5% | **100%** | 7 |
| HU_SGPP_01 | Gestion de Perfiles y Permisos | 14.3% | **100%** | 27 |
| HU_SGPP_02 | Nuevo Perfil | 28.6% | **100%** | 12 |

**Total Test Cases:** 83 | **Cobertura Final:** 100% | **Gaps Resueltos:** 85

---

## ARTEFACTOS GENERADOS

### Reportes y Documentacion

| Archivo | Descripcion |
|---------|-------------|
| [dashboard.html](dashboard.html) | Dashboard interactivo de metricas |
| [METRICAS_RESUMEN.md](METRICAS_RESUMEN.md) | Informe ejecutivo completo |
| [presentacion_01_pruebas_estaticas.html](presentacion_01_pruebas_estaticas.html) | Presentacion: Pruebas Estaticas (10 slides) |
| [presentacion_02_shift_left_stack.html](presentacion_02_shift_left_stack.html) | Presentacion: Shift-Left y Stack (12 slides) |
| [PROMPT_FASE2_CSV_TRAZABILIDAD.md](PROMPT_FASE2_CSV_TRAZABILIDAD.md) | Prompt para generacion de CSVs |

### HUs Actualizadas (HTML)

| Archivo | HU | Escenarios | BRs |
|---------|-----|------------|-----|
| [HU_SGINC_02_ACTUALIZADA.html](hu_actualizadas/HU_SGINC_02_ACTUALIZADA.html) | Alta de Inconsistencias | 7 | 4 |
| [HU_SGINC_03_ACTUALIZADA.html](hu_actualizadas/HU_SGINC_03_ACTUALIZADA.html) | Grilla de Inconsistencias | 11 | 5 |
| [HU_SGINC_04_ACTUALIZADA.html](hu_actualizadas/HU_SGINC_04_ACTUALIZADA.html) | Importar Lote | 10 | 6 |
| [HU_SGINC_05_ACTUALIZADA.html](hu_actualizadas/HU_SGINC_05_ACTUALIZADA.html) | Carga Individual | 8 | 4 |
| [HU_SGINC_06_ACTUALIZADA.html](hu_actualizadas/HU_SGINC_06_ACTUALIZADA.html) | Generar Expediente Lote | 7 | 4 |
| [HU_SGPP_01_ACTUALIZADA.html](hu_actualizadas/HU_SGPP_01_ACTUALIZADA.html) | Gestion de Perfiles | 27 | 14 |
| [HU_SGPP_02_ACTUALIZADA.html](hu_actualizadas/HU_SGPP_02_ACTUALIZADA.html) | Nuevo Perfil | 12 | 7 |

### Reportes de Analisis

| Archivo | HU |
|---------|-----|
| [HU_SGINC_02_REPORT.md](reportes/HU_SGINC_02_REPORT.md) | Alta de Inconsistencias |
| [HU_SGINC_03_REPORT.md](reportes/HU_SGINC_03_REPORT.md) | Grilla de Inconsistencias |
| [HU_SGINC_04_REPORT.md](reportes/HU_SGINC_04_REPORT.md) | Importar Lote |
| [HU_SGINC_05_REPORT.md](reportes/HU_SGINC_05_REPORT.md) | Carga Individual |
| [HU_SGINC_06_REPORT.md](reportes/HU_SGINC_06_REPORT.md) | Generar Expediente Lote |
| [HU_SGPP_01_REPORT.md](reportes/HU_SGPP_01_REPORT.md) | Gestion de Perfiles |
| [HU_SGPP_02_REPORT.md](reportes/HU_SGPP_02_REPORT.md) | Nuevo Perfil |

---

## TRAZABILIDAD

```
EPIC → HU → TS → PRC → TC
```

### EP_SIGMA_01 - Modulo Alta de Inconsistencias

| HU | Test Suites | Test Cases | Preconditions |
|----|-------------|------------|---------------|
| HU_SGINC_02 | TS-001 a TS-003 | TC-001 a TC-008 | PRC-001 a PRC-003 |
| HU_SGINC_03 | TS-004 a TS-006 | TC-009 a TC-019 | PRC-004 a PRC-006 |
| HU_SGINC_04 | TS-007 a TS-009 | TC-020 a TC-029 | PRC-007 a PRC-009 |
| HU_SGINC_05 | TS-010 a TS-012 | TC-030 a TC-037 | PRC-010 a PRC-012 |
| HU_SGINC_06 | TS-013 a TS-015 | TC-038 a TC-044 | PRC-013 a PRC-015 |

### EP_SGPP - Perfiles y Permisos

| HU | Test Suites | Test Cases | Preconditions |
|----|-------------|------------|---------------|
| HU_SGPP_01 | TS-016 a TS-024 | TC-045 a TC-071 | PRC-016 a PRC-024 |
| HU_SGPP_02 | TS-025 a TS-028 | TC-072 a TC-083 | PRC-025 a PRC-028 |

---

## ESTRUCTURA DEL PROYECTO

```
sigma_analyzer/
├── run_analysis.py                  <- Script principal de analisis
├── parser.py                        <- Parser de HUs Markdown
├── rtm_analyzer_ai.py               <- Analizador de cobertura
├── report_generator.py              <- Generador de reportes MD
├── hu_ideal_html_generator.py       <- Generador de HU HTML
├── generate_dashboard.py            <- Generador de dashboard
├── templates/                       <- Plantillas HTML
├── docs/                            <- Documentacion tecnica
├── reportes/                        <- Reportes de analisis (7)
├── hu_actualizadas/                 <- HUs HTML actualizadas (7)
├── dashboard.html                   <- Dashboard de metricas
├── presentacion_01_pruebas_estaticas.html
├── presentacion_02_shift_left_stack.html
├── METRICAS_RESUMEN.md              <- Informe ejecutivo
├── PROMPT_FASE2_CSV_TRAZABILIDAD.md <- Prompt para CSVs
└── metricas_globales.json           <- Metricas JSON
```

---

## USO

### Requisitos Previos
```bash
# Python 3.8+
python --version

# Instalar dependencias
pip install -r requirements.txt
```

### Comandos de Ejecucion

#### 1. Ejecutar Analisis Completo
```bash
cd sigma_analyzer
python run_analysis.py
```

#### 2. Analizar HU Individual
```bash
python run_analysis.py --hu HU_SGINC_02
```

#### 3. Generar Dashboard de Metricas
```bash
python generate_dashboard.py
```

#### 4. Generar Reporte HTML de HU
```bash
python hu_ideal_html_generator.py --input docs/HU_SGINC_02.md --output hu_actualizadas/
```

#### 5. Parsear Historia de Usuario
```bash
python parser.py docs/HU_SGINC_02.md
```

#### 6. Analizar Cobertura RTM
```bash
python rtm_analyzer_ai.py --hu HU_SGINC_02
```

#### 7. Generar Reporte MD
```bash
python report_generator.py --hu HU_SGINC_02 --output reportes/
```

### Visualizar Artefactos

#### Ver Presentaciones (abrir en navegador)
```
presentacion_01_pruebas_estaticas.html   # Pruebas Estaticas
presentacion_02_shift_left_stack.html    # Shift-Left y Stack Tecnologico
```

#### Ver Dashboard
```
dashboard.html
```

#### Ver Reportes de Metricas
```
METRICAS_RESUMEN.md
INFORME_METRICAS_PRUEBAS_ESTATICAS.md
```

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

## PROXIMOS PASOS - FASE 3

| Actividad | Herramienta | Estado |
|-----------|-------------|--------|
| Deploy del SUT | Docker | Pendiente |
| Pruebas Exploratorias | Manual | Pendiente |
| Planning Poker (VCR) | Equipo | Pendiente |
| Automatizacion E2E | Playwright + TypeScript | Pendiente |
| Pruebas API | Postman + Newman | Pendiente |
| Pruebas Performance | K6 | Pendiente |
| Pruebas Seguridad | OWASP ZAP | Pendiente |
| CI/CD Pipeline | Jenkins + GitLab | Pendiente |
| Reportes | Allure | Pendiente |

### HUs Pendientes de Analisis

| HU | Nombre | Epica |
|----|--------|-------|
| HU_SGPP_03 | Ver detalle del rol | EP_SGPP |
| HU_SGPP_04 | Modificacion de perfil | EP_SGPP |
| HU_SGPP_05 | Habilitacion/Deshabilitacion de Rol | EP_SGPP |

---

## VERSION

- **v3.0** - Shift-Left Testing con Trazabilidad Completa
- **Fecha:** 29/11/2025
- **Autor:** SIGMA QA Team (Elyer Maldonado, Kelly Ybarra)
- **Repositorio:** https://gitlab.com/elyerm/sigma-static-analyzer

---

## LICENCIA

Proyecto interno AGIP - SIGMA QA Team

---

*Documento generado por SIGMA QA Platform v3.0*
*Metodologia: Shift-Left Testing (ISTQB CTFL v4.0)*
