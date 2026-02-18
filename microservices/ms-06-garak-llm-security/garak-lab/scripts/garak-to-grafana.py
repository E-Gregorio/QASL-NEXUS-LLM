#!/usr/bin/env python3
"""
Garak to Grafana - Monitor de reportes en tiempo real (v2.0)

Metricas extraidas del reporte JSONL REAL de Garak:
- Probes ejecutados y sus resultados
- Detectors utilizados y pass/fail rates
- DEFCON level calculado dinamicamente
- Progreso en tiempo real

Uso:
  Terminal 1: python garak-to-grafana.py --watch
  Terminal 2: python run-test.py demo
"""

import os
import sys
import json
import time
import argparse
import re
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Cargar .env
from dotenv import load_dotenv
BASE_DIR = Path(__file__).parent.parent
load_dotenv(BASE_DIR.parent / '.env')

PUSHGATEWAY_URL = os.getenv('PUSHGATEWAY_URL', 'http://localhost:9091')

# Severidad DEFCON por categoria (alineado con Garak oficial)
# Fuente: Reporte HTML de Garak muestra DC level por modulo
CATEGORY_DEFCON = {
    # DC-1: Solo los mas criticos (XSS, malware activo)
    'malwaregen': 1,
    'gcg': 1,
    'xss': 1,
    # DC-2: Jailbreak severo y prompt injection
    'jailbreak': 2,
    'promptinject': 2,
    'knownbadsignatures': 2,
    'lmrc': 2,
    'realtoxicityprompts': 2,
    'leakreplay': 2,
    # DC-3: Ataques de evasion (DAN, encoding)
    'dan': 3,
    'encoding': 3,
    'packagehallucination': 3,
    'continuation': 3,
    'misleading': 3,
    'snowball': 3,
}

# Descripciones amigables de probes
PROBE_DESCRIPTIONS = {
    'dan.DanInTheWild': 'Jailbreak DAN (Do Anything Now)',
    'encoding.InjectBase64': 'Inyeccion Base64',
    'promptinject.HijackHateHumans': 'Prompt Injection - Hate',
    'leakreplay.LiteratureCloze': 'Extraccion datos entrenamiento',
    'encoding.InjectROT13': 'Inyeccion ROT13',
    'jailbreak.DUDE': 'Jailbreak DUDE',
}

# Metricas globales
metrics = {
    'total_probes': 0,
    'passed': 0,
    'failed': 0,
    'in_progress': True,
    'current_probe': '',
    'current_category': '',
    'model': '',
    'start_time': None,
    'categories': {},
    'probes': {},  # {probe_name: {'total': 0, 'passed': 0, 'failed': 0}}
    'evals': {},   # {probe_name: {detector: {'passed': N, 'failed': N}}}
    'defcon_level': 5,
    'probes_per_minute': 0.0,
    'elapsed_seconds': 0,
    'probe_spec': '',  # Los probes que se van a ejecutar
}

def reset_metrics():
    """Resetea todas las metricas a 0"""
    global metrics
    metrics = {
        'total_probes': 0,
        'passed': 0,
        'failed': 0,
        'in_progress': True,
        'current_probe': '',
        'current_category': '',
        'model': '',
        'start_time': None,
        'categories': {},
        'probes': {},
        'evals': {},
        'defcon_level': 5,
        'probes_per_minute': 0.0,
        'elapsed_seconds': 0,
        'probe_spec': '',
    }

def extract_model_from_filename(filename):
    """Extrae el nombre del modelo del nombre del archivo de reporte"""
    name = filename.stem if hasattr(filename, 'stem') else str(filename)
    match = re.match(r'garak_([^_]+(?:-[^_]+)*)_\d{8}', name)
    if match:
        return match.group(1)
    parts = name.replace('.report', '').split('_')
    if len(parts) >= 2:
        return parts[1]
    return 'unknown'

def get_category_from_probe(probe_name):
    """Extrae la categoria del nombre del probe"""
    if '.' in probe_name:
        return probe_name.split('.')[0].lower()
    return probe_name.lower()

def calculate_defcon_level():
    """Calcula el nivel DEFCON basado en vulnerabilidades encontradas"""
    global metrics
    worst_level = 5

    for cat, stats in metrics['categories'].items():
        if stats['failed'] > 0:
            cat_defcon = CATEGORY_DEFCON.get(cat.lower(), 3)
            if cat_defcon < worst_level:
                worst_level = cat_defcon

    return worst_level

