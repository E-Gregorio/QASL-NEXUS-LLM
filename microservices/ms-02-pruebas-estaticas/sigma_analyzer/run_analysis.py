# -*- coding: utf-8 -*-
"""
QASL NEXUS LLM - MS-02 Pruebas Estaticas
Analiza HUs con Claude AI y genera reportes + HU Actualizada + Trazabilidad en BD
"""
import sys
import json
from pathlib import Path
from datetime import datetime

# Configurar UTF-8 para Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from parser import parse_hu
from rtm_analyzer_ai import RTMAnalyzerAI
from report_generator import ReportGenerator
from hu_ideal_html_generator import HUIdealHTMLGenerator
from db_writer import DBWriter


# Rutas
BASE_DIR = Path(__file__).parent
HU_ORIGINAL_DIR = BASE_DIR / "HU_Original"
REPORTES_DIR = BASE_DIR / "reportes"
HU_ACTUALIZADAS_DIR = BASE_DIR / "hu_actualizadas"
METRICAS_FILE = BASE_DIR / "metricas_globales.json"


def find_hu_files(hu_ids: list) -> list:
    """Busca archivos de HU en HU_Original/ (.html y .md)"""
    found = []

    if not HU_ORIGINAL_DIR.exists():
        print(f"[ERROR] Directorio no encontrado: {HU_ORIGINAL_DIR}")
        return found

    for hu_id in hu_ids:
        for f in HU_ORIGINAL_DIR.iterdir():
            if f.is_file() and hu_id in f.name and f.suffix in ('.html', '.htm', '.md'):
                found.append((hu_id, f))
                break

    # Si no se especificaron IDs, buscar todas las HUs
    if not hu_ids:
        for f in sorted(HU_ORIGINAL_DIR.iterdir()):
            if f.is_file() and f.suffix in ('.html', '.htm', '.md'):
                hu_id = f.stem
                found.append((hu_id, f))

    return found


def cargar_metricas() -> dict:
    """Carga métricas existentes o crea nuevas"""
    if METRICAS_FILE.exists():
        with open(METRICAS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "ultima_actualizacion": "",
        "total_hus_analizadas": 0,
        "total_gaps_encontrados": 0,
        "total_gaps_criticos": 0,
        "cobertura_promedio": 0,
        "hus": {}
    }


