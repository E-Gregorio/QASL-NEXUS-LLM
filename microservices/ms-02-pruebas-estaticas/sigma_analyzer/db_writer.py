# -*- coding: utf-8 -*-
"""
QASL NEXUS LLM - MS-02 → MS-12 Database Writer
Inserta trazabilidad completa del analisis estatico en PostgreSQL
Epic → User Story → Test Suite → Test Case → Steps + Preconditions + Gaps + VCR
"""
import os
import re
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()

# Configurar UTF-8 para Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    psycopg2 = None


class DBWriter:
    """Escribe resultados del analisis estatico en MS-12 PostgreSQL"""

    def __init__(self):
        self.conn = None
        self.db_url = os.getenv(
            "DATABASE_URL",
            "postgresql://qasl_admin:qasl_nexus_2026@localhost:5432/qasl_nexus"
        )

    def connect(self) -> bool:
        """Conecta a PostgreSQL"""
        if psycopg2 is None:
            print("   [DB] psycopg2 no instalado. Ejecutar: pip install psycopg2-binary")
            return False
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.conn.autocommit = False
            print("   [DB] Conectado a PostgreSQL (MS-12)")
            return True
        except Exception as e:
            print(f"   [DB] Error de conexion: {e}")
            return False

    def close(self):
        if self.conn:
            self.conn.close()

    # ------------------------------------------------------------------
    # Metodo principal
    # ------------------------------------------------------------------
    def guardar_analisis(self, hu, resultado: Dict) -> bool:
        """Guarda toda la trazabilidad del analisis en la BD

        Args:
            hu: HistoriaUsuario parseada
            resultado: Dict con coberturas, gaps, metricas, analisis_ia
        """
        if not self.conn:
            print("   [DB] Sin conexion a BD")
            return False

        try:
            cur = self.conn.cursor()

            # 1. Epic
            epic_id = self._extraer_epic_id(hu.epica)
            epic_nombre = self._extraer_epic_nombre(hu.epica)
            self._upsert_epic(cur, epic_id, epic_nombre)

            # 2. User Story
            self._upsert_user_story(cur, hu, epic_id, resultado)

            # 3. Static Analysis Gaps
            self._insertar_gaps(cur, hu.id, resultado['gaps'])

            # 4. Test Suites (agrupar escenarios)
            suites = self._crear_test_suites(hu, epic_id, resultado)
            self._insertar_test_suites(cur, suites)

            # 5. Preconditions
            prcs = self._crear_preconditions(hu)
            self._insertar_preconditions(cur, prcs)

            # 6. Test Cases + Steps
            tcs = self._crear_test_cases(hu, resultado, suites)
            self._insertar_test_cases(cur, tcs)

            # 7. Precondition ↔ Test Case (M2M)
            self._insertar_prc_tc(cur, prcs, tcs)

            # 8. VCR Score
            self._insertar_vcr_score(cur, hu, tcs)

            self.conn.commit()
            print(f"   [DB] Trazabilidad guardada: {hu.id}")
            print(f"         Epic: {epic_id}")
            print(f"         Suites: {len(suites)}")
            print(f"         Test Cases: {len(tcs)}")
            print(f"         Preconditions: {len(prcs)}")
            print(f"         Gaps: {len(resultado['gaps'])}")
            return True

        except Exception as e:
            self.conn.rollback()
            print(f"   [DB] Error guardando: {e}")
            return False

    # ------------------------------------------------------------------
    # Helpers de extraccion
    # ------------------------------------------------------------------
    def _extraer_epic_id(self, epica_text: str) -> str:
        """Extrae ID de epica: 'EP-001: Autenticacion...' → 'EP-001'"""
        match = re.search(r'(EP[-_]?\d+)', epica_text, re.IGNORECASE)
        if match:
            return match.group(1).upper().replace('_', '-')
        # Si no hay ID, generar uno basado en texto
        return "EP-001"

    def _extraer_epic_nombre(self, epica_text: str) -> str:
        """Extrae nombre de epica limpio"""
        # Quitar el ID del inicio
        nombre = re.sub(r'EP[-_]?\d+\s*[:\-]\s*', '', epica_text, flags=re.IGNORECASE)
        # Quitar "Enlace a documentacion..."
        nombre = re.sub(r'\s*Enlace a documentaci.*$', '', nombre, flags=re.IGNORECASE)
        return nombre.strip() or epica_text[:100]

    def _get_next_id(self, cur, tabla: str, columna: str, prefijo: str) -> int:
        """Obtiene el siguiente numero disponible para un ID con prefijo"""
        cur.execute(
            f"SELECT {columna} FROM {tabla} WHERE {columna} LIKE %s ORDER BY {columna} DESC LIMIT 1",
            (f"{prefijo}%",)
        )
        row = cur.fetchone()
        if row:
            match = re.search(r'(\d+)', row[0].replace(prefijo, ''))
            if match:
                return int(match.group(1)) + 1
        return 1

    # ------------------------------------------------------------------
    # 1. Epic
    # ------------------------------------------------------------------
    def _upsert_epic(self, cur, epic_id: str, nombre: str):
        cur.execute("""
            INSERT INTO epic (epic_id, nombre, estado)
            VALUES (%s, %s, 'Activo')
            ON CONFLICT (epic_id) DO UPDATE SET nombre = EXCLUDED.nombre
        """, (epic_id, nombre))

    # ------------------------------------------------------------------
    # 2. User Story
    # ------------------------------------------------------------------
    def _upsert_user_story(self, cur, hu, epic_id: str, resultado: Dict):
        metricas = resultado['metricas']

        # Extraer VCR si existe en la HU
        vcr_valor = self._extraer_vcr_numero(hu, 'valor')
        vcr_costo = self._extraer_vcr_numero(hu, 'costo')
        vcr_riesgo = self._extraer_vcr_numero(hu, 'riesgo')
        vcr_total = self._extraer_vcr_numero(hu, 'total')

        # Criterios de aceptacion (escenarios en formato texto)
        criterios = self._formatear_escenarios_texto(hu.escenarios)

        # Reglas de negocio en formato texto
        reglas = " | ".join(f"{br.id}: {br.descripcion}" for br in hu.reglas_negocio)

        # Scope
        scope = " | ".join(hu.dentro_alcance) if hu.dentro_alcance else ""
        fuera = " | ".join(hu.fuera_alcance) if hu.fuera_alcance else ""
        precondiciones = " | ".join(hu.precondiciones) if hu.precondiciones else ""

        requiere_regresion = vcr_total >= 9 if vcr_total else False
        es_deuda = vcr_total >= 9 if vcr_total else False

        cur.execute("""
            INSERT INTO user_story (
                epic_id, id_hu, nombre_hu, epica, estado, prioridad,
                vcr_valor, vcr_costo, vcr_riesgo, vcr_total,
                requiere_regresion, es_deuda_tecnica,
                criterios_aceptacion, reglas_negocio,
                scope_acordado, fuera_scope, precondiciones
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id_hu) DO UPDATE SET
                nombre_hu = EXCLUDED.nombre_hu,
                estado = EXCLUDED.estado,
                criterios_aceptacion = EXCLUDED.criterios_aceptacion,
                reglas_negocio = EXCLUDED.reglas_negocio,
                vcr_total = EXCLUDED.vcr_total,
                updated_at = NOW()
        """, (
            epic_id, hu.id, hu.nombre, hu.epica,
            'Analisis Estatico Completado', hu.prioridad,
            vcr_valor, vcr_costo, vcr_riesgo, vcr_total,
            requiere_regresion, es_deuda,
            criterios, reglas, scope, fuera, precondiciones
        ))

    def _extraer_vcr_numero(self, hu, campo: str) -> Optional[int]:
        """Intenta extraer un valor VCR numerico de la HU"""
        # Buscar en la descripcion o estado si hay info de VCR
        # Los VCR vienen del HTML en el campo Estimaciones
        # El parser no extrae VCR directamente, asi que intentamos desde el texto
        if hasattr(hu, 'estado') and hu.estado:
            texto = hu.estado
        else:
            return None

        patrones = {
            'valor': r'Valor.*?(\d+)',
            'costo': r'Costo.*?(\d+)',
            'riesgo': r'Riesgo.*?=\s*(\d+)',
            'total': r'VCR\s*=.*?=\s*(\d+)',
        }
        pattern = patrones.get(campo)
        if pattern:
            match = re.search(pattern, texto, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None

    def _formatear_escenarios_texto(self, escenarios) -> str:
        """Formatea escenarios como texto para criterios_aceptacion"""
        partes = []
        for esc in escenarios:
            texto = f"{esc.id}: {esc.titulo}"
            if esc.dado:
                texto += f" (DADO {esc.dado}"
            if esc.cuando:
                texto += f" CUANDO {esc.cuando}"
            if esc.entonces:
                texto += f" ENTONCES {esc.entonces})"
            partes.append(texto)
        return " | ".join(partes)

    # ------------------------------------------------------------------
    # 3. Static Analysis Gaps
    # ------------------------------------------------------------------
    def _insertar_gaps(self, cur, us_id: str, gaps: list):
        # Limpiar gaps anteriores de esta HU
        cur.execute("DELETE FROM static_analysis_gap WHERE us_id = %s", (us_id,))

        for gap in gaps:
            # Mapear severidad
            severidad_map = {'CRITICO': 'Alta', 'ALTO': 'Alta', 'MEDIO': 'Media', 'BAJO': 'Baja'}
            severidad = severidad_map.get(gap.tipo, 'Media')

            cur.execute("""
                INSERT INTO static_analysis_gap (
                    us_id, gap_tipo, descripcion, severidad,
                    br_afectada, sugerencia, detectado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, 'claude')
            """, (
                us_id, gap.razon_gap or 'escenario_faltante',
                gap.descripcion, severidad,
                gap.br_afectada, gap.escenario_sugerido
            ))

    # ------------------------------------------------------------------
    # 4. Test Suites
    # ------------------------------------------------------------------
    def _crear_test_suites(self, hu, epic_id: str, resultado: Dict) -> List[Dict]:
        """Crea test suites agrupando escenarios logicamente"""
        suites = []
        escenarios_originales = hu.escenarios
        gaps = resultado['gaps']

        # Clasificar escenarios originales
        positivos_orig = []
        negativos_orig = []
        for esc in escenarios_originales:
            if self._es_escenario_negativo(esc):
                negativos_orig.append(('original', esc.id, esc.titulo))
            else:
                positivos_orig.append(('original', esc.id, esc.titulo))

        # Clasificar gaps sugeridos
        positivos_gap = []
        negativos_gap = []
        seguridad_gap = []
        for i, gap in enumerate(gaps):
            e_id = f"E{len(escenarios_originales) + i + 1}"
            if gap.owasp or 'seguridad' in gap.titulo.lower() or 'auditoria' in gap.descripcion.lower():
                seguridad_gap.append(('gap', e_id, gap.titulo))
            elif 'falta_negativo' in gap.razon_gap or 'negativo' in gap.titulo.lower():
                negativos_gap.append(('gap', e_id, gap.titulo))
            else:
                positivos_gap.append(('gap', e_id, gap.titulo))

        # Suite 1: Flujos Positivos
        positivos_all = positivos_orig + positivos_gap
        if positivos_all:
            suites.append({
                'ts_id': f"{hu.id}_TS01",
                'epic_id': epic_id,
                'us_id': hu.id,
                'nombre': f"Flujos Positivos - {hu.nombre}",
                'descripcion': "Validacion de escenarios de camino feliz y flujos exitosos",
                'prioridad': 'Alta',
                'categoria': 'Funcional',
                'tecnica': 'Particion de Equivalencia',
                'escenarios': positivos_all
            })

        # Suite 2: Flujos Negativos
        negativos_all = negativos_orig + negativos_gap
        if negativos_all:
            suites.append({
                'ts_id': f"{hu.id}_TS02",
                'epic_id': epic_id,
                'us_id': hu.id,
                'nombre': f"Flujos Negativos - {hu.nombre}",
                'descripcion': "Validacion de escenarios de error, rechazo y validaciones",
                'prioridad': 'Alta',
                'categoria': 'Funcional - Negativa',
                'tecnica': 'Valores Limite',
                'escenarios': negativos_all
            })

        # Suite 3: Seguridad (si hay gaps OWASP)
        if seguridad_gap:
            suites.append({
                'ts_id': f"{hu.id}_TS03",
                'epic_id': epic_id,
                'us_id': hu.id,
                'nombre': f"Seguridad - {hu.nombre}",
                'descripcion': "Validacion de escenarios de seguridad y auditoria (OWASP)",
                'prioridad': 'Muy Alta',
                'categoria': 'Seguridad - OWASP',
                'tecnica': 'Analisis de Riesgos',
                'escenarios': seguridad_gap
            })

        # Si no se clasifico nada, crear una suite general
        if not suites:
            all_esc = [(f'original', esc.id, esc.titulo) for esc in escenarios_originales]
            suites.append({
                'ts_id': f"{hu.id}_TS01",
                'epic_id': epic_id,
                'us_id': hu.id,
                'nombre': f"Suite General - {hu.nombre}",
                'descripcion': "Suite general de pruebas",
                'prioridad': 'Alta',
                'categoria': 'Funcional',
                'tecnica': 'Caja Negra',
                'escenarios': all_esc
            })

        return suites

    def _es_escenario_negativo(self, esc) -> bool:
        """Detecta si un escenario es negativo"""
        texto = f"{esc.titulo} {esc.dado} {esc.cuando} {esc.entonces}".lower()
        palabras_negativas = [
            'fallid', 'error', 'bloque', 'invalid', 'incorrect',
            'sin permiso', 'no permite', 'rechaz', 'denegad',
            'no cumple', 'no existe', 'no tiene'
        ]
        return any(p in texto for p in palabras_negativas)

    def _insertar_test_suites(self, cur, suites: List[Dict]):
        for suite in suites:
            # Formatear TC generados
            tc_list = "\n".join(
                f"{esc[1]}: {esc[2]}" for esc in suite['escenarios']
            )

            cur.execute("""
                INSERT INTO test_suite (
                    epic_id, us_id, ts_id, nombre_suite, descripcion_suite,
                    prioridad, categoria, tecnica_aplicada, tc_generados,
                    estado, qa_framework, ambiente_testing, total_tc
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Planning', 'Selenium', 'QA', %s)
                ON CONFLICT (ts_id) DO UPDATE SET
                    nombre_suite = EXCLUDED.nombre_suite,
                    tc_generados = EXCLUDED.tc_generados,
                    total_tc = EXCLUDED.total_tc,
                    updated_at = NOW()
            """, (
                suite['epic_id'], suite['us_id'], suite['ts_id'],
                suite['nombre'], suite['descripcion'],
                suite['prioridad'], suite['categoria'], suite['tecnica'],
                tc_list, len(suite['escenarios'])
            ))

    # ------------------------------------------------------------------
    # 5. Preconditions
    # ------------------------------------------------------------------
    def _crear_preconditions(self, hu) -> List[Dict]:
        """Crea precondiciones basadas en la HU"""
        prcs = []
        prc_num = 1

        # PRC 1: Autenticacion (siempre)
        prcs.append({
            'prc_id': f"{hu.id}_PRC{prc_num:02d}",
            'titulo': f"Autenticacion - {hu.nombre}",
            'descripcion': "Usuario autenticado en el sistema con rol correspondiente",
            'datos': f"Usuario: qa_test | Rol: {hu.usuario_rol}",
            'estado_sistema': "Sistema operativo | BD disponible | Servicio de autenticacion activo",
            'categoria': 'Autenticacion'
        })
        prc_num += 1

        # PRC 2: Datos (si hay precondiciones en la HU)
        if hu.precondiciones:
            prcs.append({
                'prc_id': f"{hu.id}_PRC{prc_num:02d}",
                'titulo': f"Datos de prueba - {hu.nombre}",
                'descripcion': " | ".join(hu.precondiciones),
                'datos': "Datos de prueba cargados en el entorno QA",
                'estado_sistema': "Base de datos con datos de prueba disponibles",
                'categoria': 'Datos'
            })
            prc_num += 1

        # PRC 3: Navegacion
        prcs.append({
            'prc_id': f"{hu.id}_PRC{prc_num:02d}",
            'titulo': f"Navegacion - {hu.nombre}",
            'descripcion': "Usuario posicionado en la pantalla/modulo correspondiente",
            'datos': f"URL del modulo accesible | Permisos de {hu.usuario_rol}",
            'estado_sistema': "Modulo accesible y funcional",
            'categoria': 'Navegacion'
        })

        return prcs

    def _insertar_preconditions(self, cur, prcs: List[Dict]):
        for prc in prcs:
            cur.execute("""
                INSERT INTO precondition (
                    prc_id, titulo_prc, descripcion, datos_requeridos,
                    estado_sistema, categoria, reutilizable
                ) VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (prc_id) DO UPDATE SET
                    descripcion = EXCLUDED.descripcion,
                    datos_requeridos = EXCLUDED.datos_requeridos,
                    updated_at = NOW()
            """, (
                prc['prc_id'], prc['titulo'], prc['descripcion'],
                prc['datos'], prc['estado_sistema'], prc['categoria']
            ))

    # ------------------------------------------------------------------
    # 6. Test Cases + Steps
    # ------------------------------------------------------------------
    def _crear_test_cases(self, hu, resultado: Dict, suites: List[Dict]) -> List[Dict]:
        """Crea test cases: 1 por escenario original + 1 por gap sugerido"""
        tcs = []
        tc_global_num = self._get_next_tc_num()
        gaps = resultado['gaps']

        # Mapear escenarios a suites
        escenario_suite_map = {}
        for suite in suites:
            for tipo, e_id, titulo in suite['escenarios']:
                escenario_suite_map[e_id] = suite['ts_id']

        # TCs de escenarios originales
        for esc in hu.escenarios:
            ts_id = escenario_suite_map.get(esc.id, suites[0]['ts_id'] if suites else f"{hu.id}_TS01")
            tc_id = f"TC-{tc_global_num:03d}"

            es_negativo = self._es_escenario_negativo(esc)

            # Determinar BR cubierta
            br_cubierta = self._detectar_br_cubierta(esc, hu.reglas_negocio)

            tcs.append({
                'tc_id': tc_id,
                'us_id': hu.id,
                'ts_id': ts_id,
                'titulo': f"{ts_id.split('_')[-1]} | {tc_id}: {esc.titulo}",
                'tipo_prueba': 'Funcional - Negativa' if es_negativo else 'Funcional',
                'prioridad': 'Alta',
                'complejidad': 'Media',
                'cobertura_escenario': esc.id,
                'cobertura_br': br_cubierta,
                'tecnica': 'Caja Negra',
                'origen': 'original',
                'steps': [{
                    'paso': 1,
                    'accion': esc.cuando or "Ejecutar la accion del escenario",
                    'datos': esc.dado or "Precondiciones cumplidas",
                    'resultado': esc.entonces or "Resultado esperado segun BR"
                }]
            })
            tc_global_num += 1

        # TCs de gaps sugeridos
        for i, gap in enumerate(gaps):
            e_num = len(hu.escenarios) + i + 1
            e_id = f"E{e_num}"
            ts_id = escenario_suite_map.get(e_id, suites[-1]['ts_id'] if suites else f"{hu.id}_TS01")
            tc_id = f"TC-{tc_global_num:03d}"

            # Parsear Gherkin del gap
            dado, cuando, entonces = self._parsear_gherkin_gap(gap.escenario_sugerido)

            es_negativo = 'negativo' in gap.razon_gap or 'negativo' in gap.titulo.lower()

            tcs.append({
                'tc_id': tc_id,
                'us_id': hu.id,
                'ts_id': ts_id,
                'titulo': f"{ts_id.split('_')[-1]} | {tc_id}: {gap.titulo}",
                'tipo_prueba': 'Seguridad - OWASP' if gap.owasp else ('Funcional - Negativa' if es_negativo else 'Funcional'),
                'prioridad': 'Alta' if gap.tipo in ('CRITICO', 'ALTO') else 'Media',
                'complejidad': 'Alta' if gap.tipo == 'CRITICO' else 'Media',
                'cobertura_escenario': e_id,
                'cobertura_br': gap.br_afectada,
                'tecnica': 'Analisis de Riesgos' if gap.owasp else 'Caja Negra',
                'origen': 'gap_sugerido',
                'steps': [{
                    'paso': 1,
                    'accion': cuando,
                    'datos': dado,
                    'resultado': entonces
                }]
            })
            tc_global_num += 1

        return tcs

    def _get_next_tc_num(self) -> int:
        """Obtiene el siguiente numero TC global"""
        try:
            cur = self.conn.cursor()
            cur.execute("SELECT tc_id FROM test_case ORDER BY tc_id DESC LIMIT 1")
            row = cur.fetchone()
            if row:
                match = re.search(r'TC-(\d+)', row[0])
                if match:
                    return int(match.group(1)) + 1
        except Exception:
            pass
        return 1

    def _detectar_br_cubierta(self, esc, reglas) -> str:
        """Detecta que BR cubre un escenario basandose en el contenido"""
        texto_esc = f"{esc.titulo} {esc.dado} {esc.cuando} {esc.entonces}".lower()
        brs_cubiertas = []
        for br in reglas:
            # Comparar palabras clave de la BR con el escenario
            palabras_br = set(re.findall(r'\w+', br.descripcion.lower()))
            palabras_esc = set(re.findall(r'\w+', texto_esc))
            # Si hay suficiente overlap, marcar como cubierta
            overlap = len(palabras_br & palabras_esc)
            if overlap >= 3:
                brs_cubiertas.append(br.id)
        return ", ".join(brs_cubiertas) if brs_cubiertas else ""

    def _parsear_gherkin_gap(self, gherkin: str) -> Tuple[str, str, str]:
        """Parsea texto Gherkin de un gap en DADO, CUANDO, ENTONCES"""
        dado, cuando, entonces = "", "", ""
        if not gherkin:
            return dado, cuando, entonces

        dado_m = re.search(r'DADO\s+(.*?)(?=\nCUANDO|\Z)', gherkin, re.DOTALL | re.IGNORECASE)
        cuando_m = re.search(r'CUANDO\s+(.*?)(?=\nENTONCES|\Z)', gherkin, re.DOTALL | re.IGNORECASE)
        entonces_m = re.search(r'ENTONCES\s+(.*?)(?=\nY\s|\Z)', gherkin, re.DOTALL | re.IGNORECASE)

        if dado_m:
            dado = dado_m.group(1).strip()
        if cuando_m:
            cuando = cuando_m.group(1).strip()
        if entonces_m:
            entonces = entonces_m.group(1).strip()

        return dado, cuando, entonces

    def _insertar_test_cases(self, cur, tcs: List[Dict]):
        for tc in tcs:
            cur.execute("""
                INSERT INTO test_case (
                    tc_id, us_id, ts_id, titulo_tc, tipo_prueba,
                    prioridad, complejidad, estado, cobertura_escenario,
                    cobertura_br, tecnica_aplicada, creado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'Disenando', %s, %s, %s, 'Shift-Left Analyzer')
                ON CONFLICT (tc_id) DO UPDATE SET
                    titulo_tc = EXCLUDED.titulo_tc,
                    tipo_prueba = EXCLUDED.tipo_prueba,
                    updated_at = NOW()
            """, (
                tc['tc_id'], tc['us_id'], tc['ts_id'], tc['titulo'],
                tc['tipo_prueba'], tc['prioridad'], tc['complejidad'],
                tc['cobertura_escenario'], tc['cobertura_br'], tc['tecnica']
            ))

            # Steps
            for step in tc['steps']:
                cur.execute("""
                    INSERT INTO test_case_step (tc_id, paso_numero, paso_accion, datos_entrada, resultado_esperado)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (tc_id, paso_numero) DO UPDATE SET
                        paso_accion = EXCLUDED.paso_accion,
                        datos_entrada = EXCLUDED.datos_entrada,
                        resultado_esperado = EXCLUDED.resultado_esperado
                """, (
                    tc['tc_id'], step['paso'], step['accion'],
                    step['datos'], step['resultado']
                ))

    # ------------------------------------------------------------------
    # 7. Precondition ↔ Test Case (M2M)
    # ------------------------------------------------------------------
    def _insertar_prc_tc(self, cur, prcs: List[Dict], tcs: List[Dict]):
        """Relaciona precondiciones con test cases"""
        # PRC de autenticacion aplica a todos los TCs
        prc_auth = prcs[0]['prc_id'] if prcs else None

        for tc in tcs:
            if prc_auth:
                cur.execute("""
                    INSERT INTO precondition_test_case (prc_id, tc_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (prc_auth, tc['tc_id']))

            # PRC de datos aplica a TCs que necesitan datos previos
            if len(prcs) > 1:
                cur.execute("""
                    INSERT INTO precondition_test_case (prc_id, tc_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (prcs[1]['prc_id'], tc['tc_id']))

    # ------------------------------------------------------------------
    # 8. VCR Score
    # ------------------------------------------------------------------
    def _insertar_vcr_score(self, cur, hu, tcs: List[Dict]):
        """Inserta VCR score para cada TC"""
        # Intentar extraer VCR de la HU
        vcr_valor = self._extraer_vcr_numero(hu, 'valor') or 2
        vcr_costo = self._extraer_vcr_numero(hu, 'costo') or 2
        vcr_prob = 2  # Default
        vcr_impacto = 2  # Default

        # Ajustar segun prioridad de la HU
        if hu.prioridad and 'alta' in hu.prioridad.lower():
            vcr_valor = 3
            vcr_impacto = 3

        for tc in tcs:
            # Ajustar probabilidad/impacto segun tipo
            prob = vcr_prob
            impacto = vcr_impacto
            if tc['tipo_prueba'] == 'Seguridad - OWASP':
                prob = 3
                impacto = 3
            elif 'Negativa' in tc['tipo_prueba']:
                prob = min(prob + 1, 4)

            cur.execute("""
                INSERT INTO vcr_score (
                    us_id, tc_id, vcr_valor, vcr_costo,
                    vcr_probabilidad, vcr_impacto, calculado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, 'claude')
                ON CONFLICT DO NOTHING
            """, (
                hu.id, tc['tc_id'], vcr_valor, vcr_costo, prob, impacto
            ))
