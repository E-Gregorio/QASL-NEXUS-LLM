-- ============================================================
-- QASL NEXUS LLM - MS-12 DATABASE
-- Indexes para performance en queries frecuentes
-- ============================================================

-- EPIC
CREATE INDEX idx_epic_estado ON epic(estado);

-- USER_STORY
CREATE INDEX idx_us_epic ON user_story(epic_id);
CREATE INDEX idx_us_estado ON user_story(estado);
CREATE INDEX idx_us_prioridad ON user_story(prioridad);
CREATE INDEX idx_us_vcr_total ON user_story(vcr_total);

-- TEST_SUITE
CREATE INDEX idx_ts_epic ON test_suite(epic_id);
CREATE INDEX idx_ts_us ON test_suite(us_id);
CREATE INDEX idx_ts_estado ON test_suite(estado);
CREATE INDEX idx_ts_categoria ON test_suite(categoria);

-- TEST_CASE
CREATE INDEX idx_tc_us ON test_case(us_id);
CREATE INDEX idx_tc_ts ON test_case(ts_id);
CREATE INDEX idx_tc_estado ON test_case(estado);
CREATE INDEX idx_tc_tipo ON test_case(tipo_prueba);
CREATE INDEX idx_tc_automated ON test_case(automated);
CREATE INDEX idx_tc_prioridad ON test_case(prioridad);

-- TEST_CASE_STEP
CREATE INDEX idx_tcs_tc ON test_case_step(tc_id);

-- DEFECT
CREATE INDEX idx_defect_estado ON defect(estado);
CREATE INDEX idx_defect_severidad ON defect(severidad);
CREATE INDEX idx_defect_prioridad ON defect(prioridad);
CREATE INDEX idx_defect_source ON defect(source_ms);
CREATE INDEX idx_defect_type ON defect(type);
CREATE INDEX idx_defect_tc ON defect(tc_id);
CREATE INDEX idx_defect_hu ON defect(hu_epic_id);
CREATE INDEX idx_defect_jira ON defect(jira_key);
CREATE INDEX idx_defect_clasificacion ON defect(clasificacion);
CREATE INDEX idx_defect_fecha ON defect(fecha_informe);

-- TEST_EXECUTION
CREATE INDEX idx_exec_tc ON test_execution(tc_id);
CREATE INDEX idx_exec_ts ON test_execution(ts_id);
CREATE INDEX idx_exec_resultado ON test_execution(resultado);
CREATE INDEX idx_exec_source ON test_execution(source_ms);
CREATE INDEX idx_exec_fecha ON test_execution(fecha_ejecucion);
CREATE INDEX idx_exec_pipeline ON test_execution(pipeline_id);

-- VCR_SCORE
CREATE INDEX idx_vcr_us ON vcr_score(us_id);
CREATE INDEX idx_vcr_tc ON vcr_score(tc_id);
CREATE INDEX idx_vcr_total ON vcr_score(vcr_total);
CREATE INDEX idx_vcr_decision ON vcr_score(decision);

-- METRIC
CREATE INDEX idx_metric_source ON metric(source_ms);
CREATE INDEX idx_metric_tipo ON metric(tipo);
CREATE INDEX idx_metric_nombre ON metric(nombre);
CREATE INDEX idx_metric_fecha ON metric(fecha_medicion);
CREATE INDEX idx_metric_pipeline ON metric(pipeline_id);

-- STATIC_ANALYSIS_GAP
CREATE INDEX idx_gap_us ON static_analysis_gap(us_id);
CREATE INDEX idx_gap_tipo ON static_analysis_gap(gap_tipo);
CREATE INDEX idx_gap_estado ON static_analysis_gap(estado);

-- REPORT
CREATE INDEX idx_report_tipo ON report(tipo);
CREATE INDEX idx_report_fecha ON report(created_at);

-- NOTIFICATION
CREATE INDEX idx_notif_canal ON notification(canal);
CREATE INDEX idx_notif_estado ON notification(estado);
CREATE INDEX idx_notif_fecha ON notification(created_at);

-- PIPELINE_RUN
CREATE INDEX idx_pipeline_estado ON pipeline_run(estado);
CREATE INDEX idx_pipeline_tipo ON pipeline_run(tipo);
CREATE INDEX idx_pipeline_fecha ON pipeline_run(fecha_inicio);
