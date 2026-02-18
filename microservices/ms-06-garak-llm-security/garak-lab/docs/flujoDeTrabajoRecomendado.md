Resumen de Scripts y Configuraciones de Garak Lab
1. run-test.py - Script Principal
Propósito: Ejecutar pruebas Garak con perfiles predefinidos.

Perfiles disponibles:

Perfil	Probes	Generaciones	Descripción
demo	encoding + dan + promptinject	3	Demo con 3 tipos de ataque
quick	encoding.InjectBase64	2	Validación rápida
standard	encoding + dan + leakreplay	5	Test estándar
full	todos	3	Escaneo completo
jailbreak	dan + jailbreak	5	Solo jailbreak
encoding	encoding	5	Solo encoding
Uso:


python run-test.py demo          # Ejecutar demo
python run-test.py quick gpt-4o  # Test rápido con GPT-4o
Características:

Carga API keys desde .env
Abre automáticamente el reporte HTML al finalizar
Configura encoding UTF-8 para Windows
2. list-probes.py - Listar Probes
Propósito: Ver todos los probes disponibles en Garak organizados por categoría.

Uso:


python list-probes.py
Output: Lista categorías (dan, encoding, jailbreak, etc.) con los primeros 5 probes de cada una.

3. garak-to-grafana.py - Monitor en Tiempo Real
Propósito: Monitorear tests de Garak y enviar métricas a Grafana via Prometheus.

Arquitectura:


Terminal 1: garak-to-grafana.py --watch  (monitorea)
            ↓
Terminal 2: run-test.py demo             (ejecuta test)
            ↓
Garak genera: ~/.local/share/garak/garak_runs/*.report.jsonl
            ↓
garak-to-grafana.py → Prometheus Pushgateway → Grafana
Métricas enviadas:

Métrica	Descripción
garak_probes_total	Total de probes ejecutados
garak_probes_passed	Probes resistidos
garak_probes_failed	Vulnerabilidades encontradas
garak_pass_rate	% de resistencia
garak_defcon_level	Nivel DEFCON (1-5)
garak_category_*	Métricas por categoría
garak_probe_*	Métricas por probe específico
garak_eval_*	Resultados por detector
Fix importante implementado: Usa passed + failed como denominador (no total de attempts).

4. openai-test.yaml - Config Simple
Propósito: Configuración básica para testear OpenAI.


plugins:
  target_type: openai
  target_name: gpt-3.5-turbo
  probe_spec: encoding.InjectBase64,dan.DanJailbreak

run:
  generations: 3
  seed: 42
Uso:


garak --config config/openai-test.yaml
5. bax-config.yaml - Config BAX Completa
Propósito: Configuración completa para testear el orquestador BAX.

Estructura:

Generator: OpenAI por defecto (con template REST comentado para BAX real)
Probes por fase: fase1_seguridad_critica, fase2_evasion_filtros, fase3_filtracion_datos, fase4_calidad
DEFCON Thresholds: DC-1 a DC-5 con rangos de pass_rate
Mapeo BAX → Probes: Relaciona nodos del orquestador con probes específicos
PII Patterns: Regex para DNI, CUIL/CUIT, teléfono argentino
6. run-bax-test.py - Script BAX
Propósito: Ejecutar pruebas específicas para BAX por fases.

Fases:

Fase	Target	Probes
quick	blocked_list, triage	encoding.InjectBase64, dan.Dan_11_0
fase1	blocked_list, triage, router	promptinject, dan (6-11)
fase2	blocked_list	encoding (Base64, ROT13, Hex, Morse)
fase3	agent_call (RAG)	leakreplay
fase4	grounding, personality	hallucination, snowball, xss
full	todos	Selección de todas las fases
Flujo de Trabajo Recomendado

┌─────────────────────────────────────────────────────────────┐
│  1. APRENDER: python list-probes.py                         │
│     Ver qué probes existen                                  │
├─────────────────────────────────────────────────────────────┤
│  2. PRACTICAR: python run-test.py quick                     │
│     Test rápido contra ChatGPT para validar setup           │
├─────────────────────────────────────────────────────────────┤
│  3. MONITOREAR: python garak-to-grafana.py --watch          │
│     (en otra terminal) python run-test.py demo              │
│     Ver métricas en tiempo real                             │
├─────────────────────────────────────────────────────────────┤
│  4. BAX: python run-bax-test.py fase1                       │
│     Cuando tengas acceso al endpoint de BAX                 │
└─────────────────────────────────────────────────────────────┘
Tienes todo listo para empezar a practicar con ChatGPT. El comando más simple para validar tu instalación es:


cd garak-lab/scripts
python run-test.py quick