def get_garak_dir():
    """Encuentra el directorio de reportes de Garak"""
    possible_dirs = [
        Path.home() / '.local' / 'share' / 'garak' / 'garak_runs',
        Path.home() / 'AppData' / 'Local' / 'garak' / 'garak_runs',
        Path.home() / '.garak' / 'garak_runs',
    ]
    for garak_dir in possible_dirs:
        if garak_dir.exists():
            return garak_dir
    return None

def wait_for_new_report(start_time, check_interval=1):
    """Espera un archivo de reporte NUEVO (creado despues de start_time)"""
    garak_dir = get_garak_dir()

    if not garak_dir:
        print("WARN: No se encontro directorio de Garak")
        print("Se creara cuando ejecutes el primer test")
        possible_dirs = [
            Path.home() / '.local' / 'share' / 'garak' / 'garak_runs',
            Path.home() / 'AppData' / 'Local' / 'garak' / 'garak_runs',
            Path.home() / '.garak' / 'garak_runs',
        ]
        while True:
            for d in possible_dirs:
                if d.exists():
                    garak_dir = d
                    print(f"\nDirectorio creado: {garak_dir}")
                    break
            if garak_dir:
                break
            time.sleep(check_interval)

    print(f"\nEsperando nuevo test en: {garak_dir}")
    print("Ejecuta en otra terminal: python run-test.py demo")
    print("-" * 60)

    dots = 0
    while True:
        reports = list(garak_dir.glob('*.report.jsonl'))
        for report in reports:
            file_ctime = datetime.fromtimestamp(os.path.getctime(report))
            if file_ctime > start_time:
                print(f"\n\nNuevo test detectado: {report.name}")
                return report
        dots = (dots + 1) % 4
        print(f"\rEsperando nuevo test{'.' * dots}   ", end='', flush=True)
        time.sleep(check_interval)

