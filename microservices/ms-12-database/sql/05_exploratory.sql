-- ============================================================
-- MS-12: Soporte para Pruebas Exploratorias (Via 2)
-- Nuevas columnas en pipeline_run + 2 tablas nuevas
-- ============================================================

-- Agregar target_url y objective a pipeline_run
ALTER TABLE pipeline_run ADD COLUMN IF NOT EXISTS target_url VARCHAR(500);
ALTER TABLE pipeline_run ADD COLUMN IF NOT EXISTS objective TEXT;

-- ============================================================
-- exploration_finding: lo que INGRID descubre al navegar
-- ============================================================
CREATE TABLE IF NOT EXISTS exploration_finding (
    id SERIAL PRIMARY KEY,
    pipeline_id VARCHAR(50) NOT NULL,
    page_url VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    screenshot_path VARCHAR(500),
    screenshot_base64 TEXT,
    ai_analysis TEXT,
    issues_found JSONB,
    links_discovered JSONB,
    interactive_elements JSONB,
    finding_type VARCHAR(50) DEFAULT 'page_discovery',
    severity VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exploration_finding_pipeline ON exploration_finding(pipeline_id);

-- ============================================================
-- generated_test_case: tests que Opus genera a partir de findings
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_test_case (
    id SERIAL PRIMARY KEY,
    pipeline_id VARCHAR(50) NOT NULL,
    finding_id INTEGER REFERENCES exploration_finding(id),
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) DEFAULT 'e2e',
    test_code TEXT NOT NULL,
    target_url VARCHAR(500),
    status VARCHAR(30) DEFAULT 'generated',
    execution_result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_test_case_pipeline ON generated_test_case(pipeline_id);
