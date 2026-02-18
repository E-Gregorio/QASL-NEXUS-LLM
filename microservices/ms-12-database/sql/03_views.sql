-- ============================================================
-- QASL NEXUS LLM - MS-12 DATABASE
-- Views para queries frecuentes y dashboards
-- ============================================================

-- ============================================================
-- VIEW: Cobertura de pruebas por User Story
-- Usado por: MS-07 (Grafana), MS-11 (Reportador)
-- ============================================================
CREATE OR REPLACE VIEW v_test_coverage AS
SELECT
    us.epic_id,
    us.id_hu,
    us.nombre_hu,
    us.prioridad,
    COUNT(DISTINCT tc.tc_id) AS total_tcs,
    COUNT(DISTINCT CASE WHEN tc.automated THEN tc.tc_id END) AS tcs_automatizados,
    COUNT(DISTINCT ts.ts_id) AS total_suites,
    ROUND(
        CASE WHEN COUNT(DISTINCT tc.tc_id) > 0
        THEN (COUNT(DISTINCT CASE WHEN tc.automated THEN tc.tc_id END)::DECIMAL / COUNT(DISTINCT tc.tc_id)) * 100
        ELSE 0 END, 2
    ) AS pct_automatizado
FROM user_story us
LEFT JOIN test_suite ts ON ts.us_id = us.id_hu
LEFT JOIN test_case tc ON tc.ts_id = ts.ts_id
GROUP BY us.epic_id, us.id_hu, us.nombre_hu, us.prioridad;

-- ============================================================
-- VIEW: Pass rate por suite
-- Usado por: MS-07 (Grafana), MS-11 (Reportador)
-- ============================================================
CREATE OR REPLACE VIEW v_pass_rate AS
SELECT
    te.ts_id,
    ts.nombre_suite,
    te.source_ms,
    COUNT(*) AS total_ejecuciones,
    COUNT(CASE WHEN te.resultado = 'pass' THEN 1 END) AS passed,
    COUNT(CASE WHEN te.resultado = 'fail' THEN 1 END) AS failed,
    COUNT(CASE WHEN te.resultado = 'skip' THEN 1 END) AS skipped,
    COUNT(CASE WHEN te.resultado = 'blocked' THEN 1 END) AS blocked,
    ROUND(
        CASE WHEN COUNT(*) > 0
        THEN (COUNT(CASE WHEN te.resultado = 'pass' THEN 1 END)::DECIMAL / COUNT(*)) * 100
        ELSE 0 END, 2
    ) AS pass_rate
FROM test_execution te
JOIN test_suite ts ON ts.ts_id = te.ts_id
GROUP BY te.ts_id, ts.nombre_suite, te.source_ms;

-- ============================================================
-- VIEW: Deuda tecnica (VCR >= 9 sin automatizar)
-- Usado por: MS-07 (Grafana), MS-09 (Orquestador)
-- ============================================================
CREATE OR REPLACE VIEW v_technical_debt AS
SELECT
    vc.us_id,
    us.nombre_hu,
    tc.tc_id,
    tc.titulo_tc,
    vc.vcr_total,
    vc.decision,
    tc.automated,
    tc.estado
FROM vcr_score vc
JOIN test_case tc ON tc.tc_id = vc.tc_id
JOIN user_story us ON us.id_hu = vc.us_id
WHERE vc.vcr_total >= 9
  AND tc.automated = FALSE;

-- ============================================================
-- VIEW: Resumen de defectos por severidad y estado
-- Usado por: MS-07 (Grafana), MS-11 (Reportador)
-- ============================================================
CREATE OR REPLACE VIEW v_defect_summary AS
SELECT
    d.source_ms,
    d.type,
    d.severidad,
    d.estado,
    d.clasificacion,
    COUNT(*) AS total,
    COUNT(CASE WHEN d.estado = 'Nuevo' THEN 1 END) AS nuevos,
    COUNT(CASE WHEN d.estado = 'Resuelto' THEN 1 END) AS resueltos,
    COUNT(CASE WHEN d.estado = 'Cerrado' THEN 1 END) AS cerrados
