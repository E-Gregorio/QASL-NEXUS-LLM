# -*- coding: utf-8 -*-
"""
RTM Analyzer con Anthropic Claude AI v3.0
=========================================
Analizador de Matriz de Trazabilidad usando Anthropic Claude AI para analisis semantico preciso.
Reemplaza el matching por keywords con analisis de IA para precision 100%.

Autor: SIGMA QA Team
Fecha: 2025-11-29
Actualizado: 2025-12-07 - Migrado de Google Gemini a Anthropic Claude
"""

import os
import sys
import json
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import anthropic
from dotenv import load_dotenv

from parser import HistoriaUsuario, ReglaNegocio, Escenario

# Configurar UTF-8 para Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Cargar variables de entorno
load_dotenv()


@dataclass
class MapeoSemanticoAI:
    """Mapeo semantico BR -> Escenario generado por IA"""
    br_id: str
    escenario_id: str
    tipo_validacion: str  # "positivo", "negativo", "parcial", "ninguno"
    porcentaje_cobertura: float
    justificacion: str
    es_valido: bool


@dataclass
class CoberturaBRAI:
    """Cobertura de BR analizada por IA"""
    br: ReglaNegocio
    escenarios_positivos: List[str]
    escenarios_negativos: List[str]
    cobertura_porcentaje: float
    tiene_caso_positivo: bool
    tiene_caso_negativo: bool
    justificacion_ia: str
    mapeos: List[MapeoSemanticoAI] = field(default_factory=list)


@dataclass
class GapAI:
    """Gap identificado por analisis de IA"""
    id: str
    titulo: str
    descripcion: str
    br_afectada: str
    br_texto_completo: str
    tipo: str  # "CRITICO", "ALTO", "MEDIO", "BAJO"
    justificacion: str
    escenario_sugerido: str
    owasp: str = ""
    razon_gap: str = ""


