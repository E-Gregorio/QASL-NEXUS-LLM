"""
Parser de Historias de Usuario (HU) en formato Markdown
Extrae: BRs, Escenarios, Validaciones, Mensajes, etc.
"""
import re
from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class ReglaNegocio:
    """Representa una Regla de Negocio (BR)"""
    id: str  # BR1, BR2, etc.
    descripcion: str


@dataclass
class Escenario:
    """Representa un Escenario de prueba"""
    id: str  # E1, E2, etc.
    titulo: str
    dado: str
    cuando: str
    entonces: str
    y_adicional: Optional[str] = None


@dataclass
class HistoriaUsuario:
    """Representa una Historia de Usuario completa"""
    id: str
    nombre: str
    epica: str
    prioridad: str
    descripcion: str
    usuario_rol: str
    reglas_negocio: List[ReglaNegocio]
    escenarios: List[Escenario]
    validaciones: List[str]
    mensajes: List[str]
    permisos: List[str]
    dentro_alcance: List[str]
    fuera_alcance: List[str]
    precondiciones: List[str] = None  # Nuevo campo
    wireframe: str = ""
    estado: str = ""
    diagrama_flujo: str = ""
    diagrama_estados: str = ""


class HUParser:
    """Parser de Historias de Usuario en Markdown"""

    def __init__(self, file_path: str):
        self.file_path = file_path
        with open(file_path, 'r', encoding='utf-8') as f:
            self.content = f.read()

        # Extraer solo la tabla de HISTORIA DE USUARIO para evitar confusión con otras tablas
        self.hu_table = self._extract_hu_table()

    def _extract_hu_table(self) -> str:
        """Extrae la tabla principal de HISTORIA DE USUARIO"""
        # Buscar desde "HISTORIA DE USUARIO" hasta el final de la tabla
        pattern = r'\|\s*HISTORIA DE USUARIO\s*\|.*?(?=\n\n|\n#|\Z)'
        match = re.search(pattern, self.content, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(0)
        # Si no encuentra, usar todo el contenido
        return self.content

    def parse(self) -> HistoriaUsuario:
        """Parsea el archivo y retorna objeto HistoriaUsuario"""

        # Extraer datos básicos de la tabla
        id_hu = self._extract_field("ID")
        nombre = self._extract_field("NOMBRE")
        epica = self._extract_field("EPICA")
        prioridad = self._extract_field("PRIORIDAD")
        descripcion = self._extract_field("DESCRIPCIÓN")
        usuario_rol = self._extract_field("USUARIO/ROL")
        wireframe = self._extract_field("WIREFRAME/DISEÑO")
        diagrama_flujo = self._extract_field("DIAGRAMA DE FLUJO DE DATOS")
        diagrama_estados = self._extract_field("DIAGRAMA DE ESTADOS")

        # Extraer reglas de negocio
        reglas_negocio = self._extract_reglas_negocio()

        # Extraer escenarios
        escenarios = self._extract_escenarios()

        # Extraer validaciones
        validaciones = self._extract_validaciones()

        # Extraer mensajes
        mensajes = self._extract_mensajes()

        # Extraer permisos
        permisos = self._extract_permisos()

        # Extraer alcance
        dentro_alcance = self._extract_alcance("DENTRO DEL ALCANCE")
        fuera_alcance = self._extract_alcance("FUERA DEL ALCANCE")

        # Extraer precondiciones
        precondiciones = self._extract_precondiciones()

        return HistoriaUsuario(
            id=id_hu,
            nombre=nombre,
            epica=epica,
            prioridad=prioridad,
            descripcion=descripcion,
            usuario_rol=usuario_rol,
            reglas_negocio=reglas_negocio,
            escenarios=escenarios,
            validaciones=validaciones,
            mensajes=mensajes,
            permisos=permisos,
            dentro_alcance=dentro_alcance,
            fuera_alcance=fuera_alcance,
            precondiciones=precondiciones,
            wireframe=wireframe,
            diagrama_flujo=diagrama_flujo,
            diagrama_estados=diagrama_estados
        )

    def _extract_field(self, field_name: str) -> str:
        """Extrae un campo de la tabla de HU (maneja campos con/sin negritas)"""
        # MÉTODO 1: Formato tabla Markdown: | CAMPO | valor |
        pattern = rf'\|\s*\*{{0,2}}{field_name}\*{{0,2}}\s*\|\s*([^|]+)\s*\|'
        # Buscar primero en la tabla de HU, si no encuentra buscar en todo el contenido
        match = re.search(pattern, self.hu_table, re.IGNORECASE)
        if not match:
            match = re.search(pattern, self.content, re.IGNORECASE)

        if match:
            value = match.group(1).strip()
            # Limpiar caracteres de escape markdown
            value = value.replace('\\_', '_')
            value = value.replace('\\(', '(')
            value = value.replace('\\)', ')')
            return value

        # MÉTODO 2: Formato texto plano (línea con campo, siguiente línea con valor)
        # Ejemplo:
        # ID
        # HU_SGINC_03
        # NOMBRE
        # Grilla de Inconsistencias
        pattern_plain = rf'^{field_name}\s*$\n+(.+?)(?=\n[A-Z][A-Z/\s]+$|\n\n|\Z)'
        match_plain = re.search(pattern_plain, self.content, re.MULTILINE | re.IGNORECASE)
        if match_plain:
            value = match_plain.group(1).strip()
            # Limpiar saltos de línea y espacios extras
            value = ' '.join(value.split())
            return value

        return ""

    def _extract_reglas_negocio(self) -> List[ReglaNegocio]:
        """🔍 PARSER UNIVERSAL - Extrae reglas de negocio en CUALQUIER formato"""
        reglas = []
        br_text = ""

        # MÉTODO 1: Buscar en tabla markdown (formato estándar SIGMA)
        pattern_field = r'\|\s*REGLAS DE NEGOCIOS.*?\|\s*([^|]+?)\s*\|'
        match = re.search(pattern_field, self.content, re.IGNORECASE | re.DOTALL)

        if match:
            br_text = match.group(1).strip()
        else:
            # MÉTODO 2: Buscar sección con ## (formato HU Ideal)
            # Ejemplo: ## REGLAS DE NEGOCIO (BR)
            pattern_section_h2 = r'##\s*REGLAS DE NEGOCIO[S]?\s*\(BR\)\s*\n+(.*?)(?=\n##[^#]|\Z)'
            match_section_h2 = re.search(pattern_section_h2, self.content, re.IGNORECASE | re.DOTALL)

            if match_section_h2:
                br_text = match_section_h2.group(1).strip()
            else:
                # MÉTODO 3: Formato texto plano - REGLAS DE NEGOCIOS (BR) seguido de BRs
                # Formato: REGLAS DE NEGOCIOS (BR)\n\n\nBR1: texto\nBR2: texto
                pattern_plain = r'REGLAS DE NEGOCIO[S]?\s*\(BR\)\s*\n+(.*?)(?=\n[A-Z][A-Z\s]+(?:\n|$)|\nPERMISOS|\nESCENARIOS|\Z)'
                match_plain = re.search(pattern_plain, self.content, re.IGNORECASE | re.DOTALL)

                if match_plain:
                    br_text = match_plain.group(1).strip()
                else:
                    # MÉTODO 4: Buscar sección de texto plano genérica (formato sin tabla)
                    # Buscar "REGLAS DE NEGOCIO" seguido por contenido hasta la siguiente sección
                    pattern_section = r'REGLAS DE NEGOCIO[S]?\s*\n(.*?)(?=\n[A-Z][A-Z\s]+\n|$)'
                    match_section = re.search(pattern_section, self.content, re.IGNORECASE | re.DOTALL)

                    if match_section:
                        br_text = match_section.group(1).strip()

        if not br_text:
            return reglas

        # EXTRACCIÓN: Patrón para formato inline (todas las BRs en una línea)
        # Ejemplo: "BR1: Texto BR2: Texto BR3: Texto" o "**BR1**: Texto **BR2**: Texto"
        pattern_inline = r'\*{0,2}BR(\d+)\*{0,2}:\s*(.+?)(?=\s*\*{0,2}BR\d+\*{0,2}:|$)'
        matches = list(re.finditer(pattern_inline, br_text, re.DOTALL))

        if matches:
            for match in matches:
                br_id = f"BR{match.group(1)}"
                descripcion = match.group(2).strip()
                # Limpiar saltos de línea internos si los hay
                descripcion = ' '.join(descripcion.split())
                reglas.append(ReglaNegocio(id=br_id, descripcion=descripcion))
            return reglas

        # EXTRACCIÓN: Patrón para formato con saltos de línea
        # Ejemplo:
        # BR1: Texto texto texto.
        # BR2: Otro texto.
        # BR3: Más texto.
        # También maneja: **BR1**: Texto texto
        pattern_newline = r'\*{0,2}BR(\d+)\*{0,2}:\s*([^\n]+)'
        matches = list(re.finditer(pattern_newline, br_text))

        if matches:
            for match in matches:
                br_id = f"BR{match.group(1)}"
                descripcion = match.group(2).strip()
                # Limpiar puntos y espacios extras al final
                descripcion = descripcion.rstrip(' .')
                reglas.append(ReglaNegocio(id=br_id, descripcion=descripcion))

        return reglas

    def _extract_escenarios(self) -> List[Escenario]:
        """🔍 PARSER UNIVERSAL - Extrae escenarios en CUALQUIER formato"""
        escenarios = []

        # MÉTODO 1: Buscar en secciones (formato ideal - HU_SGINC_06)
        escenarios = self._buscar_escenarios_en_secciones()
        if escenarios:
            return escenarios

        # MÉTODO 2: Buscar en tabla inline (formato HU_SGINC_02)
        escenarios = self._buscar_escenarios_en_tabla_inline()
        if escenarios:
            return escenarios

        # MÉTODO 3: Búsqueda en todo el documento (fallback)
        escenarios = self._buscar_escenarios_en_documento_completo()
        if escenarios:
            return escenarios

        # MÉTODO 4: Extracción flexible (último recurso)
        escenarios = self._extraccion_flexible_escenarios()

        return escenarios

    def _buscar_escenarios_en_secciones(self) -> List[Escenario]:
        """MÉTODO 1: Busca escenarios en formato de secciones separadas (incluye HU Ideal)"""
        escenarios = []

        # Buscar sección ## ESCENARIOS (incluye subsecciones ORIGINALES y AGREGADOS)
        pattern_section = r'##\s*ESCENARIOS.*?(?=\n##[^#]|\Z)'
        match_section = re.search(pattern_section, self.content, re.DOTALL | re.IGNORECASE)

        if not match_section:
            return escenarios

        escenarios_text = match_section.group(0)

        # Patrón mejorado para E1 –, E2 –, etc. con negritas
        # Ahora maneja líneas en blanco y múltiples formatos
        pattern = r'\*\*E(\d+)\s*[–-]\s*([^\*\n]+?)\*\*\s*\n+(.*?)(?=\n\s*\n\s*\*\*E\d+|\n\s*\n\s*###|\n\s*\n\s*---|\n##[^#]|\Z)'
        matches = re.finditer(pattern, escenarios_text, re.DOTALL | re.IGNORECASE)

        for match in matches:
            e_id = f"E{match.group(1)}"
            titulo = match.group(2).strip()
            contenido = match.group(3).strip()

            # Extraer DADO, CUANDO, ENTONCES
            dado = self._extract_gherkin_part(contenido, "DADO|Dado")
            cuando = self._extract_gherkin_part(contenido, "CUANDO|Cuando")
            entonces = self._extract_gherkin_part(contenido, "ENTONCES|Entonces")
            y_adicional = self._extract_gherkin_part(contenido, "Y|y ")

            # Si no encontró DADO explícito, buscar texto antes de CUANDO
            if not dado and cuando:
                pattern_implicit_dado = r'^(.+?)(?=\*\*(?:CUANDO|Cuando)\*\*)'
                match_implicit = re.search(pattern_implicit_dado, contenido, re.DOTALL | re.IGNORECASE)
                if match_implicit:
                    dado = match_implicit.group(1).strip()

            escenarios.append(Escenario(
                id=e_id,
                titulo=titulo,
                dado=dado,
                cuando=cuando,
                entonces=entonces,
                y_adicional=y_adicional if y_adicional else None
            ))

        return escenarios

    def _buscar_escenarios_en_tabla_inline(self) -> List[Escenario]:
        """MÉTODO 2: Busca escenarios en tabla inline - UNIVERSAL para todos los formatos SIGMA"""
        escenarios = []

        # Buscar el campo ESCENARIOS en tabla
        pattern_field = r'\|\s*ESCENARIOS.*?\|\s*([^|]+?)\s*\|'
        match = re.search(pattern_field, self.content, re.IGNORECASE | re.DOTALL)

        if not match:
            return escenarios

        escenarios_text = match.group(1).strip()

        if not escenarios_text or len(escenarios_text) < 10:
            return escenarios

        # ============================================================
        # ESTRATEGIA UNIVERSAL: Dividir por patrones E1, E2, E3...
        # Esto funciona independientemente del formato específico
        # ============================================================

        # Normalizar comillas especiales a comillas normales
        escenarios_text = escenarios_text.replace('"', '"').replace('"', '"').replace('"', '"')

        # Dividir el texto en bloques por cada E<número>
        # Patrón que captura E seguido de número con cualquier formato alrededor
        split_pattern = r'(?=\*{0,2}E(\d+)[\s\*":\-–]+)'
        bloques = re.split(split_pattern, escenarios_text)

        # Procesar bloques (vienen en pares: número, contenido)
        i = 1
        while i < len(bloques):
            if i + 1 < len(bloques):
                e_num = bloques[i]
                bloque_contenido = bloques[i + 1]
                i += 2
            else:
                break

            e_id = f"E{e_num}"

            # Extraer título del escenario (todo antes de Dado/DADO)
            titulo_match = re.search(
                r'^[\s\*":\-–]*([^*\n]+?)(?:\*\*)?[\s:]*(?=\*{0,2}(?:Dado|DADO|dado))',
                bloque_contenido,
                re.IGNORECASE
            )

            if titulo_match:
                titulo = titulo_match.group(1).strip()
                # Limpiar título de caracteres especiales
                titulo = re.sub(r'^[\s\*":\-–]+', '', titulo)
                titulo = re.sub(r'[\s\*":\-–]+$', '', titulo)
            else:
                titulo = f"Escenario {e_id}"

            # Preprocesar: si el formato es "**E1 – Título Dado**" separar el Dado
            # Convertir a: "Título **Dado**"
            bloque_procesado = re.sub(
                r'(\*\*)?(\s*(?:Dado|DADO|dado))(\*\*)?\s+',
                r' **Dado** ',
                bloque_contenido
            )

            # Extraer DADO, CUANDO, ENTONCES usando método robusto
            dado = self._extract_gherkin_universal(bloque_procesado, "dado")
            cuando = self._extract_gherkin_universal(bloque_procesado, "cuando")
            entonces = self._extract_gherkin_universal(bloque_procesado, "entonces")
            y_adicional = self._extract_gherkin_universal(bloque_procesado, "y")

            if dado or cuando or entonces:
                escenarios.append(Escenario(
                    id=e_id,
                    titulo=titulo,
                    dado=dado,
                    cuando=cuando,
                    entonces=entonces,
                    y_adicional=y_adicional if y_adicional else None
                ))

        return escenarios

    def _extract_gherkin_universal(self, text: str, keyword: str) -> str:
        """Extrae partes Gherkin de forma UNIVERSAL - funciona con cualquier formato"""

        # Normalizar el texto
        text = text.replace('"', '"').replace('"', '"')

        # Definir qué keywords vienen después de cada uno
        next_keywords = {
            "dado": r"(?:\*\*)?(?:cuando|CUANDO|Cuando)(?:\*\*)?",
            "cuando": r"(?:\*\*)?(?:entonces|ENTONCES|Entonces)(?:\*\*)?",
            "entonces": r"(?:\s+[yY]\s+[a-z]|\s*E\d+|$)",
            "y": r"(?:E\d+|$)"
        }

        next_kw = next_keywords.get(keyword.lower(), r"$")

        # PATRÓN 1: Con negritas **Keyword** texto
        pattern1 = rf'\*\*({keyword})\*\*\s*(que\s+)?(.*?)(?={next_kw}|\*\*(?:Dado|Cuando|Entonces|Y)\*\*|$)'
        match1 = re.search(pattern1, text, re.IGNORECASE | re.DOTALL)
        if match1:
            prefix = match1.group(2) if match1.group(2) else ""
            result = (prefix + match1.group(3)).strip()
            # Limpiar comas y puntos finales
            result = re.sub(r'[,\.\s]+$', '', result)
            if result:
                return result

        # PATRÓN 2: Sin negritas, keyword seguido de "que" hasta próximo keyword
        pattern2 = rf',?\s*\b({keyword})\s+que\s+(.*?)(?={next_kw}|,\s*(?:Dado|Cuando|Entonces)\b|$)'
        match2 = re.search(pattern2, text, re.IGNORECASE | re.DOTALL)
        if match2:
            result = "que " + match2.group(2).strip()
            result = re.sub(r'[,\.\s]+$', '', result)
            if result and result != "que":
                return result

        # PATRÓN 3: Keyword directo sin "que" (para ENTONCES principalmente)
        # Ejemplo: "Entonces el sistema muestra..."
        pattern3 = rf',?\s*\b({keyword})\s+(el\s+sistema\s+|se\s+|muestra\s+|lista\s+|vuelve\s+)(.+?)(?={next_kw}|,\s*(?:Dado|Cuando|Entonces)\b|$)'
        match3 = re.search(pattern3, text, re.IGNORECASE | re.DOTALL)
        if match3:
            result = match3.group(2) + match3.group(3)
            result = result.strip()
            result = re.sub(r'[,\.\s]+$', '', result)
            if result:
                return result

        # PATRÓN 4: Keyword con cualquier texto después (último recurso)
        pattern4 = rf',?\s*\b({keyword})\s+([^,]+?)(?={next_kw}|,\s*\*?\*?(?:Dado|Cuando|Entonces|Y)\b|$)'
        match4 = re.search(pattern4, text, re.IGNORECASE | re.DOTALL)
        if match4:
            result = match4.group(2).strip()
            result = re.sub(r'[,\.\s]+$', '', result)
            # Evitar capturar solo artículos o palabras sueltas
            if result and len(result) > 5:
                return result

        return ""

    def _buscar_escenarios_en_documento_completo(self) -> List[Escenario]:
        """MÉTODO 3: Búsqueda en todo el documento (fallback)"""
        escenarios = []

        # Buscar cualquier ocurrencia de E1, E2, E3... en el documento
        pattern = r'(?:^|\n)\s*(?:\*\*)?E(\d+)\s*[–:-]?\s*([^\n]+?)(?:\*\*)?\s*[\n\s]+.*?(?:\*\*)?(?:Dado|DADO)(?:\*\*)?\s+que\s+(.*?)(?:\*\*)?(?:Cuando|CUANDO)(?:\*\*)?\s+(.*?)(?:\*\*)?(?:Entonces|ENTONCES)(?:\*\*)?\s+(.*?)(?=\n\s*E\d+|$)'

        matches = re.finditer(pattern, self.content, re.DOTALL | re.IGNORECASE)

        for match in matches:
            e_id = f"E{match.group(1)}"
            titulo = match.group(2).strip()
            dado = match.group(3).strip()
            cuando = match.group(4).strip()
            entonces = match.group(5).strip()

            escenarios.append(Escenario(
                id=e_id,
                titulo=titulo,
                dado=dado,
                cuando=cuando,
                entonces=entonces,
                y_adicional=None
            ))

        return escenarios

    def _extraccion_flexible_escenarios(self) -> List[Escenario]:
        """MÉTODO 4: Extracción flexible - último recurso"""
        escenarios = []

        # Buscar cualquier patrón E<número> seguido de texto con dado/cuando/entonces
        pattern = r'E(\d+)[^E]*?(?:dado|DADO)[^E]*?(?:cuando|CUANDO)[^E]*?(?:entonces|ENTONCES)'
        matches = re.finditer(pattern, self.content, re.IGNORECASE | re.DOTALL)

        for match in matches:
            e_id = f"E{match.group(1)}"
            texto_completo = match.group(0)

            # Intentar extraer las partes
            dado = ""
            cuando = ""
            entonces = ""

            # Buscar DADO hasta CUANDO
            dado_match = re.search(r'(?:dado|DADO)\s+(.*?)(?:cuando|CUANDO)', texto_completo, re.IGNORECASE | re.DOTALL)
            if dado_match:
                dado = dado_match.group(1).strip()

            # Buscar CUANDO hasta ENTONCES
            cuando_match = re.search(r'(?:cuando|CUANDO)\s+(.*?)(?:entonces|ENTONCES)', texto_completo, re.IGNORECASE | re.DOTALL)
            if cuando_match:
                cuando = cuando_match.group(1).strip()

            # Buscar ENTONCES hasta final
            entonces_match = re.search(r'(?:entonces|ENTONCES)\s+(.*?)$', texto_completo, re.IGNORECASE | re.DOTALL)
            if entonces_match:
                entonces = entonces_match.group(1).strip()

            if dado or cuando or entonces:
                escenarios.append(Escenario(
                    id=e_id,
                    titulo=f"Escenario {e_id}",
                    dado=dado,
                    cuando=cuando,
                    entonces=entonces,
                    y_adicional=None
                ))

        return escenarios

    def _extract_gherkin_inline(self, text: str, keyword: str) -> str:
        """Extrae Gherkin de texto inline (sin saltos de línea ni negritas)"""
        # Patrón: **Keyword** texto hasta el próximo keyword
        pattern = rf'\*\*({keyword})\*\*\s+(.*?)(?=\s+\*\*(?:Dado|DADO|Cuando|CUANDO|Entonces|ENTONCES)|$)'
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(2).strip()

        # Sin negritas
        pattern2 = rf'\b({keyword})\b\s+que\s+(.*?)(?=\s+(?:Cuando|CUANDO|Entonces|ENTONCES)|$)'
        match2 = re.search(pattern2, text, re.IGNORECASE | re.DOTALL)
        if match2:
            return "que " + match2.group(2).strip()

        return ""

    def _extract_gherkin_simple(self, text: str, keyword: str) -> str:
        """Extrae Gherkin sin formato estricto (fallback)"""
        # Buscar keyword hasta el próximo keyword o final
        pattern = rf'\b({keyword})\b\s+(.*?)(?=\s+\b(?:Dado|DADO|dado|Cuando|CUANDO|cuando|Entonces|ENTONCES|entonces|Y|y)\b|$)'
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(2).strip()
        return ""

    def _extract_gherkin_part(self, text: str, keyword: str) -> str:
        """Extrae una parte del Gherkin (DADO, CUANDO, ENTONCES)"""
        # Primero intentar con **KEYWORD**
        pattern = rf'\*\*({keyword})\*\*\s*(.*?)(?=\*\*[A-Z]|\*\*Y|$)'
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(2).strip()

        # Si no funciona, buscar keyword sin asteriscos (caso: "opción Dado que...")
        pattern2 = rf'\b({keyword})\b\s+(que\s+)?(.+?)(?=\*\*[A-Z]|Cuando|CUANDO|Entonces|ENTONCES|Y\s+|$)'
        match2 = re.search(pattern2, text, re.DOTALL | re.IGNORECASE)
        if match2:
            # Incluir el "que" si existe
            prefix = match2.group(2) if match2.group(2) else ""
            return (prefix + match2.group(3)).strip()

        return ""

    def _extract_validaciones(self) -> List[str]:
        """Extrae lista de validaciones"""
        validaciones_text = self._extract_field("VALIDACIONES DE CAMPOS")
        return [v.strip() for v in validaciones_text.split('.') if v.strip()]

    def _extract_mensajes(self) -> List[str]:
        """Extrae lista de mensajes"""
        mensajes_text = self._extract_field("MENSAJES Y NOTIFICACIONES")
        # Buscar textos entre comillas
        pattern = r'"([^"]+)"'
        return re.findall(pattern, mensajes_text)

    def _extract_permisos(self) -> List[str]:
        """Extrae lista de permisos"""
        permisos_text = self._extract_field("PERMISOS ESPECÍFICOS")
        # Buscar "Acción: XXX"
        pattern = r'Acción:\s*([^A]+?)(?=Acción:|$)'
        matches = re.findall(pattern, permisos_text)
        return [m.strip() for m in matches if m.strip()]

    def _extract_precondiciones(self) -> List[str]:
        """Extrae precondiciones de la HU Ideal - formato tabla"""
        precondiciones = []

        # Buscar sección ## PRECONDICIONES con tabla
        pattern = r'##\s*PRECONDICIONES\s*\n+\|.*?\|\s*\n\|.*?\|\s*\n((?:\|.*?\|\s*\n)+)'
        match = re.search(pattern, self.content, re.IGNORECASE | re.DOTALL)

        if match:
            tabla_text = match.group(1)
            # Parsear filas de tabla (formato: | Categoría | Detalle |)
            lineas = tabla_text.split('\n')
            for linea in lineas:
                if '|' in linea and linea.strip():
                    partes = [p.strip() for p in linea.split('|') if p.strip()]
                    if len(partes) >= 2:
                        categoria = partes[0].replace('**', '').strip()
                        detalle = partes[1].strip()
                        if categoria and detalle and categoria.lower() not in ['categoría', 'categoria']:
                            precondiciones.append(f"{categoria}: {detalle}")

        return precondiciones

    def _extract_alcance(self, tipo: str) -> List[str]:
        """Extrae items de alcance (DENTRO/FUERA) - maneja formato tabla y sección"""
        # MÉTODO 1: Buscar en tabla
        alcance_text = self._extract_field(tipo)
        if alcance_text:
            return [item.strip() for item in alcance_text.split('.') if item.strip()]

        # MÉTODO 2: Buscar en sección con ### (formato HU Ideal)
        # Ejemplo: ### DENTRO DEL ALCANCE
        pattern = rf'###\s*{tipo}\s*\n+(.*?)(?=\n###|\n##[^#]|\Z)'
        match = re.search(pattern, self.content, re.IGNORECASE | re.DOTALL)

        if match:
            section_text = match.group(1).strip()
            # Extraer items de lista (líneas que empiezan con -)
            items = []
            for line in section_text.split('\n'):
                line = line.strip()
                if line.startswith('-'):
                    # Remover el guión y limpiar
                    item = line[1:].strip()
                    # Remover prefijos como "Dentro:" o "Fuera:"
                    item = re.sub(r'^(Dentro|Fuera):\s*', '', item, flags=re.IGNORECASE)
                    if item:
                        items.append(item)
            return items

        return []


# Función de utilidad para testing
def parse_hu(file_path: str) -> HistoriaUsuario:
    """Función auxiliar para parsear una HU"""
    parser = HUParser(file_path)
    return parser.parse()


if __name__ == "__main__":
    # Test
    import sys
    if len(sys.argv) > 1:
        hu = parse_hu(sys.argv[1])
        print(f"ID: {hu.id}")
        print(f"Nombre: {hu.nombre}")
        print(f"Reglas de Negocio: {len(hu.reglas_negocio)}")
        print(f"Escenarios: {len(hu.escenarios)}")
        for escenario in hu.escenarios:
            print(f"  - {escenario.id}: {escenario.titulo}")