FROM defect d
GROUP BY d.source_ms, d.type, d.severidad, d.estado, d.clasificacion;

-- ============================================================
-- VIEW: Trazabilidad completa Epic -> US -> TS -> TC
-- Usado por: MS-10 (MCP), MS-11 (Reportador)
-- ============================================================
CREATE OR REPLACE VIEW v_traceability AS
SELECT
    e.epic_id,
    e.nombre AS epic_nombre,
    us.id_hu,
    us.nombre_hu,
    us.vcr_total AS us_vcr,
    ts.ts_id,
    ts.nombre_suite,
    ts.categoria AS suite_categoria,
    tc.tc_id,
    tc.titulo_tc,
    tc.tipo_prueba,
    tc.automated,
    tc.cobertura_br,
    tc.cobertura_escenario
FROM epic e
JOIN user_story us ON us.epic_id = e.epic_id
JOIN test_suite ts ON ts.us_id = us.id_hu
JOIN test_case tc ON tc.ts_id = ts.ts_id
ORDER BY e.epic_id, us.id_hu, ts.ts_id, tc.tc_id;

-- ============================================================
-- VIEW: Gaps de analisis estatico pendientes
-- Usado por: MS-09 (Orquestador), MS-11 (Reportador)
-- ============================================================
CREATE OR REPLACE VIEW v_pending_gaps AS
SELECT
    g.us_id,
    us.nombre_hu,
    g.gap_tipo,
    g.descripcion,
    g.severidad,
    g.br_afectada,
    g.escenario_afectado,
    g.sugerencia,
    g.detectado_por,
    g.created_at
FROM static_analysis_gap g
JOIN user_story us ON us.id_hu = g.us_id
WHERE g.estado = 'Detectado'
ORDER BY
    CASE g.severidad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 WHEN 'Baja' THEN 3 END,
    g.created_at;

-- ============================================================
-- VIEW: Metricas de pipeline
-- Usado por: MS-07 (Grafana), MS-08 (CI/CD)
-- ============================================================
CREATE OR REPLACE VIEW v_pipeline_metrics AS
SELECT
    pr.pipeline_id,
    pr.tipo,
    pr.trigger_type,
    pr.estado,
    pr.fecha_inicio,
    pr.fecha_fin,
    pr.duracion_seg,
    pr.total_tc_ejecutados,
    pr.total_passed,
    pr.total_failed,
    pr.pass_rate,
    pr.bugs_creados,
    pr.fases_ejecutadas
FROM pipeline_run pr
ORDER BY pr.fecha_inicio DESC;

-- ============================================================
-- VIEW: Resumen ejecutivo (para PDF semanal)
-- Usado por: MS-11 (Reportador)
-- ============================================================
CREATE OR REPLACE VIEW v_executive_summary AS
SELECT
    (SELECT COUNT(*) FROM epic) AS total_epics,
    (SELECT COUNT(*) FROM user_story) AS total_user_stories,
    (SELECT COUNT(*) FROM test_suite) AS total_suites,
    (SELECT COUNT(*) FROM test_case) AS total_test_cases,
    (SELECT COUNT(*) FROM test_case WHERE automated = TRUE) AS tcs_automatizados,
    (SELECT COUNT(*) FROM defect) AS total_defectos,
    (SELECT COUNT(*) FROM defect WHERE estado = 'Nuevo') AS defectos_abiertos,
    (SELECT COUNT(*) FROM defect WHERE severidad = 'Bloqueante' AND estado != 'Cerrado') AS bloqueantes_activos,
    (SELECT COUNT(*) FROM static_analysis_gap WHERE estado = 'Detectado') AS gaps_pendientes,
    (SELECT ROUND(AVG(vcr_total), 2) FROM vcr_score) AS vcr_promedio,
    (SELECT COUNT(*) FROM pipeline_run WHERE estado = 'Success') AS pipelines_exitosos,
    (SELECT COUNT(*) FROM pipeline_run WHERE estado = 'Failed') AS pipelines_fallidos;