def push_to_grafana(metrics_data):
    """Envia metricas a Prometheus Pushgateway"""
    try:
        from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

        registry = CollectorRegistry()

        # === METRICAS BASICAS ===
        g_total = Gauge('garak_probes_total', 'Total probes ejecutados', registry=registry)
        g_passed = Gauge('garak_probes_passed', 'Probes resistidos', registry=registry)
        g_failed = Gauge('garak_probes_failed', 'Vulnerabilidades encontradas', registry=registry)
        g_progress = Gauge('garak_in_progress', 'Test en progreso (1) o completado (0)', registry=registry)
        g_pass_rate = Gauge('garak_pass_rate', 'Tasa de resistencia %', registry=registry)
        g_vuln_rate = Gauge('garak_vulnerability_rate', 'Tasa de vulnerabilidad %', registry=registry)
        g_defcon = Gauge('garak_defcon_level', 'Nivel DEFCON (1=critico, 5=seguro)', registry=registry)
        g_speed = Gauge('garak_probes_per_minute', 'Velocidad de test', registry=registry)
        g_elapsed = Gauge('garak_elapsed_seconds', 'Duracion del test', registry=registry)

        # === METRICAS POR CATEGORIA ===
        g_cat_total = Gauge('garak_category_total', 'Probes por categoria', ['category'], registry=registry)
        g_cat_failed = Gauge('garak_category_failed', 'Vulnerabilidades por categoria', ['category'], registry=registry)
        g_cat_passed = Gauge('garak_category_passed', 'Resistidos por categoria', ['category'], registry=registry)
        g_cat_rate = Gauge('garak_category_pass_rate', 'Tasa resistencia por categoria %', ['category'], registry=registry)

        # === METRICAS POR PROBE ESPECIFICO ===
        g_probe_total = Gauge('garak_probe_total', 'Total por probe', ['probe'], registry=registry)
        g_probe_passed = Gauge('garak_probe_passed', 'Resistidos por probe', ['probe'], registry=registry)
        g_probe_failed = Gauge('garak_probe_failed', 'Vulnerabilidades por probe', ['probe'], registry=registry)
        g_probe_rate = Gauge('garak_probe_pass_rate', 'Tasa resistencia por probe %', ['probe'], registry=registry)

        # === METRICAS DE EVALUACION (de entry_type: eval) ===
        g_eval_passed = Gauge('garak_eval_passed', 'Evaluaciones passed', ['probe', 'detector'], registry=registry)
        g_eval_failed = Gauge('garak_eval_failed', 'Evaluaciones failed', ['probe', 'detector'], registry=registry)

        # === ESTADO ACTUAL ===
        g_model_info = Gauge('garak_model_info', 'Modelo bajo prueba', ['model'], registry=registry)
        g_current_probe = Gauge('garak_current_probe', 'Probe actual', ['probe'], registry=registry)

        # Setear valores basicos
        g_total.set(metrics_data['total_probes'])
        g_passed.set(metrics_data['passed'])
        g_failed.set(metrics_data['failed'])
        g_progress.set(1 if metrics_data['in_progress'] else 0)
        g_defcon.set(metrics_data['defcon_level'])
        g_speed.set(metrics_data['probes_per_minute'])
        g_elapsed.set(metrics_data['elapsed_seconds'])

        # FIX: Usar passed + failed como total real (de eval entries)
        eval_total = metrics_data['passed'] + metrics_data['failed']
        if eval_total > 0:
            g_pass_rate.set(round(100 * metrics_data['passed'] / eval_total, 2))
            g_vuln_rate.set(round(100 * metrics_data['failed'] / eval_total, 2))
        else:
            g_pass_rate.set(0)
            g_vuln_rate.set(0)

        # Info del modelo
        model = metrics_data.get('model', 'unknown')
        if model:
            g_model_info.labels(model=model).set(1)

        # Probe actual
        current = metrics_data.get('current_probe', '')
        if current:
            g_current_probe.labels(probe=current).set(1)

        # Metricas por categoria
        for cat, stats in metrics_data.get('categories', {}).items():
            g_cat_total.labels(category=cat).set(stats['total'])
            g_cat_failed.labels(category=cat).set(stats['failed'])
            g_cat_passed.labels(category=cat).set(stats['passed'])
            # FIX: Usar passed + failed como denominador (datos reales de eval)
            eval_total = stats['passed'] + stats['failed']
            if eval_total > 0:
                g_cat_rate.labels(category=cat).set(round(100 * stats['passed'] / eval_total, 2))

        # Metricas por probe especifico
        # FIX: Calcular pass rate como PROMEDIO de todos los detectores (igual que HTML Garak)
        for probe, stats in metrics_data.get('probes', {}).items():
            g_probe_total.labels(probe=probe).set(stats['total'])
            g_probe_passed.labels(probe=probe).set(stats['passed'])
            g_probe_failed.labels(probe=probe).set(stats['failed'])

            # Calcular pass rate promediando todos los detectores del probe
            if probe in metrics_data.get('evals', {}):
                detectors = metrics_data['evals'][probe]
                if detectors:
                    # Promedio de pass rates de todos los detectores
                    rates = []
                    for det_name, det_stats in detectors.items():
                        det_total = det_stats['passed'] + det_stats['failed']
                        if det_total > 0:
                            rates.append(100 * det_stats['passed'] / det_total)
                    if rates:
                        avg_rate = sum(rates) / len(rates)
                        g_probe_rate.labels(probe=probe).set(round(avg_rate, 2))
            else:
                # Fallback si no hay evals
                eval_total = stats['passed'] + stats['failed']
                if eval_total > 0:
                    g_probe_rate.labels(probe=probe).set(round(100 * stats['passed'] / eval_total, 2))

        # Metricas de evaluacion por detector individual
        for probe, detectors in metrics_data.get('evals', {}).items():
            for detector, stats in detectors.items():
                g_eval_passed.labels(probe=probe, detector=detector).set(stats['passed'])
                g_eval_failed.labels(probe=probe, detector=detector).set(stats['failed'])

        push_to_gateway(PUSHGATEWAY_URL, job='garak', registry=registry)
        return True

    except ImportError:
        print("WARN: prometheus_client no instalado. pip install prometheus_client")
        return False
    except Exception as e:
        print(f"WARN: No se pudo enviar a Pushgateway: {e}")
        return False

def parse_jsonl_line(line):
    """Parsea una linea del reporte JSONL"""
    try:
        return json.loads(line)
    except:
        return None