class RTMAnalyzerAI:
    """Analizador RTM con Anthropic Claude AI para precision maxima"""

    def __init__(self, hu: HistoriaUsuario):
        self.hu = hu
        # Configurar Anthropic Claude
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
        self.gaps: List[GapAI] = []
        self.coberturas: List[CoberturaBRAI] = []

    def analizar(self) -> Dict:
        """Ejecuta analisis completo con Anthropic Claude AI"""
        print("   [AI] Preparando datos para analisis...")

        # Preparar datos para Claude
        datos_hu = self._preparar_datos_hu()

        print("   [AI] Enviando a Anthropic Claude para analisis semantico...")

        # Llamar a Claude para analisis
        resultado_ai = self._analizar_con_claude(datos_hu)

        print("   [AI] Procesando resultados...")

        # Procesar resultados
        self._procesar_resultado_ai(resultado_ai)

        # Calcular metricas
        metricas = self._calcular_metricas()

        return {
            "coberturas": self.coberturas,
            "gaps": self.gaps,
            "metricas": metricas,
            "analisis_ia": resultado_ai
        }

    def _preparar_datos_hu(self) -> str:
        """Prepara los datos de la HU en formato estructurado para Claude"""
        datos = {
            "hu_id": self.hu.id,
            "hu_nombre": self.hu.nombre,
            "epica": self.hu.epica,
            "descripcion": self.hu.descripcion,
            "reglas_negocio": [],
            "escenarios": [],
            "permisos": self.hu.permisos
        }

        # Reglas de negocio
        for br in self.hu.reglas_negocio:
            datos["reglas_negocio"].append({
                "id": br.id,
                "descripcion": br.descripcion
            })

        # Escenarios
        for esc in self.hu.escenarios:
            datos["escenarios"].append({
                "id": esc.id,
                "titulo": esc.titulo,
                "dado": esc.dado,
                "cuando": esc.cuando,
                "entonces": esc.entonces,
                "y_adicional": esc.y_adicional
            })

        return json.dumps(datos, ensure_ascii=False, indent=2)

    def _analizar_con_claude(self, datos_hu: str) -> Dict:
        """Envia a Anthropic Claude AI para analisis semantico preciso"""

        prompt = f"""Eres un QA Engineer Senior ISTQB CTFL/CTAL con 15+ años de experiencia en analisis de trazabilidad RTM.

═══════════════════════════════════════════════════════════════════════════════
TAREA PRINCIPAL
═══════════════════════════════════════════════════════════════════════════════
Analizar la Historia de Usuario y determinar con PRECISION 100% que escenarios
cubren cada Regla de Negocio (BR), aplicando analisis semantico profundo.

═══════════════════════════════════════════════════════════════════════════════
REGLA FUNDAMENTAL: 1 BR = 2 ESCENARIOS (1 positivo + 1 negativo)
═══════════════════════════════════════════════════════════════════════════════

Para cada BR necesitas identificar:
- 1 Escenario POSITIVO: Valida que la BR funciona correctamente (caso feliz/exitoso)
- 1 Escenario NEGATIVO: Valida que la BR rechaza/maneja errores correctamente

═══════════════════════════════════════════════════════════════════════════════
METODOLOGIA DE ANALISIS SEMANTICO - PASO A PASO
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Leer cada BR y extraer su INTENCION principal
- BR sobre ACCESO/PERMISOS → buscar escenarios que validen acceso autorizado Y denegado
- BR sobre VISUALIZACION → buscar escenarios que validen que se muestra Y que no se muestra
- BR sobre FUNCIONALIDAD → buscar escenarios que validen ejecucion exitosa Y fallida
- BR sobre DATOS → buscar escenarios que validen datos validos Y datos invalidos

PASO 2: Analizar CADA escenario con el formato DADO-CUANDO-ENTONCES
- DADO = Precondicion (estado inicial del sistema/usuario)
- CUANDO = Accion (que hace el usuario)
- ENTONCES = Resultado esperado (que debe pasar)

PASO 3: Mapear escenarios a BRs usando CORRESPONDENCIA SEMANTICA
Un escenario CUBRE una BR si:
✓ El DADO o CUANDO del escenario menciona las condiciones de la BR
✓ El ENTONCES del escenario valida el comportamiento descrito en la BR
✓ Hay relacion DIRECTA de significado (no solo palabras similares)

EJEMPLOS DE MAPEO CORRECTO:

EJEMPLO 1 - BR sobre ACCESO:
BR1: "Solo usuarios con perfil CARGA pueden acceder a la pantalla"
E1: "DADO que accedo con usuario con permisos del perfil CARGA... ENTONCES muestra la pantalla"
→ E1 es POSITIVO para BR1 (valida acceso exitoso con perfil correcto)

E4: "DADO que accedo SIN perfil CARGA... ENTONCES muestra mensaje de error"
→ E4 seria NEGATIVO para BR1 (valida rechazo sin perfil)

EJEMPLO 2 - BR sobre VISUALIZACION:
BR2: "La pantalla debe mostrar la grilla de inconsistencias"
E1: "...ENTONCES muestra la pantalla con la grilla de inconsistencias"
→ E1 es POSITIVO para BR2 (valida que se muestra la grilla)

E2: "DADO que no hay inconsistencias... ENTONCES muestra grilla vacia con mensaje"
→ E2 es NEGATIVO para BR2 (valida comportamiento cuando no hay datos)

EJEMPLO 3 - BR sobre FUNCIONALIDAD:
BR3: "Debe exponer funcionalidades Importar Lote y Carga Individual"
E1: "...ENTONCES muestra... las funcionalidades Importar Lote y Carga Individual"
→ E1 es POSITIVO para BR3 (valida que se muestran las funcionalidades)

═══════════════════════════════════════════════════════════════════════════════
DATOS DE LA HISTORIA DE USUARIO A ANALIZAR
═══════════════════════════════════════════════════════════════════════════════

{datos_hu}

═══════════════════════════════════════════════════════════════════════════════
FORMATO DE RESPUESTA - JSON EXACTO (sin markdown, solo JSON puro)
═══════════════════════════════════════════════════════════════════════════════

{{
  "analisis_coberturas": [
    {{
      "br_id": "BR1",
      "br_texto": "texto completo de la BR",
      "escenarios_positivos": ["E1"],
      "escenarios_negativos": [],
      "cobertura_porcentaje": 50,
      "justificacion": "E1 valida el acceso exitoso con perfil CARGA (positivo). No hay escenario que valide el rechazo sin perfil (falta negativo)."
    }}
  ],
  "gaps_identificados": [
    {{
      "br_id": "BR1",
      "br_texto": "texto completo de la BR",
      "tipo_gap": "falta_negativo",
      "severidad": "CRITICO",
      "descripcion": "Falta escenario que valide el rechazo de acceso cuando el usuario NO tiene perfil CARGA",
      "escenario_sugerido": {{
        "tipo": "negativo",
        "dado": "que accedo al sistema con un usuario SIN los permisos del perfil CARGA",
        "cuando": "intento ingresar a la opcion Alta de Inconsistencias",
        "entonces": "el sistema muestra un mensaje de error indicando que no tiene permisos",
        "y_adicional": "el sistema no permite el acceso a la pantalla principal"
      }},
      "owasp": "A01:2021"
    }}
  ],
  "resumen": {{
    "total_brs": 4,
    "escenarios_necesarios": 8,
    "escenarios_positivos_encontrados": 3,
    "escenarios_negativos_encontrados": 1,
    "total_escenarios_que_cubren": 4,
    "brs_100_cobertura": 1,
    "brs_50_cobertura": 2,
    "brs_0_cobertura": 1,
    "cobertura_porcentaje": 50.0
  }}
}}

═══════════════════════════════════════════════════════════════════════════════
REGLAS CRITICAS PARA GAPS
═══════════════════════════════════════════════════════════════════════════════

1. Si una BR tiene 0% cobertura → Generar DOS gaps (falta_positivo + falta_negativo)
2. Si una BR tiene solo positivo → Generar UN gap (falta_negativo)
3. Si una BR tiene solo negativo → Generar UN gap (falta_positivo)
4. Cada gap debe tener un escenario_sugerido ESPECIFICO al contexto de la BR

SEVERIDADES:
- CRITICO: BRs de seguridad, permisos, autenticacion (OWASP A01, A07)
- ALTO: BRs de integridad de datos, validaciones criticas (OWASP A03)
- MEDIO: BRs de visualizacion, navegacion
- BAJO: BRs de formato, mensajes informativos

═══════════════════════════════════════════════════════════════════════════════
INSTRUCCIONES FINALES
═══════════════════════════════════════════════════════════════════════════════

1. Analiza CADA BR individualmente con la metodologia descrita
2. Un escenario PUEDE cubrir multiples BRs si semanticamente las valida
3. Busca correspondencia SEMANTICA, no solo palabras exactas
4. Los escenarios sugeridos deben usar el CONTEXTO ESPECIFICO de la HU
5. SIEMPRE incluye justificacion detallada de por que un escenario cubre o no una BR
6. Responde SOLO con JSON valido, sin texto adicional ni bloques markdown"""

        try:
            # Usar Anthropic Claude
            message = self.client.messages.create(
                model=self.model,
                max_tokens=8000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.content[0].text

            # Limpiar respuesta (quitar markdown si existe)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            return json.loads(response_text.strip())

        except json.JSONDecodeError as e:
            print(f"   [AI] Error parseando JSON: {e}")
            print(f"   [AI] Respuesta raw: {response_text[:500]}")
            return self._resultado_fallback()
        except Exception as e:
            print(f"   [AI] Error en API: {e}")
            return self._resultado_fallback()

    def _resultado_fallback(self) -> Dict:
        """Resultado fallback si falla la API"""
        return {
            "analisis_coberturas": [],
            "gaps_identificados": [],
            "resumen": {
                "total_brs": len(self.hu.reglas_negocio),
                "brs_100_cobertura": 0,
                "brs_50_cobertura": 0,
                "brs_0_cobertura": len(self.hu.reglas_negocio),
                "cobertura_promedio": 0
            }
        }

    def _procesar_resultado_ai(self, resultado: Dict):
        """Procesa el resultado del analisis de IA"""

        # Crear diccionario de BRs para lookup
        brs_dict = {br.id: br for br in self.hu.reglas_negocio}

        # Procesar coberturas
        for cob_data in resultado.get("analisis_coberturas", []):
            br_id = cob_data.get("br_id", "")
            br = brs_dict.get(br_id)

            if br:
                positivos = cob_data.get("escenarios_positivos", [])
                negativos = cob_data.get("escenarios_negativos", [])

                cobertura = CoberturaBRAI(
                    br=br,
                    escenarios_positivos=positivos,
                    escenarios_negativos=negativos,
                    cobertura_porcentaje=cob_data.get("cobertura_porcentaje", 0),
                    tiene_caso_positivo=len(positivos) > 0,
                    tiene_caso_negativo=len(negativos) > 0,
                    justificacion_ia=cob_data.get("justificacion", "")
                )
                self.coberturas.append(cobertura)

        # Agregar BRs no analizadas con cobertura 0
        brs_analizadas = {c.br.id for c in self.coberturas}
        for br in self.hu.reglas_negocio:
            if br.id not in brs_analizadas:
                self.coberturas.append(CoberturaBRAI(
                    br=br,
                    escenarios_positivos=[],
                    escenarios_negativos=[],
                    cobertura_porcentaje=0,
                    tiene_caso_positivo=False,
                    tiene_caso_negativo=False,
                    justificacion_ia="BR no analizada - sin escenarios que la validen"
                ))

        # Procesar gaps
        gap_num = 1
        for gap_data in resultado.get("gaps_identificados", []):
            escenario_sug = gap_data.get("escenario_sugerido", {})

            # Construir escenario en formato Gherkin
            gherkin = ""
            if escenario_sug:
                gherkin = f"""DADO {escenario_sug.get('dado', 'que cumplo las precondiciones')}
CUANDO {escenario_sug.get('cuando', 'ejecuto la operacion')}
ENTONCES {escenario_sug.get('entonces', 'el sistema responde correctamente')}"""
                y_adicional = escenario_sug.get('y_adicional', '')
                if y_adicional:
                    # Evitar duplicar "Y" si ya viene en el texto
                    if y_adicional.upper().startswith('Y '):
                        gherkin += f"\n{y_adicional}"
                    else:
                        gherkin += f"\nY {y_adicional}"

            tipo_gap = gap_data.get("tipo_gap", "sin_escenarios")
            titulo = self._generar_titulo_gap(tipo_gap, gap_data.get("br_id", "BR"))

            gap = GapAI(
                id=f"GAP-{gap_num:03d}",
                titulo=titulo,
                descripcion=gap_data.get("descripcion", ""),
                br_afectada=gap_data.get("br_id", ""),
                br_texto_completo=gap_data.get("br_texto", ""),
                tipo=gap_data.get("severidad", "MEDIO"),
                justificacion=gap_data.get("descripcion", ""),
                escenario_sugerido=gherkin,
                owasp=gap_data.get("owasp", ""),
                razon_gap=tipo_gap
            )
            self.gaps.append(gap)
            gap_num += 1

    def _generar_titulo_gap(self, tipo_gap: str, br_id: str) -> str:
        """Genera titulo descriptivo para el gap"""
        titulos = {
            "sin_escenarios": f"Falta validacion de {br_id}",
            "solo_positivo": f"Falta caso negativo para {br_id}",
            "solo_negativo": f"Falta caso positivo para {br_id}",
            "falta_positivo": f"Falta escenario positivo para {br_id}",
            "falta_negativo": f"Falta escenario negativo para {br_id}"
        }
        return titulos.get(tipo_gap, f"Gap en {br_id}")

    def _calcular_metricas(self) -> Dict:
        """Calcula metricas del analisis usando formula: 1 BR = 2 Escenarios"""
        total_brs = len(self.hu.reglas_negocio)

        # REGLA FUNDAMENTAL: Escenarios necesarios = BRs * 2 (1 positivo + 1 negativo por cada BR)
        escenarios_necesarios = total_brs * 2

        brs_100 = sum(1 for c in self.coberturas if c.cobertura_porcentaje == 100)
        brs_parcial = sum(1 for c in self.coberturas if 0 < c.cobertura_porcentaje < 100)
        brs_sin_cobertura = sum(1 for c in self.coberturas if c.cobertura_porcentaje == 0)

        # Contar escenarios positivos y negativos que realmente cubren BRs
        escenarios_positivos = sum(len(c.escenarios_positivos) for c in self.coberturas)
        escenarios_negativos = sum(len(c.escenarios_negativos) for c in self.coberturas)
        total_escenarios_cubiertos = escenarios_positivos + escenarios_negativos

        # Pero cada escenario solo se cuenta una vez (no duplicar si cubre multiples BRs)
        escenarios_unicos_positivos = set()
        escenarios_unicos_negativos = set()
        for c in self.coberturas:
            escenarios_unicos_positivos.update(c.escenarios_positivos)
            escenarios_unicos_negativos.update(c.escenarios_negativos)

        total_escenarios_documentados = len(self.hu.escenarios)
        total_gaps = len(self.gaps)

        # FORMULA CORRECTA: Cobertura = (escenarios documentados / escenarios necesarios) * 100
        cobertura_escenarios = (total_escenarios_documentados / escenarios_necesarios * 100) if escenarios_necesarios > 0 else 100

        gaps_criticos = sum(1 for g in self.gaps if g.tipo == "CRITICO")
        gaps_altos = sum(1 for g in self.gaps if g.tipo == "ALTO")
        gaps_medios = sum(1 for g in self.gaps if g.tipo == "MEDIO")
        gaps_bajos = sum(1 for g in self.gaps if g.tipo == "BAJO")

        return {
            "total_brs": total_brs,
            "escenarios_necesarios": escenarios_necesarios,
            "brs_100_cobertura": brs_100,
            "brs_cobertura_parcial": brs_parcial,
            "brs_sin_cobertura": brs_sin_cobertura,
            "total_escenarios_documentados": total_escenarios_documentados,
            "escenarios_positivos_encontrados": len(escenarios_unicos_positivos),
            "escenarios_negativos_encontrados": len(escenarios_unicos_negativos),
            "total_gaps_identificados": total_gaps,
            "cobertura_escenarios": round(cobertura_escenarios, 1),
            "gaps_criticos": gaps_criticos,
            "gaps_altos": gaps_altos,
            "gaps_medios": gaps_medios,
            "gaps_bajos": gaps_bajos
        }


if __name__ == "__main__":
    # Test
    if len(sys.argv) > 1:
        from parser import parse_hu
        hu = parse_hu(sys.argv[1])
        analyzer = RTMAnalyzerAI(hu)
        resultado = analyzer.analizar()

        print(f"\n=== ANALISIS RTM AI v3.0: {hu.id} ===")
        print(f"Cobertura BRs: {resultado['metricas']['cobertura_brs_promedio']}%")
        print(f"Cobertura Escenarios: {resultado['metricas']['cobertura_escenarios']}%")
        print(f"Gaps identificados: {resultado['metricas']['total_gaps_identificados']}")
        print(f"  - CRITICOS: {resultado['metricas']['gaps_criticos']}")
        print(f"  - ALTOS: {resultado['metricas']['gaps_altos']}")
        print(f"  - MEDIOS: {resultado['metricas']['gaps_medios']}")
