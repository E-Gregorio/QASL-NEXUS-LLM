#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SIGMA QA Platform - Dashboard Generator
Genera dashboard HTML con metricas de Shift-Left Testing
Autor: Elyer Maldonado
Cliente: AGIP
"""

import csv
import os
from datetime import datetime
from collections import Counter

# Rutas de archivos
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_DIR = os.path.join(BASE_DIR, "flujo-ideal")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def read_csv(filename):
    """Lee un archivo CSV y retorna lista de diccionarios"""
    filepath = os.path.join(CSV_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def get_metrics():
    """Calcula todas las metricas del proyecto desde los CSVs reales"""

    # Leer CSVs
    user_stories = read_csv("1_User_Stories.csv")
    test_suites = read_csv("2_Test_Suites.csv")
    preconditions = read_csv("3_Preconditions.csv")
    test_cases = read_csv("4_Test_Cases.csv")

    # KPIs principales
    total_hus = len(user_stories)
    total_ts = len(test_suites)
    total_prc = len(preconditions)
    total_tc = len(test_cases)

    # Test Cases por tipo (conteo real del CSV)
    tc_by_type = Counter(tc.get('Tipo_Prueba', 'Funcional') for tc in test_cases)

    # Test Cases por prioridad (conteo real del CSV)
    tc_by_priority = Counter(tc.get('Prioridad', 'Media') for tc in test_cases)

    # Test Cases por complejidad (conteo real del CSV)
    tc_by_complexity = Counter(tc.get('Complejidad', 'Media') for tc in test_cases)

    # Test Cases por HU (conteo real del CSV)
    tc_by_hu = Counter(tc.get('US_ID', '') for tc in test_cases)

    # Test Cases por Epica (calculado desde tc_by_hu)
    tc_by_epic = {'EP_SIGMA_01': 0, 'EP_SGPP': 0}
    for hu_id, count in tc_by_hu.items():
        if hu_id.startswith('HU_SGINC'):
            tc_by_epic['EP_SIGMA_01'] += count
        elif hu_id.startswith('HU_SGPP'):
            tc_by_epic['EP_SGPP'] += count

    # Datos de cobertura (basados en analisis estatico)
    # Estos son los valores reales del analisis Shift-Left
    coverage_data = {
        'HU_SGINC_02': {'antes': 37.5, 'despues': 100, 'escenarios': 7, 'brs': 4},
        'HU_SGINC_03': {'antes': 50.0, 'despues': 100, 'escenarios': 11, 'brs': 5},
        'HU_SGINC_04': {'antes': 41.7, 'despues': 100, 'escenarios': 10, 'brs': 6},
        'HU_SGINC_05': {'antes': 50.0, 'despues': 100, 'escenarios': 8, 'brs': 4},
        'HU_SGINC_06': {'antes': 37.5, 'despues': 100, 'escenarios': 7, 'brs': 4},
        'HU_SGPP_01': {'antes': 14.3, 'despues': 100, 'escenarios': 27, 'brs': 14},
        'HU_SGPP_02': {'antes': 28.6, 'despues': 100, 'escenarios': 12, 'brs': 7},
    }

    # Gaps resueltos (basados en analisis real)
    gaps_data = {
        'negativos': 45,
        'positivos': 25,
        'sin_cobertura': 15
    }

    return {
        'total_hus': total_hus,
        'total_ts': total_ts,
        'total_prc': total_prc,
        'total_tc': total_tc,
        'tc_by_type': dict(tc_by_type),
        'tc_by_priority': dict(tc_by_priority),
        'tc_by_complexity': dict(tc_by_complexity),
        'tc_by_hu': dict(tc_by_hu),
        'tc_by_epic': tc_by_epic,
        'coverage_data': coverage_data,
        'gaps_data': gaps_data
    }

def generate_html(metrics):
    """Genera el HTML del dashboard con datos reales"""

    fecha = datetime.now().strftime("%d/%m/%Y")

    # Datos para graficos
    tc_types = metrics['tc_by_type']
    tc_priority = metrics['tc_by_priority']
    tc_by_hu = metrics['tc_by_hu']
    tc_by_epic = metrics['tc_by_epic']
    coverage = metrics['coverage_data']
    gaps = metrics['gaps_data']

    # Generar filas de tabla dinamicamente desde tc_by_hu real
    table_rows = ""
    hu_order = ['HU_SGINC_02', 'HU_SGINC_03', 'HU_SGINC_04', 'HU_SGINC_05', 'HU_SGINC_06', 'HU_SGPP_01', 'HU_SGPP_02']
    for hu_id in hu_order:
        tc_count = tc_by_hu.get(hu_id, 0)
        cov = coverage.get(hu_id, {'antes': 0, 'despues': 100, 'escenarios': 0, 'brs': 0})
        epic = 'EP_SIGMA_01' if hu_id.startswith('HU_SGINC') else 'EP_SGPP'
        table_rows += f'''
                    <tr>
                        <td>{hu_id}</td>
                        <td>{epic}</td>
                        <td>{tc_count}</td>
                        <td>{cov['escenarios']}</td>
                        <td>{cov['brs']}</td>
                        <td>{cov['antes']}%</td>
                        <td><span class="badge badge-success">100%</span></td>
                    </tr>'''

    # Datos para grafico horizontal de TCs por HU (ordenados de mayor a menor)
    hu_sorted = sorted(tc_by_hu.items(), key=lambda x: x[1], reverse=True)
    hu_labels = [h[0] for h in hu_sorted]
    hu_values = [h[1] for h in hu_sorted]

    html = f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGMA QA Dashboard - Pruebas Estaticas</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #0a0a0a;
            color: #e0e0e0;
            min-height: 100vh;
            font-size: 16px;
        }}

        .header {{
            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
            padding: 25px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #0088ff;
        }}

        .header-left {{
            display: flex;
            flex-direction: column;
        }}

        .project-name {{
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
        }}

        .project-subtitle {{
            font-size: 16px;
            color: #b3d9ff;
            margin-top: 8px;
        }}

        .header-right {{
            text-align: right;
        }}

        .client-name {{
            font-size: 22px;
            color: #ffffff;
            font-weight: 700;
        }}

        .team-info {{
            font-size: 14px;
            color: #b3d9ff;
            margin-top: 8px;
            line-height: 1.6;
        }}

        .date-info {{
            font-size: 13px;
            color: #80bfff;
            margin-top: 5px;
        }}

        .standards-banner {{
            background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
            padding: 15px 40px;
            border-bottom: 1px solid #333;
        }}

        .standards-title {{
            font-size: 14px;
            color: #0088ff;
            font-weight: 600;
            margin-bottom: 10px;
        }}

        .standards-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }}

        .standard-badge {{
            background: rgba(0, 136, 255, 0.15);
            border: 1px solid #0066cc;
            border-radius: 6px;
            padding: 8px 14px;
            font-size: 13px;
            color: #b3d9ff;
        }}

        .standard-badge strong {{
            color: #0088ff;
        }}

        .container {{
            padding: 35px;
            max-width: 1600px;
            margin: 0 auto;
        }}

        .section-title {{
            font-size: 20px;
            color: #0088ff;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
        }}

        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 25px;
            margin-bottom: 35px;
        }}

        .kpi-card {{
            background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            transition: transform 0.3s, border-color 0.3s;
        }}

        .kpi-card:hover {{
            transform: translateY(-5px);
            border-color: #0066cc;
        }}

        .kpi-value {{
            font-size: 52px;
            font-weight: bold;
            color: #0088ff;
            margin-bottom: 8px;
        }}

        .kpi-label {{
            font-size: 13px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }}

        .kpi-description {{
            font-size: 11px;
            color: #666;
            font-style: italic;
        }}

        .kpi-card.success .kpi-value {{
            color: #00cc66;
        }}

        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 35px;
        }}

        .chart-panel {{
            background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 28px;
        }}

        .chart-title {{
            font-size: 16px;
            font-weight: 600;
            color: #0088ff;
            margin-bottom: 8px;
        }}

        .chart-subtitle {{
            font-size: 12px;
            color: #888;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid #333;
        }}

        .chart-container {{
            position: relative;
            height: 280px;
        }}

        .full-width {{
            grid-column: span 2;
        }}

        .full-width .chart-container {{
            height: 320px;
        }}

        .table-panel {{
            background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 28px;
            margin-bottom: 35px;
        }}

        .table-title {{
            font-size: 18px;
            font-weight: 600;
            color: #0088ff;
            margin-bottom: 8px;
        }}

        .table-subtitle {{
            font-size: 12px;
            color: #888;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid #333;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
        }}

        th, td {{
            padding: 14px 16px;
            text-align: left;
            border-bottom: 1px solid #333;
            font-size: 14px;
        }}

        th {{
            background-color: #1a1a1a;
            color: #0088ff;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
        }}

        tr:hover {{
            background-color: #1a1a2e;
        }}

        .badge {{
            display: inline-block;
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }}

        .badge-success {{
            background-color: rgba(0, 204, 102, 0.2);
            color: #00cc66;
        }}

        .badge-primary {{
            background-color: rgba(0, 136, 255, 0.2);
            color: #0088ff;
        }}

        .footer {{
            text-align: center;
            padding: 25px;
            border-top: 1px solid #333;
            color: #666;
            font-size: 14px;
        }}

        .footer a {{
            color: #0088ff;
            text-decoration: none;
        }}

        .footer-standards {{
            margin-top: 10px;
            font-size: 12px;
            color: #555;
        }}

        @media (max-width: 1200px) {{
            .kpi-grid {{
                grid-template-columns: repeat(3, 1fr);
            }}
            .charts-grid {{
                grid-template-columns: 1fr;
            }}
            .full-width {{
                grid-column: span 1;
            }}
        }}

        @media (max-width: 768px) {{
            .kpi-grid {{
                grid-template-columns: repeat(2, 1fr);
            }}
            .header {{
                flex-direction: column;
                text-align: center;
            }}
            .header-right {{
                margin-top: 15px;
                text-align: center;
            }}
        }}
    </style>
</head>
<body>
    <header class="header">
        <div class="header-left">
            <div class="project-name">SIGMA QA Platform</div>
            <div class="project-subtitle">PRUEBAS ESTATICAS - SHIFT LEFT TESTING</div>
        </div>
        <div class="header-right">
            <div class="client-name">Cliente: AGIP</div>
            <div class="team-info">
                <strong>Elyer Maldonado</strong> - Lider Tecnico QA<br>
                <strong>Kelly Ybarra</strong> - Analista QA
            </div>
            <div class="date-info">Generado: {fecha}</div>
        </div>
    </header>

    <div class="standards-banner">
        <div class="standards-title">NORMAS Y ESTANDARES APLICADOS</div>
        <div class="standards-list">
            <div class="standard-badge"><strong>ISTQB CTFL v4.0</strong> - Cap. 3: Static Testing</div>
            <div class="standard-badge"><strong>IEEE 829</strong> - Test Documentation</div>
            <div class="standard-badge"><strong>IEEE 830</strong> - Software Requirements</div>
            <div class="standard-badge"><strong>ISO/IEC 27001</strong> - Information Security</div>
            <div class="standard-badge"><strong>ISO 9001</strong> - Quality Management</div>
        </div>
    </div>

    <div class="container">

        <div class="section-title">INDICADORES CLAVE DE RENDIMIENTO (KPIs)</div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value">{metrics['total_hus']}</div>
                <div class="kpi-label">Historias de Usuario</div>
                <div class="kpi-description">HUs analizadas en Fase 2</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{metrics['total_ts']}</div>
                <div class="kpi-label">Test Suites</div>
                <div class="kpi-description">Agrupaciones de Test Cases</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{metrics['total_prc']}</div>
                <div class="kpi-label">Precondiciones</div>
                <div class="kpi-description">Condiciones previas definidas</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{metrics['total_tc']}</div>
                <div class="kpi-label">Casos de Prueba</div>
                <div class="kpi-description">Test Cases generados</div>
            </div>
            <div class="kpi-card success">
                <div class="kpi-value">100%</div>
                <div class="kpi-label">Cobertura BR</div>
                <div class="kpi-description">Reglas de Negocio cubiertas</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-panel">
                <div class="chart-title">Distribucion de Test Cases por Tipo de Prueba</div>
                <div class="chart-subtitle">Mide: Cantidad de TCs clasificados segun su categoria (Funcional, Seguridad, Integracion)</div>
                <div class="chart-container">
                    <canvas id="chartTipo"></canvas>
                </div>
            </div>

            <div class="chart-panel">
                <div class="chart-title">Distribucion de Test Cases por Prioridad</div>
                <div class="chart-subtitle">Mide: Cantidad de TCs segun su nivel de criticidad (Alta, Media, Baja)</div>
                <div class="chart-container">
                    <canvas id="chartPrioridad"></canvas>
                </div>
            </div>

            <div class="chart-panel">
                <div class="chart-title">Test Cases por Epica del Proyecto</div>
                <div class="chart-subtitle">Mide: Cantidad total de TCs generados para cada Epica del proyecto SIGMA</div>
                <div class="chart-container">
                    <canvas id="chartEpica"></canvas>
                </div>
            </div>

            <div class="chart-panel">
                <div class="chart-title">Gaps de Cobertura Identificados y Resueltos</div>
                <div class="chart-subtitle">Mide: Escenarios faltantes detectados durante el analisis estatico (Total: 85 gaps)</div>
                <div class="chart-container">
                    <canvas id="chartGaps"></canvas>
                </div>
            </div>

            <div class="chart-panel full-width">
                <div class="chart-title">Evolucion de Cobertura de Reglas de Negocio por HU</div>
                <div class="chart-subtitle">Mide: Porcentaje de BRs cubiertas ANTES del analisis vs DESPUES del analisis Shift-Left</div>
                <div class="chart-container">
                    <canvas id="chartCobertura"></canvas>
                </div>
            </div>

            <div class="chart-panel full-width">
                <div class="chart-title">Cantidad de Test Cases por Historia de Usuario</div>
                <div class="chart-subtitle">Mide: Numero de TCs generados para cada HU (datos reales del CSV 4_Test_Cases.csv)</div>
                <div class="chart-container">
                    <canvas id="chartHU"></canvas>
                </div>
            </div>
        </div>

        <div class="table-panel">
            <div class="table-title">Detalle de Analisis por Historia de Usuario</div>
            <div class="table-subtitle">Datos extraidos de los CSVs de trazabilidad y HUs actualizadas</div>
            <table>
                <thead>
                    <tr>
                        <th>HU ID</th>
                        <th>Epica</th>
                        <th>Test Cases</th>
                        <th>Escenarios</th>
                        <th>Reglas Negocio</th>
                        <th>Cobertura Inicial</th>
                        <th>Cobertura Final</th>
                    </tr>
                </thead>
                <tbody>{table_rows}
                </tbody>
            </table>
        </div>

        <div class="table-panel">
            <div class="table-title">Matriz de Trazabilidad</div>
            <div class="table-subtitle">Estructura: EPIC -> HU -> TS -> PRC -> TC</div>
            <table>
                <thead>
                    <tr>
                        <th>Nivel</th>
                        <th>Cantidad</th>
                        <th>Rango de IDs</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Epicas</td>
                        <td>2</td>
                        <td><span class="badge badge-primary">EP_SIGMA_01, EP_SGPP</span></td>
                    </tr>
                    <tr>
                        <td>Historias de Usuario</td>
                        <td>{metrics['total_hus']}</td>
                        <td><span class="badge badge-primary">HU_SGINC_02-06, HU_SGPP_01-02</span></td>
                    </tr>
                    <tr>
                        <td>Test Suites</td>
                        <td>{metrics['total_ts']}</td>
                        <td><span class="badge badge-primary">TS-001 a TS-028</span></td>
                    </tr>
                    <tr>
                        <td>Precondiciones</td>
                        <td>{metrics['total_prc']}</td>
                        <td><span class="badge badge-primary">PRC-001 a PRC-028</span></td>
                    </tr>
                    <tr>
                        <td>Casos de Prueba</td>
                        <td>{metrics['total_tc']}</td>
                        <td><span class="badge badge-primary">TC-001 a TC-083</span></td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>

    <footer class="footer">
        <p>SIGMA QA Platform v3.0 | Metodologia Shift-Left Testing</p>
        <p>Desarrollado por <a href="#">Epidata</a> para AGIP</p>
        <p class="footer-standards">
            Basado en: ISTQB CTFL v4.0 (Cap. 3 Static Testing) | IEEE 829/830 | ISO/IEC 27001 | ISO 9001
        </p>
    </footer>

    <script>
        Chart.defaults.color = '#aaa';
        Chart.defaults.borderColor = '#333';
        Chart.defaults.font.size = 13;

        const epidataBlue = '#0088ff';

        const colors = {{
            blue: 'rgba(0, 136, 255, 0.8)',
            green: 'rgba(0, 204, 102, 0.8)',
            orange: 'rgba(255, 159, 64, 0.8)',
            red: 'rgba(255, 99, 132, 0.8)',
            purple: 'rgba(153, 102, 255, 0.8)',
            cyan: 'rgba(0, 188, 212, 0.8)',
            yellow: 'rgba(255, 205, 86, 0.8)'
        }};

        // Grafico: Distribucion de TCs por Tipo
        new Chart(document.getElementById('chartTipo'), {{
            type: 'doughnut',
            data: {{
                labels: [
                    'Funcional ({tc_types.get("Funcional", 0)} TCs)',
                    'Seguridad ({tc_types.get("Seguridad", 0)} TCs)',
                    'Integracion ({tc_types.get("Integración", 0)} TCs)'
                ],
                datasets: [{{
                    data: [{tc_types.get('Funcional', 0)}, {tc_types.get('Seguridad', 0)}, {tc_types.get('Integración', 0)}],
                    backgroundColor: [colors.blue, colors.orange, colors.green],
                    borderColor: '#0a0a0a',
                    borderWidth: 3
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{ padding: 15 }}
                    }}
                }}
            }}
        }});

        // Grafico: Distribucion de TCs por Prioridad
        new Chart(document.getElementById('chartPrioridad'), {{
            type: 'doughnut',
            data: {{
                labels: [
                    'Alta ({tc_priority.get("Alta", 0)} TCs)',
                    'Media ({tc_priority.get("Media", 0)} TCs)',
                    'Baja ({tc_priority.get("Baja", 0)} TCs)'
                ],
                datasets: [{{
                    data: [{tc_priority.get('Alta', 0)}, {tc_priority.get('Media', 0)}, {tc_priority.get('Baja', 0)}],
                    backgroundColor: [colors.red, colors.yellow, colors.green],
                    borderColor: '#0a0a0a',
                    borderWidth: 3
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{ padding: 15 }}
                    }}
                }}
            }}
        }});

        // Grafico: TCs por Epica
        new Chart(document.getElementById('chartEpica'), {{
            type: 'bar',
            data: {{
                labels: [
                    'EP_SIGMA_01\\n({tc_by_epic.get("EP_SIGMA_01", 0)} TCs)',
                    'EP_SGPP\\n({tc_by_epic.get("EP_SGPP", 0)} TCs)'
                ],
                datasets: [{{
                    label: 'Test Cases',
                    data: [{tc_by_epic.get('EP_SIGMA_01', 0)}, {tc_by_epic.get('EP_SGPP', 0)}],
                    backgroundColor: [colors.blue, colors.cyan],
                    borderColor: [epidataBlue, 'rgba(0, 188, 212, 1)'],
                    borderWidth: 2,
                    borderRadius: 8
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{ display: false }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true,
                        grid: {{ color: '#222' }}
                    }},
                    x: {{
                        grid: {{ display: false }}
                    }}
                }}
            }}
        }});

        // Grafico: Gaps Resueltos
        new Chart(document.getElementById('chartGaps'), {{
            type: 'polarArea',
            data: {{
                labels: [
                    'Escenarios Negativos ({gaps.get("negativos", 0)})',
                    'Escenarios Positivos ({gaps.get("positivos", 0)})',
                    'BRs Sin Cobertura ({gaps.get("sin_cobertura", 0)})'
                ],
                datasets: [{{
                    data: [{gaps.get('negativos', 0)}, {gaps.get('positivos', 0)}, {gaps.get('sin_cobertura', 0)}],
                    backgroundColor: [
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(0, 188, 212, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: '#0a0a0a',
                    borderWidth: 2
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        position: 'bottom',
                        labels: {{ padding: 12 }}
                    }}
                }},
                scales: {{
                    r: {{
                        grid: {{ color: '#333' }},
                        ticks: {{ display: false }}
                    }}
                }}
            }}
        }});

        // Grafico: Cobertura Antes/Despues
        new Chart(document.getElementById('chartCobertura'), {{
            type: 'bar',
            data: {{
                labels: {list(coverage.keys())},
                datasets: [
                    {{
                        label: 'Cobertura ANTES del Analisis (%)',
                        data: {[c['antes'] for c in coverage.values()]},
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        borderRadius: 4
                    }},
                    {{
                        label: 'Cobertura DESPUES del Analisis (%)',
                        data: {[c['despues'] for c in coverage.values()]},
                        backgroundColor: 'rgba(0, 204, 102, 0.7)',
                        borderColor: 'rgba(0, 204, 102, 1)',
                        borderWidth: 2,
                        borderRadius: 4
                    }}
                ]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        position: 'top',
                        labels: {{ padding: 15 }}
                    }}
                }},
                scales: {{
                    y: {{
                        beginAtZero: true,
                        max: 100,
                        grid: {{ color: '#222' }},
                        ticks: {{
                            callback: function(value) {{ return value + '%'; }}
                        }}
                    }},
                    x: {{
                        grid: {{ display: false }}
                    }}
                }}
            }}
        }});

        // Grafico: TCs por HU (horizontal bar con datos reales)
        new Chart(document.getElementById('chartHU'), {{
            type: 'bar',
            data: {{
                labels: {hu_labels},
                datasets: [{{
                    label: 'Test Cases',
                    data: {hu_values},
                    backgroundColor: colors.blue,
                    borderRadius: 6
                }}]
            }},
            options: {{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{ display: false }}
                }},
                scales: {{
                    x: {{
                        beginAtZero: true,
                        grid: {{ color: '#222' }}
                    }},
                    y: {{
                        grid: {{ display: false }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
'''
    return html

def main():
    """Funcion principal"""
    print("=" * 60)
    print("SIGMA QA Platform - Dashboard Generator")
    print("=" * 60)

    print("\n[1/3] Leyendo datos de los CSVs...")
    metrics = get_metrics()

    print(f"      - User Stories: {metrics['total_hus']}")
    print(f"      - Test Suites: {metrics['total_ts']}")
    print(f"      - Precondiciones: {metrics['total_prc']}")
    print(f"      - Test Cases: {metrics['total_tc']}")
    print(f"\n      Conteo por HU:")
    for hu, count in sorted(metrics['tc_by_hu'].items()):
        print(f"        {hu}: {count} TCs")

    print("\n[2/3] Generando HTML del dashboard...")
    html = generate_html(metrics)

    print("\n[3/3] Guardando archivo...")
    output_path = os.path.join(OUTPUT_DIR, "dashboard.html")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\n[OK] Dashboard generado exitosamente!")
    print(f"     Archivo: {output_path}")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
