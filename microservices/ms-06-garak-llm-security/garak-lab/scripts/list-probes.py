#!/usr/bin/env python3
"""
Lista todos los probes disponibles en Garak
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

print("=" * 70)
print("  GARAK - Probes Disponibles")
print("=" * 70)

# Importar probes de Garak
try:
    from garak import _plugins
    probes = _plugins.enumerate_plugins("probes")

    categories = {}
    for probe in probes:
        cat = probe.split('.')[0]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(probe)

    print(f"\nTotal: {len(probes)} probes en {len(categories)} categorias\n")

    for cat in sorted(categories.keys()):
        print(f"\n[{cat.upper()}]")
        for probe in categories[cat][:5]:  # Solo primeros 5 por categoria
            print(f"  - {probe}")
        if len(categories[cat]) > 5:
            print(f"  ... y {len(categories[cat]) - 5} mas")

except Exception as e:
    print(f"Error: {e}")
    print("\nIntentando con comando CLI...")

    import subprocess
    result = subprocess.run(
        [sys.executable, '-m', 'garak', '--list_probes'],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace'
    )
    print(result.stdout[:3000])

print("\n" + "=" * 70)
print("Uso: garak --probes <nombre_probe>")
print("Ejemplo: garak --probes encoding.InjectBase64")
print("=" * 70)
