import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface TestSuiteData {
    ts_id: string;
    nombre_suite: string;
    categoria: string;
    prioridad: string;
    tecnica_aplicada: string;
    total_tc: number;
}

export interface TestCaseData {
    tc_id: string;
    ts_id: string;
    titulo_tc: string;
    tipo_prueba: string;
    prioridad: string;
    complejidad: string;
    cobertura_escenario: string;
    cobertura_br: string;
    automated: boolean;
}

export interface TestStepData {
    tc_id: string;
    paso_numero: number;
    paso_accion: string;
    datos_entrada: string;
    resultado_esperado: string;
}

export interface PreconditionData {
    prc_id: string;
    titulo_prc: string;
    descripcion: string;
    pasos_precondicion: string;
    datos_requeridos: string;
    categoria: string;
}

export interface HUTestPlan {
    hu_id: string;
    hu_nombre: string;
    epic_id: string;
    epic_nombre: string;
    vcr_total: number;
    suites: TestSuiteData[];
    testCases: TestCaseData[];
    steps: TestStepData[];
    preconditions: PreconditionData[];
}

export class DBReader {
    private pool: pg.Pool;

    constructor() {
        const dbUrl = process.env.DATABASE_URL || 'postgresql://qasl_admin:qasl_nexus_2026@localhost:5432/qasl_nexus';
        this.pool = new pg.Pool({ connectionString: dbUrl });
    }

    async getTestPlanByHU(huId: string): Promise<HUTestPlan | null> {
        const client = await this.pool.connect();
        try {
            const huResult = await client.query(
                `SELECT us.id_hu, us.nombre_hu, us.vcr_total, e.epic_id, e.nombre as epic_nombre
                 FROM user_story us JOIN epic e ON us.epic_id = e.epic_id
                 WHERE us.id_hu = $1`, [huId]
            );

            if (huResult.rows.length === 0) return null;

            const hu = huResult.rows[0];

            const suitesResult = await client.query(
                `SELECT ts_id, nombre_suite, categoria, prioridad, tecnica_aplicada, total_tc
                 FROM test_suite WHERE us_id = $1 ORDER BY ts_id`, [huId]
            );

            const casesResult = await client.query(
                `SELECT tc_id, ts_id, titulo_tc, tipo_prueba, prioridad, complejidad,
                        cobertura_escenario, cobertura_br, automated
                 FROM test_case WHERE us_id = $1 ORDER BY tc_id`, [huId]
            );

            const tcIds = casesResult.rows.map(r => r.tc_id);
            let stepsResult = { rows: [] as any[] };
            if (tcIds.length > 0) {
                stepsResult = await client.query(
                    `SELECT tc_id, paso_numero, paso_accion, datos_entrada, resultado_esperado
                     FROM test_case_step WHERE tc_id = ANY($1) ORDER BY tc_id, paso_numero`, [tcIds]
                );
            }

            let precResult = { rows: [] as any[] };
            if (tcIds.length > 0) {
                precResult = await client.query(
                    `SELECT DISTINCT p.prc_id, p.titulo_prc, p.descripcion, p.pasos_precondicion,
                            p.datos_requeridos, p.categoria
                     FROM precondition p
                     JOIN precondition_test_case ptc ON p.prc_id = ptc.prc_id
                     WHERE ptc.tc_id = ANY($1) ORDER BY p.prc_id`, [tcIds]
                );
            }

            return {
                hu_id: hu.id_hu,
                hu_nombre: hu.nombre_hu,
                epic_id: hu.epic_id,
                epic_nombre: hu.epic_nombre,
                vcr_total: hu.vcr_total,
                suites: suitesResult.rows,
                testCases: casesResult.rows,
                steps: stepsResult.rows,
                preconditions: precResult.rows
            };
        } finally {
            client.release();
        }
    }

    async getStepsByTC(tcId: string): Promise<TestStepData[]> {
        const result = await this.pool.query(
            `SELECT tc_id, paso_numero, paso_accion, datos_entrada, resultado_esperado
             FROM test_case_step WHERE tc_id = $1 ORDER BY paso_numero`, [tcId]
        );
        return result.rows;
    }

    async getTraceability(huId: string): Promise<any[]> {
        const result = await this.pool.query(
            `SELECT * FROM v_traceability WHERE id_hu = $1 ORDER BY tc_id`, [huId]
        );
        return result.rows;
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
