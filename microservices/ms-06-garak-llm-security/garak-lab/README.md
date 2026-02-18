# Garak Lab - Laboratorio de NVIDIA Garak

Espacio para aprender y experimentar con NVIDIA Garak antes de integrarlo a INGRID.

## Que es Garak

NVIDIA Garak es un scanner de vulnerabilidades para LLMs. Ejecuta ataques automatizados contra modelos de IA para encontrar debilidades.

**GitHub:** https://github.com/NVIDIA/garak

## Instalacion

```bash
pip install garak
```

## Estructura

```
garak-lab/
├── config/
│   ├── openai-test.yaml     # Config para OpenAI directo
│   └── bax-config.yaml      # Config específica para BAX (GCBA)
├── scripts/
│   ├── run-test.py          # Script principal para ejecutar tests
│   ├── run-bax-test.py      # Script específico para BAX
│   ├── list-probes.py       # Lista probes disponibles
│   └── garak-to-grafana.py  # Monitor en tiempo real -> Grafana
├── docs/
│   └── ANALISIS-BAX-GARAK.md # Análisis técnico de arquitectura BAX
├── img/                     # Diagramas de arquitectura BAX
│   ├── image0.png           # Arquitectura general
│   ├── image1.png           # Arquitectura (vista alternativa)
│   ├── image2.png           # Flujo BA Colaborativa
│   ├── image3.png           # Secciones: Descubrir, Notificaciones, Actividad
│   ├── image4.png           # Plataforma IA multi-cloud
│   ├── image5.png           # Clasificación de necesidades
│   └── image6.png           # Orquestador + Agentes (TecBA, GCBA, 3ero)
├── grafana/
│   └── garak-dashboard.json # Dashboard para importar en Grafana
├── reports/            # Reportes generados (.jsonl, .html)
└── README.md           # Este archivo
```

## Comandos Basicos

### Ver version
```bash
garak --version
```

### Listar probes disponibles
```bash
garak --list_probes
```

### Listar generadores (modelos soportados)
```bash
garak --list_generators
```

### Ejecutar test basico
```bash
garak --target_type openai --target_name gpt-3.5-turbo --probes encoding.InjectBase64
```

## Probes Disponibles

| Categoria | Descripcion | Severidad |
|-----------|-------------|-----------|
| `encoding` | Inyeccion via Base64, ROT13, etc. | DC-3 |
| `jailbreak` | DAN, Developer Mode, Grandma | DC-1 |
| `dan` | Ataques DAN especificos | DC-1 |
| `leakreplay` | Extraer datos de entrenamiento | DC-2 |
| `malwaregen` | Generar codigo malicioso | DC-1 |
| `packagehallucination` | Inventar paquetes falsos | DC-3 |
| `promptinject` | Inyeccion de prompts | DC-2 |

## Integracion con Grafana

### Prerequisitos
```bash
pip install prometheus_client python-dotenv
```

### Como ver tests en tiempo real

**Terminal 1 - Iniciar monitor:**
```bash
cd garak-lab/scripts
python garak-to-grafana.py --watch
```

**Terminal 2 - Ejecutar test:**
```bash
cd garak-lab/scripts
python run-test.py quick
```

### Importar Dashboard en Grafana

1. Abrir Grafana -> Dashboards -> Import
2. Cargar archivo: `grafana/garak-dashboard.json`
3. Seleccionar datasource Prometheus
4. El dashboard muestra:
   - Estado del test (en progreso/completado)
   - Total de probes ejecutados
   - Probes passed vs vulnerabilidades
   - Tasa de seguridad y vulnerabilidad (gauges)
   - Grafico de progreso en tiempo real

### Metricas enviadas a Prometheus

| Metrica | Descripcion |
|---------|-------------|
| `garak_probes_total` | Total de probes ejecutados |
| `garak_probes_passed` | Probes que pasaron (modelo seguro) |
| `garak_probes_failed` | Vulnerabilidades detectadas |
| `garak_pass_rate` | Porcentaje de seguridad |
| `garak_vulnerability_rate` | Porcentaje de vulnerabilidad |
| `garak_in_progress` | 1 si test en progreso, 0 si completado |

## Perfiles de Test

| Perfil | Descripcion | Probes |
|--------|-------------|--------|
| `quick` | Test rapido de validacion | encoding.InjectBase64 |
| `standard` | Test estandar (3 categorias) | encoding, dan, leakreplay |
| `jailbreak` | Solo ataques jailbreak | dan, jailbreak |
| `encoding` | Solo ataques encoding | encoding |
| `full` | Escaneo completo | todos |

**Uso:** `python run-test.py <perfil> [modelo]`

**Ejemplo:** `python run-test.py jailbreak gpt-4`

## Aprendizajes

- Garak v0.14 usa `--target_type` y `--target_name` (no `--model_type`)
- El flag `-g` es para generaciones (no `-n`)
- En Windows agregar `PYTHONIOENCODING=utf-8` para evitar errores de encoding
- Los reportes se guardan en `~/.local/share/garak/garak_runs/`

---
Para Probar
Terminal 1 - Iniciar monitor:


cd garak-lab/scripts
python garak-to-grafana.py --watch
Terminal 2 - Ejecutar test:


cd garak-lab/scripts
python run-test.py demo
Grafana:

Ve a Dashboards → Import
Carga garak-lab/grafana/garak-dashboard.json
Verás las métricas en tiempo real con barras por probe
El reporte HTML se abrirá automáticamente al terminar el test.

Sources:

NVIDIA Garak GitHub
Garak Reporting Documentation
Garak Official Site
---

## Proyecto BAX (Buenos Aires eXperience)

### Documentación
- **Análisis técnico:** [docs/ANALISIS-BAX-GARAK.md](docs/ANALISIS-BAX-GARAK.md)
- **Diagramas:** [img/](img/)

### Ejecutar pruebas BAX

```bash
# Test rápido (validación)
python scripts/run-bax-test.py quick

# Fase 1: Seguridad crítica (promptinject, dan, jailbreak)
python scripts/run-bax-test.py fase1

# Fase 2: Evasión de filtros (encoding)
python scripts/run-bax-test.py fase2

# Fase 3: Filtración de datos (leakreplay)
python scripts/run-bax-test.py fase3

# Fase 4: Calidad (hallucination, xss)
python scripts/run-bax-test.py fase4

# Escaneo completo
python scripts/run-bax-test.py full
```

### Mapeo Nodos BAX → Probes Garak

| Nodo Orquestador | Probe Garak | Prioridad |
|------------------|-------------|-----------|
| `blocked_list` | `encoding.*` | ALTA |
| `triage` | `dan.*`, `jailbreak.*` | CRÍTICA |
| `router` | `promptinject.*` | CRÍTICA |
| `agent_call` | `leakreplay.*` | ALTA |
| `grounding` | `hallucination.*` | ALTA |

### Clasificación de Agentes

| Tipo | Riesgo | Descripción |
|------|--------|-------------|
| TecBA | BAJO | Agentes internos GCBA |
| GCBA | MEDIO | Siguiendo estándar TecBA |
| 3ero | **ALTO** | Productos del mercado (código no auditado) |

---

Creado: 2026-02-11
Actualizado: 2026-02-12
Proyecto padre: INGRID AI Testing Framework
Cliente: GCBA (Gobierno de la Ciudad de Buenos Aires)
