-- ============================================================
-- QASL NEXUS LLM - MS-12 DATABASE
-- Esquema PostgreSQL - Single Source of Truth
-- ============================================================
-- Autor: QASL NEXUS LLM Team
-- Version: 1.0.0
-- Puerto: 5432
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA 1: EPIC
-- Fuente: MS-02 (Pruebas Estaticas)
-- ============================================================
CREATE TABLE epic (
    id SERIAL PRIMARY KEY,
    epic_id VARCHAR(20) UNIQUE NOT NULL,           -- EPIC-01
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 2: USER_STORY
-- Fuente: MS-02 (CSV 1_User_Storie.csv)
-- Campos basados en Shift-Left Testing ISTQB/IEEE 829
-- ============================================================
CREATE TABLE user_story (
    id SERIAL PRIMARY KEY,
    epic_id VARCHAR(20) NOT NULL REFERENCES epic(epic_id),
    id_hu VARCHAR(50) UNIQUE NOT NULL,             -- HU_SGINC_02
    nombre_hu VARCHAR(255) NOT NULL,
    epica VARCHAR(255),
    estado VARCHAR(100) DEFAULT 'En Analisis',
    prioridad VARCHAR(50),                         -- Alta - MVP 1, Media, Baja
    vcr_valor INTEGER CHECK (vcr_valor BETWEEN 1 AND 3),
    vcr_costo INTEGER CHECK (vcr_costo BETWEEN 1 AND 3),
    vcr_riesgo INTEGER,                            -- Probabilidad x Impacto
    vcr_total INTEGER,                             -- Valor + Costo + Riesgo
    requiere_regresion BOOLEAN DEFAULT FALSE,
    es_deuda_tecnica BOOLEAN DEFAULT FALSE,
    estimacion_original_hrs DECIMAL(10,2) DEFAULT 0,
    tiempo_empleado_hrs DECIMAL(10,2) DEFAULT 0,
    criterios_aceptacion TEXT,                     -- E1: DADO...CUANDO...ENTONCES | E2: ...
    reglas_negocio TEXT,                           -- BR1: descripcion | BR2: ...
    scope_acordado TEXT,
    fuera_scope TEXT,
    precondiciones TEXT,
    link_documentacion_base VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 3: TEST_SUITE
-- Fuente: MS-02 (CSV 2_Test_Suite.csv)
-- ============================================================
CREATE TABLE test_suite (
    id SERIAL PRIMARY KEY,
    epic_id VARCHAR(20) NOT NULL REFERENCES epic(epic_id),
    us_id VARCHAR(50) NOT NULL REFERENCES user_story(id_hu),
    ts_id VARCHAR(50) UNIQUE NOT NULL,             -- HU_SGINC_02_TS01 (compuesto)
    nombre_suite VARCHAR(255) NOT NULL,
    descripcion_suite TEXT,
    prioridad VARCHAR(20),                         -- Muy Alta / Alta / Media / Baja
    categoria VARCHAR(50),                         -- Funcional / Funcional - Negativa / Seguridad - OWASP / Funcional + Integracion
    tecnica_aplicada VARCHAR(100),                 -- Particion de Equivalencia / Valores Limite / Analisis de Riesgos
    descripcion_analisis TEXT,
    link_analisis VARCHAR(500),
    tc_generados TEXT,                             -- TC-001: descripcion | TC-002: descripcion
    estado VARCHAR(50) DEFAULT 'Planning',         -- Planning / En Ejecucion / Completada
    qa_framework VARCHAR(100),                     -- Xray Only (Full Manual) / Selenium + Xray
    ambiente_testing VARCHAR(50),                   -- QA / Staging / Produccion
    total_tc INTEGER DEFAULT 0,
    estimacion_horas VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 4: PRECONDITION
-- Fuente: MS-02 (CSV 3_Precondition.csv)
-- ============================================================
CREATE TABLE precondition (
    id SERIAL PRIMARY KEY,
    prc_id VARCHAR(20) UNIQUE NOT NULL,            -- PRC-001
    titulo_prc VARCHAR(255) NOT NULL,
    descripcion TEXT,
    pasos_precondicion TEXT,                        -- 1. Autenticar | 2. Verificar permisos | 3. Acceder
    datos_requeridos TEXT,                          -- Usuario: qa_test | Password: Test123!
    estado_sistema TEXT,                            -- Sistema operativo | BD disponible
    categoria VARCHAR(50),                         -- Autenticacion / Datos / Configuracion / Navegacion
    reutilizable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 5: TEST_CASE
-- Fuente: MS-02 (CSV 4_Test_Cases.csv) + MS-05 (INGRID AI)
-- Cada TC tiene N pasos en test_case_step
-- ============================================================
CREATE TABLE test_case (
    id SERIAL PRIMARY KEY,
    tc_id VARCHAR(20) UNIQUE NOT NULL,             -- TC-001 (global unico)
    us_id VARCHAR(50) NOT NULL REFERENCES user_story(id_hu),
    ts_id VARCHAR(50) NOT NULL REFERENCES test_suite(ts_id),
    titulo_tc VARCHAR(500) NOT NULL,               -- TS01 | TC-001: Validar acceso (BR1 - Positivo)
    tipo_prueba VARCHAR(50),                       -- Funcional / Funcional - Negativa / Seguridad - OWASP
    prioridad VARCHAR(20),                         -- Alta / Media / Baja
    complejidad VARCHAR(20),                       -- Alta / Media / Baja
    estado VARCHAR(50) DEFAULT 'Disenando',        -- Disenando / Ejecutable / En Ejecucion / Completado
    tiempo_estimado VARCHAR(20),                   -- 10 min, 5-10 min
    creado_por VARCHAR(100) DEFAULT 'Shift-Left Analyzer',
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    cobertura_escenario VARCHAR(50),               -- E1, E2, E3
    cobertura_br VARCHAR(100),                     -- BR1, BR2
    tecnica_aplicada VARCHAR(100),
    automated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 6: TEST_CASE_STEP
-- Fuente: MS-02 (CSV 4 - pasos separados, modelo JIRA/XRAY)
-- Un TC con 3 pasos = 3 filas
-- ============================================================
CREATE TABLE test_case_step (
    id SERIAL PRIMARY KEY,
    tc_id VARCHAR(20) NOT NULL REFERENCES test_case(tc_id),
    paso_numero INTEGER NOT NULL,
    paso_accion TEXT NOT NULL,
    datos_entrada TEXT,
    resultado_esperado TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tc_id, paso_numero)
);

-- ============================================================
-- TABLA 7: PRECONDITION_TEST_CASE (Many-to-Many)
-- Relacion: PRC-001 se usa en TC-001, TC-003, TC-005
-- ============================================================
CREATE TABLE precondition_test_case (
    prc_id VARCHAR(20) NOT NULL REFERENCES precondition(prc_id),
    tc_id VARCHAR(20) NOT NULL REFERENCES test_case(tc_id),
    PRIMARY KEY (prc_id, tc_id)
);

-- ============================================================
-- TABLA 8: DEFECT
-- Fuente: MS-03 (E2E/API/K6/ZAP), MS-04 (Mobile), MS-06 (Garak)
-- Basado en plantilla ISTQB v4.0 / IEEE 829 / ISO 29119-3
-- ============================================================
CREATE TABLE defect (
    id SERIAL PRIMARY KEY,
    bug_id VARCHAR(20) UNIQUE NOT NULL,            -- BUG-001
    titulo VARCHAR(500) NOT NULL,
    resumen TEXT,
    -- contexto
    fecha_informe DATE DEFAULT CURRENT_DATE,
    organizacion_emisora VARCHAR(255),
    autor VARCHAR(100),
    modulo_afectado VARCHAR(255),
    version_build VARCHAR(50),
    entorno TEXT,                                   -- SO | Navegador | Datos de prueba
    fase_observada VARCHAR(50),                    -- Revision estatica / Componente / Integracion / Sistema / UAT / Produccion
    -- reproduccion
    pasos_reproducir TEXT,
    datos_prueba TEXT,
    condiciones_previas TEXT,
    -- resultados
    resultado_esperado TEXT,
    resultado_real TEXT,
    -- evidencia
    evidencia_logs TEXT,
    evidencia_capturas TEXT,
    evidencia_dumps TEXT,
    -- evaluacion
    severidad VARCHAR(20),                         -- Bloqueante / Alta / Media / Baja
    prioridad VARCHAR(10),                         -- P1 / P2 / P3 / P4
    frecuencia VARCHAR(20),                        -- Siempre / Intermitente / Rara
    impacto_alcance TEXT,
    clasificacion VARCHAR(50),                     -- Funcional / Interfaz / Rendimiento / Seguridad / Datos / Ambiente / Requisito
    -- trazabilidad
    hu_epic_id VARCHAR(50),                        -- HU o Epic relacionada
    tc_id VARCHAR(20),                             -- Test Case que lo detecto
    build_release VARCHAR(50),
    ticket_externo VARCHAR(100),                   -- JIRA-1234
    documento_req VARCHAR(255),
    -- info adicional
    workaround TEXT,
    notas TEXT,
    accion_correctiva TEXT,
    -- estado y seguimiento
    estado VARCHAR(50) DEFAULT 'Nuevo',            -- Nuevo / Asignado / En progreso / Resuelto / Cerrado / Rechazado / Duplicado
    responsable VARCHAR(100),
    fecha_cierre DATE,
    resultado_retest VARCHAR(10),                  -- Pass / Fail
    -- origen
    source_ms VARCHAR(20),                         -- ms-03, ms-04, ms-06
    type VARCHAR(30),                              -- web, mobile, llm_security, api, performance
    jira_key VARCHAR(50),
    xray_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 9: TEST_EXECUTION
-- Fuente: MS-03, MS-04, MS-06
-- Resultado de cada ejecucion de un TC
-- ============================================================
CREATE TABLE test_execution (
    id SERIAL PRIMARY KEY,
    tc_id VARCHAR(20) REFERENCES test_case(tc_id),
    ts_id VARCHAR(50) REFERENCES test_suite(ts_id),
    us_id VARCHAR(50) REFERENCES user_story(id_hu),
    ejecutado_por VARCHAR(100),
    fecha_ejecucion TIMESTAMP DEFAULT NOW(),
    resultado VARCHAR(20) NOT NULL,                -- pass / fail / skip / blocked
    duracion_ms INTEGER,
    ambiente VARCHAR(50),                          -- QA / Staging / Produccion
    build VARCHAR(50),
    evidencia TEXT,
    notas TEXT,
    bug_id VARCHAR(20),                            -- Si fallo, BUG asociado
    source_ms VARCHAR(20),                         -- ms-03, ms-04, ms-06
    pipeline_id VARCHAR(50),                       -- ID del pipeline CI/CD
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 10: VCR_SCORE
-- Fuente: MS-09 (Orquestador LLM)
-- Calculo: Valor + Costo + (Probabilidad x Impacto) = VCR Total
-- Decision: >= 9 AUTOMATIZAR, < 9 MANUAL
-- ============================================================
CREATE TABLE vcr_score (
    id SERIAL PRIMARY KEY,
    us_id VARCHAR(50) REFERENCES user_story(id_hu),
    tc_id VARCHAR(20) REFERENCES test_case(tc_id),
    vcr_valor INTEGER CHECK (vcr_valor BETWEEN 1 AND 3),
    vcr_costo INTEGER CHECK (vcr_costo BETWEEN 1 AND 3),
    vcr_probabilidad INTEGER CHECK (vcr_probabilidad BETWEEN 1 AND 4),
    vcr_impacto INTEGER CHECK (vcr_impacto BETWEEN 1 AND 4),
    vcr_riesgo INTEGER,                            -- probabilidad x impacto
    vcr_total INTEGER,                             -- valor + costo + riesgo
    decision VARCHAR(20),                          -- AUTOMATIZAR / MANUAL
    justificacion TEXT,
    calculado_por VARCHAR(50),                     -- claude / gpt / gemini
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 11: METRIC
-- Fuente: MS-03, MS-04, MS-06, MS-07
-- Metricas extraidas de reportes nativos
-- ============================================================
CREATE TABLE metric (
    id SERIAL PRIMARY KEY,
    source_ms VARCHAR(20) NOT NULL,                -- ms-03, ms-04, ms-06
    tipo VARCHAR(50) NOT NULL,                     -- execution, performance, security, mobile, coverage
    nombre VARCHAR(100) NOT NULL,                  -- pass_rate, p95_latency, vulns_high, etc
    valor DECIMAL(10,4) NOT NULL,
    unidad VARCHAR(30),                            -- %, ms, count, score
    contexto JSONB,                                -- metadata adicional flexible
    fecha_medicion TIMESTAMP DEFAULT NOW(),
    pipeline_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 12: STATIC_ANALYSIS_GAP
-- Fuente: MS-02 (SUR Static Analyzer + Claude AI)
-- Gaps detectados en Historias de Usuario
-- ============================================================
CREATE TABLE static_analysis_gap (
    id SERIAL PRIMARY KEY,
    us_id VARCHAR(50) NOT NULL REFERENCES user_story(id_hu),
    gap_tipo VARCHAR(50) NOT NULL,                 -- escenario_faltante / caso_negativo / incongruencia / ambiguedad
    descripcion TEXT NOT NULL,
    severidad VARCHAR(20),                         -- Alta / Media / Baja
    br_afectada VARCHAR(50),                       -- BR1, BR2
    escenario_afectado VARCHAR(50),                -- E1, E2
    sugerencia TEXT,
    estado VARCHAR(50) DEFAULT 'Detectado',        -- Detectado / Corregido / Descartado
    detectado_por VARCHAR(50) DEFAULT 'claude',    -- claude / analyzer / manual
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 13: REPORT
-- Fuente: MS-11 (Reportador)
-- Registro de reportes generados
-- ============================================================
CREATE TABLE report (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,                     -- executive / technical / weekly / ieee_29119
    formato VARCHAR(20) NOT NULL,                  -- pdf / html / excel / markdown
    nombre VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500),
    source_ms VARCHAR(20),
    destinatarios TEXT,
    metadata JSONB,
    generado_por VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 14: NOTIFICATION
-- Fuente: MS-11 (Reportador)
-- Registro de notificaciones enviadas
-- ============================================================
CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,                     -- alerta / reporte / bug_creado / pipeline_complete
    canal VARCHAR(30) NOT NULL,                    -- email / slack / teams / google_meet
    destinatario VARCHAR(255) NOT NULL,
    asunto VARCHAR(255),
    contenido TEXT,
    estado VARCHAR(20) DEFAULT 'Pendiente',        -- Pendiente / Enviado / Error
    enviado_at TIMESTAMP,
    error TEXT,
    report_id INTEGER REFERENCES report(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABLA 15: PIPELINE_RUN
-- Fuente: MS-08 (CI/CD)
-- Registro de ejecuciones de pipeline
-- ============================================================
CREATE TABLE pipeline_run (
    id SERIAL PRIMARY KEY,
    pipeline_id VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50),                              -- full / regression / smoke / security
    trigger_type VARCHAR(30),                      -- git_push / manual / schedule
    trigger_by VARCHAR(100),
    estado VARCHAR(30) DEFAULT 'Running',          -- Running / Success / Failed / Cancelled
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    duracion_seg INTEGER,
    -- resultados agregados
    total_tc_ejecutados INTEGER DEFAULT 0,
    total_passed INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_skipped INTEGER DEFAULT 0,
    pass_rate DECIMAL(5,2),
    bugs_creados INTEGER DEFAULT 0,
    -- fases ejecutadas
    fases_ejecutadas JSONB,                        -- {"ms02": "ok", "ms03": "ok", "ms04": "skip"}
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