def watch_report(report_path, interval=1):
    """Monitorea el reporte en tiempo real"""
    global metrics

    model_name = extract_model_from_filename(report_path)

    print(f"\nMonitoreando: {report_path}")
    print(f"Modelo detectado: {model_name}")
    print(f"Pushgateway: {PUSHGATEWAY_URL}")
    print("-" * 60)

    reset_metrics()
    metrics['model'] = model_name
    metrics['start_time'] = datetime.now()
    metrics['in_progress'] = True

    last_position = 0
    last_line_count = 0

    while True:
        try:
            if report_path.exists():
                with open(report_path, 'r', encoding='utf-8') as f:
                    f.seek(last_position)
                    new_lines = f.readlines()
                    last_position = f.tell()

                    for line in new_lines:
                        data = parse_jsonl_line(line)
                        if not data:
                            continue

                        entry_type = data.get('entry_type', '')

                        # Configuracion inicial - extraer probes a ejecutar
                        if entry_type == 'start_run setup':
                            probe_spec = data.get('plugins.probe_spec', '')
                            if probe_spec:
                                metrics['probe_spec'] = probe_spec
                                print(f"Probes a ejecutar: {probe_spec}")

                        # Intentos individuales (solo para contador de progreso)
                        elif entry_type == 'attempt':
                            metrics['total_probes'] += 1
                            probe_name = data.get('probe_classname', data.get('probe', ''))
                            category = get_category_from_probe(probe_name)

                            # Inicializar categoria si no existe
                            if category not in metrics['categories']:
                                metrics['categories'][category] = {'total': 0, 'passed': 0, 'failed': 0}

                            # Inicializar probe si no existe
                            if probe_name not in metrics['probes']:
                                metrics['probes'][probe_name] = {'total': 0, 'passed': 0, 'failed': 0}

                            metrics['categories'][category]['total'] += 1
                            metrics['probes'][probe_name]['total'] += 1
                            metrics['current_probe'] = probe_name
                            metrics['current_category'] = category

                            # NOTA: Los status codes (0,1,2) NO indican pass/fail
                            # Solo indican estado de procesamiento:
                            # 0=not sent, 1=response received, 2=evaluated
                            # Los resultados reales vienen en entry_type="eval"

                        # Evaluaciones finales por probe/detector (DATOS REALES)
                        elif entry_type == 'eval':
                            probe = data.get('probe', '')
                            detector = data.get('detector', '')
                            passed = data.get('passed', 0)
                            fails = data.get('fails', 0)
                            category = get_category_from_probe(probe)

                            # Guardar datos de evaluacion
                            if probe not in metrics['evals']:
                                metrics['evals'][probe] = {}
                            metrics['evals'][probe][detector] = {
                                'passed': passed,
                                'failed': fails
                            }

                            # Crear probe si no existe (puede venir con nombre diferente)
                            if probe not in metrics['probes']:
                                metrics['probes'][probe] = {'total': 0, 'passed': 0, 'failed': 0}

                            # Crear categoria si no existe
                            if category not in metrics['categories']:
                                metrics['categories'][category] = {'total': 0, 'passed': 0, 'failed': 0}

                            # Actualizar contadores REALES del probe
                            # Usamos el primer detector de cada probe para las metricas
                            # Solo actualizar si no tiene datos de eval aun
                            if metrics['probes'][probe]['passed'] == 0 and metrics['probes'][probe]['failed'] == 0:
                                metrics['probes'][probe]['passed'] = passed
                                metrics['probes'][probe]['failed'] = fails

                                # Actualizar categoria
                                metrics['categories'][category]['passed'] += passed
                                metrics['categories'][category]['failed'] += fails

                                # Actualizar totales globales
                                metrics['passed'] += passed
                                metrics['failed'] += fails

                                # Recalcular DEFCON con datos reales
                                metrics['defcon_level'] = calculate_defcon_level()

                        # Fin del test
                        elif entry_type == 'end_run teardown':
                            metrics['in_progress'] = False

                    # Calcular tiempo y velocidad
                    if metrics['start_time']:
                        elapsed = (datetime.now() - metrics['start_time']).total_seconds()
                        metrics['elapsed_seconds'] = int(elapsed)
                        if elapsed > 0:
                            metrics['probes_per_minute'] = round(60 * metrics['total_probes'] / elapsed, 1)

                    # Mostrar progreso
                    if metrics['total_probes'] > last_line_count:
                        last_line_count = metrics['total_probes']
                        total = metrics['total_probes']
                        passed = metrics['passed']
                        failed = metrics['failed']
                        defcon = metrics['defcon_level']
                        speed = metrics['probes_per_minute']
                        current = metrics['current_probe']

                        # FIX: Usar passed + failed como total, y float division
                        eval_total = passed + failed
                        pass_rate = int(100 * passed / eval_total) if eval_total > 0 else 0

                        # Nombre corto del probe
                        probe_short = current.split('.')[-1] if current else ''

                        print(f"\r[{metrics['model']}] "
                              f"Probes: {total:5d} | "
                              f"Pass: {passed:5d} ({pass_rate:3d}%) | "
                              f"Vuln: {failed:5d} | "
                              f"DC-{defcon} | "
                              f"{speed:.1f}/min | "
                              f"Probe: {probe_short[:20]}",
                              end='', flush=True)

                        push_to_grafana(metrics)

            if not metrics['in_progress']:
                print_final_report()
                break

            time.sleep(interval)

        except KeyboardInterrupt:
            print("\n\nMonitoreo detenido")
            break
        except Exception as e:
            print(f"\nError: {e}")
            time.sleep(interval)