def guardar_metricas(metricas: dict):
    """Guarda metricas a archivo"""
    metricas["ultima_actualizacion"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(METRICAS_FILE, 'w', encoding='utf-8') as f:
        json.dump(metricas, f, indent=2, ensure_ascii=False)


def analizar_hu(hu_id: str, hu_path: Path, metricas: dict, db: DBWriter = None) -> dict:
    """Analiza una HU con Claude AI y retorna resultados"""
    print(f"\n{'='*60}")
    print(f"Analizando: {hu_id}")
    print(f"{'='*60}")

    # 1. Parsear
    print("[1/5] Parseando HU...")
    hu = parse_hu(str(hu_path))

    # 2. Analizar con Claude AI
    print("[2/5] Ejecutando analisis RTM con Claude AI...")
    analyzer = RTMAnalyzerAI(hu)
    resultado = analyzer.analizar()

    # 3. Generar reporte
    print("[3/5] Generando reporte...")
    REPORTES_DIR.mkdir(exist_ok=True)
    generator = ReportGenerator(hu, resultado)
    reporte = generator.generar_reporte()

    report_path = REPORTES_DIR / f"{hu.id}_REPORT.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(reporte)

    # 4. Generar HU Actualizada
    print("[4/5] Generando HU Actualizada (formato ISTQB)...")
    HU_ACTUALIZADAS_DIR.mkdir(exist_ok=True)
    html_gen = HUIdealHTMLGenerator(hu, resultado)
    html = html_gen.generar_hu_ideal_html()

    html_path = HU_ACTUALIZADAS_DIR / f"{hu.id}_ACTUALIZADA.html"
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # 5. Guardar trazabilidad en BD (MS-12)
    db_guardado = False
    if db and db.conn:
        print("[5/5] Guardando trazabilidad en MS-12 PostgreSQL...")
        db_guardado = db.guardar_analisis(hu, resultado)
    else:
        print("[5/5] BD no disponible, omitiendo trazabilidad en BD")

    # Actualizar metricas
    cobertura = resultado['metricas']['cobertura_escenarios']
    gaps = len(resultado['gaps'])
    criticos = sum(1 for g in resultado['gaps'] if g.tipo == "CRITICO")

    metricas["hus"][hu.id] = {
        "nombre": hu.nombre,
        "epica": hu.epica,
        "cobertura": cobertura,
        "gaps": gaps,
        "gaps_criticos": criticos,
        "brs": resultado['metricas']['total_brs'],
        "escenarios_originales": resultado['metricas']['total_escenarios_documentados'],
        "fecha_analisis": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "reporte": str(report_path.name),
        "hu_actualizada": str(html_path.name),
        "db_guardado": db_guardado
    }

    # Resultados
    print(f"\n[RESULTADOS]")
    print(f"   Cobertura inicial: {cobertura:.1f}%")
    print(f"   Gaps identificados: {gaps}")
    print(f"   Gaps criticos: {criticos}")
    print(f"   Reporte: {report_path.name}")
    print(f"   HU Actualizada: {html_path.name}")
    if db_guardado:
        print(f"   BD: Trazabilidad guardada en MS-12")

    return resultado


def actualizar_metricas_globales(metricas: dict):
    """Recalcula métricas globales"""
    if not metricas["hus"]:
        return

    total_hus = len(metricas["hus"])
    total_gaps = sum(h["gaps"] for h in metricas["hus"].values())
    total_criticos = sum(h["gaps_criticos"] for h in metricas["hus"].values())
    cob_promedio = sum(h["cobertura"] for h in metricas["hus"].values()) / total_hus

    metricas["total_hus_analizadas"] = total_hus
    metricas["total_gaps_encontrados"] = total_gaps
    metricas["total_gaps_criticos"] = total_criticos
    metricas["cobertura_promedio"] = round(cob_promedio, 1)


def generar_resumen_metricas(metricas: dict):
    """Genera archivo resumen de metricas - sin emojis"""
    resumen_path = BASE_DIR / "METRICAS_RESUMEN.md"

    with open(resumen_path, 'w', encoding='utf-8') as f:
        f.write("# QASL NEXUS LLM - Metricas de Analisis Estatico\n\n")
        f.write(f"**Ultima actualizacion:** {metricas['ultima_actualizacion']}\n\n")
        f.write("---\n\n")

        f.write("## Dashboard Global\n\n")
        f.write("| Metrica | Valor |\n")
        f.write("|---------|-------|\n")
        f.write(f"| HUs Analizadas | {metricas['total_hus_analizadas']} |\n")
        f.write(f"| Cobertura Promedio | {metricas['cobertura_promedio']}% |\n")
        f.write(f"| Total Gaps | {metricas['total_gaps_encontrados']} |\n")
        f.write(f"| Gaps Criticos | {metricas['total_gaps_criticos']} |\n\n")

        f.write("---\n\n")
        f.write("## Detalle por HU\n\n")
        f.write("| HU | Epica | Cobertura | Gaps | Criticos | Reporte |\n")
        f.write("|----|-------|-----------|------|----------|----------|\n")

        for hu_id, data in metricas["hus"].items():
            if data["cobertura"] >= 80:
                status = "[OK]"
            elif data["cobertura"] >= 50:
                status = "[WARN]"
            else:
                status = "[FAIL]"
            f.write(f"| {hu_id} | {data['epica'][:20]} | {status} {data['cobertura']}% | {data['gaps']} | {data['gaps_criticos']} | [{data['reporte']}](reportes/{data['reporte']}) |\n")

        f.write("\n---\n\n")
        f.write("*Generado por QASL NEXUS LLM - MS-02 Pruebas Estaticas*\n")

    print(f"\n[INFO] Resumen de metricas: {resumen_path.name}")


def main():
    print("\n" + "=" * 60)
    print("QASL NEXUS LLM - MS-02 Pruebas Estaticas")
    print("Powered by Claude AI for semantic precision")
    print("=" * 60)

    if len(sys.argv) < 2:
        print("\nUso:")
        print("  python run_analysis.py HU_XXX_01")
        print("  python run_analysis.py HU_XXX_01 HU_XXX_02")
        print("  python run_analysis.py --all")
        print("  python run_analysis.py HU_XXX_01 --no-db")
        print("\nOpciones:")
        print("  --no-db   No guardar trazabilidad en BD (MS-12)")
        print("  --all     Analizar todas las HUs en HU_Original/")
        print(f"\nDirectorio de HUs: {HU_ORIGINAL_DIR}")
        sys.exit(0)

    # Opciones
    usar_db = "--no-db" not in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    # Cargar metricas existentes
    metricas = cargar_metricas()

    # Conectar a BD (MS-12)
    db = None
    if usar_db:
        db = DBWriter()
        if not db.connect():
            print("[WARN] Continuando sin BD - solo archivos locales")
            db = None

    # Determinar que HUs analizar
    if "--all" in sys.argv:
        hu_ids = []  # find_hu_files con lista vacía busca todas
    else:
        hu_ids = args if args else []

    hu_files = find_hu_files(hu_ids)

    if not hu_files:
        print(f"[ERROR] No se encontraron HUs: {hu_ids}")
        sys.exit(1)

    print(f"\nHUs a analizar: {len(hu_files)}")
    print(f"BD (MS-12): {'Conectada' if db else 'No disponible'}")

    # Analizar cada HU
    for hu_id, hu_path in hu_files:
        analizar_hu(hu_id, hu_path, metricas, db)

    # Cerrar BD
    if db:
        db.close()

    # Actualizar y guardar metricas
    actualizar_metricas_globales(metricas)
    guardar_metricas(metricas)
    generar_resumen_metricas(metricas)

    print("\n" + "=" * 60)
    print("[OK] ANALISIS COMPLETADO")
    print("=" * 60)
    print(f"\nArchivos generados en:")
    print(f"   Reportes: {REPORTES_DIR}")
    print(f"   HUs Actualizadas: {HU_ACTUALIZADAS_DIR}")
    print(f"   Metricas: {METRICAS_FILE.name}")
    if db:
        print(f"   BD: Trazabilidad en MS-12 PostgreSQL")


if __name__ == "__main__":
    main()
