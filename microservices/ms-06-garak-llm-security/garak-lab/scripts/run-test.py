#!/usr/bin/env python3
"""
Garak Lab - Script principal para ejecutar tests
Uso: python run-test.py [perfil]

Perfiles disponibles:
  - quick     : Test rapido (1 probe, 2 generaciones)
  - standard  : Test estandar (3 probes, 5 generaciones)
  - full      : Test completo (todos los probes)
  - jailbreak : Solo pruebas de jailbreak
  - encoding  : Solo pruebas de encoding
  - custom    : Usar config/custom.yaml
"""

import os
import sys
import subprocess
import webbrowser
from datetime import datetime
from pathlib import Path

# Configurar encoding para Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Directorio base
BASE_DIR = Path(__file__).parent.parent
CONFIG_DIR = BASE_DIR / 'config'

# Cargar .env del proyecto padre
from dotenv import load_dotenv
load_dotenv(BASE_DIR.parent / '.env')

# API Keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Perfiles de prueba
PROFILES = {
    'demo': {
        'name': 'DEMO - Multi-Attack Test',
        'probes': 'encoding.InjectBase64,dan.DanInTheWild,promptinject.HijackHateHumans',
        'generations': 3,
        'description': 'DEMO: 3 tipos de ataque (encoding, jailbreak, prompt inject) ~3min'
    },
    'quick': {
        'name': 'Quick Test',
        'probes': 'encoding.InjectBase64',
        'generations': 2,
        'description': 'Test rapido para validar configuracion'
    },
    'standard': {
        'name': 'Standard Test',
        'probes': 'encoding.InjectBase64,dan.DanInTheWild,leakreplay.LiteratureCloze',
        'generations': 5,
        'description': 'Test estandar con 3 categorias de ataques'
    },
    'full': {
        'name': 'Full Security Scan',
        'probes': 'all',
        'generations': 3,
        'description': 'Escaneo completo (toma varios minutos)'
    },
    'jailbreak': {
        'name': 'Jailbreak Tests',
        'probes': 'dan,jailbreak',
        'generations': 5,
        'description': 'Solo pruebas de jailbreak (DAN, etc.)'
    },
    'encoding': {
        'name': 'Encoding Tests',
        'probes': 'encoding',
        'generations': 5,
        'description': 'Solo pruebas de encoding (Base64, ROT13, etc.)'
    }
}

def print_banner():
    print("=" * 60)
    print("  GARAK LAB - NVIDIA Garak Testing Environment")
    print("=" * 60)

def print_profiles():
    print("\nPerfiles disponibles:")
    print("-" * 60)
    for key, profile in PROFILES.items():
        print(f"  {key:12} - {profile['description']}")
    print("-" * 60)

def run_garak(target_type, target_name, probes, generations):
    """Ejecuta Garak y retorna el path del reporte"""

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_prefix = f"garak_{target_name}_{timestamp}"

    cmd = [
        sys.executable, '-m', 'garak',
        '--target_type', target_type,
        '--target_name', target_name,
        '--probes', probes,
        '-g', str(generations),
        '--report_prefix', report_prefix
    ]

    print(f"\nComando: {' '.join(cmd)}\n")
    print("Ejecutando Garak... (esto puede tomar varios minutos)\n")

    env = os.environ.copy()
    env['OPENAI_API_KEY'] = OPENAI_API_KEY or ''
    env['ANTHROPIC_API_KEY'] = ANTHROPIC_API_KEY or ''
    env['PYTHONIOENCODING'] = 'utf-8'

    result = subprocess.run(
        cmd,
        capture_output=False,
        text=True,
        encoding='utf-8',
        errors='replace',
        env=env
    )

    return result.returncode

def get_garak_reports_dir():
    """Encuentra el directorio de reportes de Garak"""
    possible_dirs = [
        Path.home() / '.local' / 'share' / 'garak' / 'garak_runs',
        Path.home() / 'AppData' / 'Local' / 'garak' / 'garak_runs',
        Path.home() / '.garak' / 'garak_runs',
    ]
    for d in possible_dirs:
        if d.exists():
            return d
    return None

def open_latest_report():
    """Abre el reporte HTML mas reciente desde el origen"""
    garak_dir = get_garak_reports_dir()

    if not garak_dir:
        print("\nNo se encontro directorio de reportes de Garak")
        return None

    # Buscar el reporte HTML mas reciente
    html_reports = sorted(garak_dir.glob('*.report.html'), key=os.path.getctime, reverse=True)

    if html_reports:
        latest_html = html_reports[0]
        print(f"\n{'=' * 60}")
        print("REPORTE HTML GENERADO")
        print(f"{'=' * 60}")
        print(f"Ubicacion: {latest_html}")
        print(f"\nAbriendo en navegador...")

        # Abrir en navegador usando file:// protocol
        webbrowser.open(f'file:///{latest_html}')
        return latest_html
    else:
        print("\nNo se encontro reporte HTML")
        return None

def main():
    print_banner()

    # Verificar API key
    if not OPENAI_API_KEY:
        print("\nERROR: OPENAI_API_KEY no configurada")
        print("Configura la variable en el archivo .env del proyecto padre")
        sys.exit(1)

    # Obtener perfil
    profile_name = sys.argv[1] if len(sys.argv) > 1 else None

    if not profile_name or profile_name not in PROFILES:
        print_profiles()
        print("\nUso: python run-test.py <perfil> [modelo]")
        print("Ejemplo: python run-test.py quick gpt-3.5-turbo")
        sys.exit(0)

    profile = PROFILES[profile_name]
    model = sys.argv[2] if len(sys.argv) > 2 else 'gpt-3.5-turbo'

    print(f"\nPerfil: {profile['name']}")
    print(f"Modelo: {model}")
    print(f"Probes: {profile['probes']}")
    print(f"Generaciones: {profile['generations']}")
    print(f"Descripcion: {profile['description']}")

    # Ejecutar
    returncode = run_garak(
        target_type='openai',
        target_name=model,
        probes=profile['probes'],
        generations=profile['generations']
    )

    print("\n" + "=" * 60)
    if returncode == 0:
        print("TEST COMPLETADO EXITOSAMENTE!")
    else:
        print(f"Test completado con codigo de salida: {returncode}")
    print("=" * 60)

    # Abrir reporte HTML desde origen
    open_latest_report()

    # Mostrar ubicacion de reportes
    garak_dir = get_garak_reports_dir()
    if garak_dir:
        print(f"\nTodos los reportes en: {garak_dir}")

if __name__ == '__main__':
    main()