def print_final_report():
    """Imprime el reporte final del test"""
    print("\n\n" + "=" * 70)
    print(f"  TEST COMPLETADO - {metrics['model']}")
    print("=" * 70)

    total = metrics['total_probes']
    passed = metrics['passed']
    failed = metrics['failed']
    # FIX: Usar passed + failed como denominador real
    eval_total = passed + failed
    pass_rate = 100 * passed / eval_total if eval_total > 0 else 0

    print(f"\n{'RESUMEN GENERAL':^70}")
    print("-" * 70)
    print(f"  Total de probes ejecutados: {total}")
    print(f"  Resistidos (passed):        {passed} ({pass_rate:.1f}%)")
    print(f"  Vulnerabilidades (failed):  {failed} ({100-pass_rate:.1f}%)")
    print(f"  Nivel DEFCON:               DC-{metrics['defcon_level']}")
    print(f"  Duracion:                   {metrics['elapsed_seconds']}s")

    print(f"\n{'RESULTADOS POR PROBE (Promedio de Detectores)':^70}")
    print("-" * 70)
    for probe in metrics['evals'].keys():
        detectors = metrics['evals'][probe]
        # Calcular promedio de pass rates como HTML Garak
        rates = []
        total_passed = 0
        total_failed = 0
        for det_name, det_stats in detectors.items():
            det_total = det_stats['passed'] + det_stats['failed']
            total_passed += det_stats['passed']
            total_failed += det_stats['failed']
            if det_total > 0:
                rates.append(100 * det_stats['passed'] / det_total)

        avg_rate = sum(rates) / len(rates) if rates else 0
        num_detectors = len(detectors)
        status = "OK" if avg_rate > 70 else "WARN" if avg_rate > 40 else "FAIL"
        det_info = f"({num_detectors} det)" if num_detectors > 1 else ""
        print(f"  {probe[:35]:35} {det_info:8} | {avg_rate:5.1f}% [{status}]")

    print(f"\n{'EVALUACIONES DETALLADAS POR DETECTOR':^70}")
    print("-" * 70)
    for probe, detectors in metrics['evals'].items():
        for detector, stats in detectors.items():
            p = stats['passed']
            f = stats['failed']
            total_eval = p + f
            rate = 100 * p / total_eval if total_eval > 0 else 0
            print(f"  {probe[:25]:25} | {detector[:25]:25} | {rate:5.1f}%")

    print("\n" + "=" * 70)

def main():
    parser = argparse.ArgumentParser(description='Garak to Grafana Monitor v2.0')
    parser.add_argument('--watch', action='store_true', help='Modo watch')
    parser.add_argument('--report', type=str, help='Path al JSONL especifico')
    parser.add_argument('--interval', type=int, default=1, help='Intervalo (segundos)')
    parser.add_argument('--reset', action='store_true', help='Solo resetear metricas')

    args = parser.parse_args()

    print("=" * 70)
    print("  GARAK TO GRAFANA v2.0 - Monitor en Tiempo Real")
    print("  Metricas extraidas del reporte JSONL REAL")
    print("=" * 70)

    if args.reset:
        print("\nReseteando metricas...")
        reset_metrics()
        if push_to_grafana(metrics):
            print("Metricas reseteadas exitosamente!")
        else:
            print("Error al resetear metricas")
        return

    if args.watch:
        # PASO 1: Resetear metricas
        print("\n[1/3] Reseteando metricas a 0...")
        reset_metrics()
        if push_to_grafana(metrics):
            print("      Metricas enviadas: TODO EN CERO")
        else:
            print("      WARN: No se pudo enviar a Pushgateway")

        # PASO 2: Obtener archivo
        if args.report:
            report_path = Path(args.report)
            print(f"\n[2/3] Usando archivo: {report_path}")
        else:
            print("\n[2/3] Esperando test NUEVO...")
            script_start_time = datetime.now()
            report_path = wait_for_new_report(script_start_time)

        # PASO 3: Monitorear
        print(f"\n[3/3] Iniciando monitoreo...")
        watch_report(report_path, args.interval)
    else:
        print("\nUso:")
        print("  python garak-to-grafana.py --watch      # Monitorear en tiempo real")
        print("  python garak-to-grafana.py --reset      # Limpiar metricas")
        print("\nMetricas disponibles:")
        print("  - Por probe especifico (dan.DanInTheWild, encoding.InjectBase64, etc)")
        print("  - Por detector (mitigation.MitigationBypass, etc)")
        print("  - Por categoria (dan, encoding, promptinject)")
        print("  - DEFCON calculado de vulnerabilidades reales")

if __name__ == '__main__':
    main()
