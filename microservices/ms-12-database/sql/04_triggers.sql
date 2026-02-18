-- ============================================================
-- QASL NEXUS LLM - MS-12 DATABASE
-- Triggers para auto-update de timestamps
-- ============================================================

-- Funcion generica para updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER trg_epic_updated BEFORE UPDATE ON epic
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_user_story_updated BEFORE UPDATE ON user_story
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_test_suite_updated BEFORE UPDATE ON test_suite
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_precondition_updated BEFORE UPDATE ON precondition
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_test_case_updated BEFORE UPDATE ON test_case
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_defect_updated BEFORE UPDATE ON defect
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_vcr_score_updated BEFORE UPDATE ON vcr_score
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_pipeline_run_updated BEFORE UPDATE ON pipeline_run
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Trigger: Auto-calcular VCR riesgo y total
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_vcr()
RETURNS TRIGGER AS $$
BEGIN
    NEW.vcr_riesgo = NEW.vcr_probabilidad * NEW.vcr_impacto;
    NEW.vcr_total = NEW.vcr_valor + NEW.vcr_costo + NEW.vcr_riesgo;
    IF NEW.vcr_total >= 9 THEN
        NEW.decision = 'AUTOMATIZAR';
    ELSE
        NEW.decision = 'MANUAL';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vcr_calculate BEFORE INSERT OR UPDATE ON vcr_score
    FOR EACH ROW EXECUTE FUNCTION calculate_vcr();

-- ============================================================
-- Trigger: Auto-calcular pass_rate en pipeline_run
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_pass_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_tc_ejecutados > 0 THEN
        NEW.pass_rate = ROUND((NEW.total_passed::DECIMAL / NEW.total_tc_ejecutados) * 100, 2);
    ELSE
        NEW.pass_rate = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_pass_rate BEFORE INSERT OR UPDATE ON pipeline_run
    FOR EACH ROW EXECUTE FUNCTION calculate_pass_rate();
