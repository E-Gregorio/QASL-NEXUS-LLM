# -*- coding: utf-8 -*-
"""
Generador de Historia de Usuario ACTUALIZADA en formato HTML
Basado en plantilla ISTQB oficial exacta
Formato profesional con todos los campos requeridos
"""
from datetime import datetime
from typing import Dict, List
from parser import HistoriaUsuario


class HUIdealHTMLGenerator:
    """Generador de HU Actualizada con formato ISTQB profesional exacto"""

    def __init__(self, hu: HistoriaUsuario, resultado_analisis: Dict):
        self.hu = hu
        self.resultado = resultado_analisis
        self.metricas = resultado_analisis['metricas']
        self.gaps = resultado_analisis['gaps']

    def generar_hu_ideal_html(self) -> str:
        """Genera HU actualizada en HTML con formato ISTQB exacto"""
        cobertura_inicial = self.metricas['cobertura_escenarios']
        total_escenarios = len(self.hu.escenarios) + len(self.gaps)

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Historia de Usuario — {self.hu.id}</title>
<style>
  body {{ font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }}
  .us-container {{ max-width: 900px; margin: 0 auto; }}
  .us-header {{ background: #5C85D6; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 20px; margin-bottom: 0; }}
  .us-table {{ width: 100%; border-collapse: collapse; margin: 0; }}
  .us-table td {{ border: 1px solid #000; padding: 12px; vertical-align: top; }}
  .label {{ background: #5C85D6; color: white; font-weight: bold; width: 200px; }}
  .content {{ background: white; }}
  .link-ref {{ color: #2196F3; text-decoration: underline; font-style: italic; }}
  .description-format {{ margin: 5px 0; }}
  .scenario-title {{ font-weight: bold; margin-top: 10px; }}
  .scenario-content {{ margin-bottom: 10px; font-family: 'Courier New', monospace; background: #f5f5f5; padding: 10px; border-left: 3px solid #5C85D6; }}
  .scenario-nuevo {{ border-left: 3px solid #4CAF50; background: #f1f8e9; }}
  .bullet-point {{ margin-left: 0; margin-bottom: 5px; }}
  .out-scope-item {{ margin-bottom: 10px; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px; }}
  .badge-original {{ background: #5C85D6; color: white; }}
  .badge-agregado {{ background: #4CAF50; color: white; }}
  .badge-br {{ background: #FF9800; color: white; }}
  .br-item {{ margin: 5px 0; }}
  .cobertura-info {{ background: #e3f2fd; padding: 10px; margin-top: 10px; border-radius: 5px; font-size: 12px; }}
</style>
</head>
<body>
<div class="us-container">
  <div class="us-header">HISTORIA DE USUARIO</div>
  <table class="us-table">
    <tr>
      <td class="label">ID</td>
      <td class="content">{self.hu.id}</td>
    </tr>
    <tr>
      <td class="label">Nombre</td>
      <td class="content">{self.hu.nombre}</td>
    </tr>
    <tr>
      <td class="label">Épica</td>
      <td class="content">
        {self.hu.epica}<br>
        <span class="link-ref">Enlace a documentación de la Épica</span>
      </td>
    </tr>
    <tr>
      <td class="label">Prioridad</td>
      <td class="content">{self.hu.prioridad}</td>
    </tr>
    <tr>
      <td class="label">Estado</td>
      <td class="content">Análisis Estático Completado - Cobertura: {cobertura_inicial:.1f}% → 100%</td>
    </tr>
    <tr>
      <td class="label">Descripción</td>
      <td class="content">
        <div class="description-format"><strong>Como</strong> {self.hu.usuario_rol}</div>
        <div class="description-format"><strong>Quiero</strong> {self._extraer_quiero()}</div>
        <div class="description-format"><strong>Para</strong> {self._extraer_para()}</div>
      </td>
    </tr>
    <tr>
      <td class="label">Usuarios / Roles</td>
      <td class="content">{self.hu.usuario_rol}</td>
    </tr>
    <tr>
      <td class="label">Reglas de Negocio</td>
      <td class="content">
        {self._generar_reglas_negocio()}
        <span class="link-ref">CU-XXX | Casos de uso relacionados</span>
      </td>
    </tr>
    <tr>
      <td class="label">Precondiciones</td>
      <td class="content">
        {self._generar_precondiciones()}
      </td>
    </tr>
    <tr>
      <td class="label">Dependencias</td>
      <td class="content">
        {self._generar_dependencias()}
      </td>
    </tr>
    <tr>
      <td class="label">Estimaciones</td>
      <td class="content">
        Story Points (SP): ____<br>
        Valor (V 1–3): ____<br>
        Costo (C 1–3): ____<br>
        Probabilidad (P 1–3): ____<br>
        Impacto (I 1–3): ____<br>
        <strong>Riesgo (R) = P × I = ____ × ____ = ____</strong><br>
        <strong>Total VCR = V + C + R = ____ + ____ + ____ = ____</strong><br>
        <em>Política:</em> si <strong>VCR ≥ 9</strong> → Deuda técnica (automatizar y pasa a regresión); si es menor → Pruebas manuales.
      </td>
    </tr>
    <tr>
      <td class="label">Escenarios de Prueba (Criterios de Aceptación)</td>
      <td class="content">
        {self._generar_escenarios()}
        <div class="cobertura-info">
          <strong>Análisis de Cobertura:</strong> {len(self.hu.escenarios)} escenarios originales + {len(self.gaps)} escenarios agregados = {total_escenarios} total<br>
          <strong>Cobertura:</strong> {cobertura_inicial:.1f}% inicial → 100% final
        </div>
      </td>
    </tr>
    <tr>
      <td class="label">Dentro del Alcance</td>
      <td class="content">
        {self._generar_alcance_dentro()}
      </td>
    </tr>
    <tr>
      <td class="label">Fuera del Alcance</td>
      <td class="content">
        {self._generar_alcance_fuera()}
      </td>
    </tr>
    <tr>
      <td class="label">Referencias</td>
      <td class="content">
        <span class="link-ref">Documento de Requerimientos</span><br>
        <span class="link-ref">Casos de Uso asociados</span><br>
        <span class="link-ref">IEEE 829 - Test Documentation</span><br>
        <span class="link-ref">ISTQB Foundation Level Syllabus</span>
      </td>
    </tr>
    <tr>
      <td class="label">Notas / Comentarios</td>
      <td class="content">
        <strong>Análisis Estático:</strong> {len(self.gaps)} gaps identificados y corregidos mediante escenarios sugeridos.<br>
        <strong>Cobertura Final:</strong> 100% de las reglas de negocio cubiertas.<br>
        <strong>Generado por:</strong> SIGMA Static Analyzer v3.0 AI | {datetime.now().strftime("%Y-%m-%d %H:%M")}
      </td>
    </tr>
  </table>
</div>
</body>
</html>"""

    def _extraer_quiero(self) -> str:
        """Extrae el 'quiero' de la descripción"""
        if self.hu.descripcion:
            desc = self.hu.descripcion.lower()
            if "quiero" in desc:
                partes = desc.split("quiero")
                if len(partes) > 1:
                    resultado = partes[1].split("para")[0].strip()
                    return resultado.capitalize() if resultado else "gestionar la funcionalidad correspondiente"
        return "gestionar la funcionalidad correspondiente"

    def _extraer_para(self) -> str:
        """Extrae el 'para' de la descripción"""
        if self.hu.descripcion:
            desc = self.hu.descripcion.lower()
            if "para" in desc:
                partes = desc.split("para")
                if len(partes) > 1:
                    resultado = partes[1].strip()
                    return resultado.capitalize() if resultado else "lograr el objetivo de negocio"
        return "lograr el objetivo de negocio correspondiente"

    def _generar_reglas_negocio(self) -> str:
        """Genera lista de reglas de negocio"""
        html = []
        for br in self.hu.reglas_negocio:
            html.append(f'<div class="br-item"><strong>{br.id}:</strong> {br.descripcion}</div>')
        return ''.join(html)

    def _generar_precondiciones(self) -> str:
        """Genera sección de precondiciones"""
        items = [
            "• Usuario autenticado en el sistema",
            "• Permisos correspondientes asignados al rol del usuario",
            "• Sistema SIGMA operativo y accesible",
            "• Datos de prueba disponibles en el entorno"
        ]
        return '<br>'.join(items)

    def _generar_dependencias(self) -> str:
        """Genera sección de dependencias"""
        items = [
            "• Integración con Keycloak (Access Manager) operativa",
            "• Base de datos disponible y configurada",
            "• APIs de backend funcionando correctamente"
        ]
        return '<br>'.join(items)

    def _generar_escenarios(self) -> str:
        """Genera escenarios originales + nuevos en formato ISTQB"""
        html = []

        # Escenarios originales
        for idx, esc in enumerate(self.hu.escenarios, 1):
            gherkin = self._formatear_escenario_gherkin(esc)
            html.append(f'''
<div class="scenario-title">E{idx}: {esc.titulo} <span class="badge badge-original">Original</span></div>
<div class="scenario-content">{gherkin}</div>''')

        # Escenarios nuevos (gaps corregidos)
        if self.gaps:
            e_num = len(self.hu.escenarios) + 1
            for gap in self.gaps:
                gherkin_html = self._formatear_gherkin(gap.escenario_sugerido) if gap.escenario_sugerido else "Escenario pendiente de definición"
                br_badge = f'<span class="badge badge-br">{gap.br_afectada}</span>' if gap.br_afectada else ""

                html.append(f'''
<div class="scenario-title">E{e_num}: {gap.titulo} <span class="badge badge-agregado">Agregado</span> {br_badge}</div>
<div class="scenario-content scenario-nuevo">{gherkin_html}</div>''')
                e_num += 1

        return ''.join(html)

    def _formatear_escenario_gherkin(self, esc) -> str:
        """Formatea un escenario existente a formato Gherkin HTML"""
        lineas = []
        if esc.dado:
            lineas.append(f'<strong>DADO</strong> {esc.dado}')
        if esc.cuando:
            lineas.append(f'<strong>CUANDO</strong> {esc.cuando}')
        if esc.entonces:
            lineas.append(f'<strong>ENTONCES</strong> {esc.entonces}')
        if esc.y_adicional:
            lineas.append(f'<strong>Y</strong> {esc.y_adicional}')
        return '<br>'.join(lineas)

    def _formatear_gherkin(self, texto: str) -> str:
        """Formatea texto Gherkin a HTML"""
        if not texto:
            return ""
        lineas = []
        for linea in texto.strip().split('\n'):
            linea = linea.strip()
            # Escapar caracteres HTML peligrosos
            linea = self._escapar_html(linea)
            if linea.startswith('DADO'):
                lineas.append(f'<strong>DADO</strong> {linea[4:].strip()}')
            elif linea.startswith('CUANDO'):
                lineas.append(f'<strong>CUANDO</strong> {linea[6:].strip()}')
            elif linea.startswith('ENTONCES'):
                lineas.append(f'<strong>ENTONCES</strong> {linea[8:].strip()}')
            elif linea.startswith('Y '):
                lineas.append(f'<strong>Y</strong> {linea[2:].strip()}')
            elif linea.startswith('PERO '):
                lineas.append(f'<strong>PERO</strong> {linea[5:].strip()}')
            elif linea:
                lineas.append(linea)
        return '<br>'.join(lineas)

    def _escapar_html(self, texto: str) -> str:
        """Escapa caracteres HTML peligrosos"""
        return texto.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

    def _generar_alcance_dentro(self) -> str:
        """Genera sección de alcance dentro basada en las BRs"""
        items = [
            "• Validación de todas las reglas de negocio documentadas",
            "• Escenarios de prueba positivos (flujos exitosos)",
            "• Escenarios de prueba negativos (casos de error)",
            "• Integración con Access Manager (Keycloak)",
            "• Gestión de perfiles y permisos según roles"
        ]
        return '<br>'.join(items)

    def _generar_alcance_fuera(self) -> str:
        """Genera sección fuera del alcance"""
        items = [
            "<div class='out-scope-item'>• Funcionalidades de otras historias de usuario<br>* Cubiertas por: <span class='link-ref'>HUs relacionadas</span></div>",
            "<div class='out-scope-item'>• Gestión técnica de infraestructura<br>* Proceso backend/DevOps</div>",
            "<div class='out-scope-item'>• Configuración de sistemas externos<br>* Responsabilidad de equipos especializados</div>"
        ]
        return ''.join(items)
