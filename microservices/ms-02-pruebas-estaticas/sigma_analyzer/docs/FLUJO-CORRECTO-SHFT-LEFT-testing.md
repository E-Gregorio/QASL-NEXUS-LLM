📋 PROMPT MAESTRO - Generación de Flujo Shift-Left Testing desde HU Ideal
Archivo: PROMPT_GENERACION_SHIFT_LEFT_TESTING.md
🎯 CONTEXTO DEL PROYECTO SIGMA
Objetivo Principal:
Implementar Shift-Left Testing siguiendo estándares ISTQB CTFL/CTAL y normas IEEE 829 (Test Documentation) e IEEE 830 (Requirements Specification). El objetivo es generar casos de prueba ANTES del desarrollo del código, basándose en Historias de Usuario corregidas con 100% de cobertura.
Flujo Completo del Proceso:
1. HU Original (Analista Funcional)
   ↓
2. Análisis Estático (analyzer.py) → Pruebas Estáticas
   ↓
3. HU IDEAL Generada (100% Cobertura)
   ├─ Formato HTML: HU_XXXXX_IDEAL.html
   └─ Formato MD: HU_XXXXX_IDEAL.md
   ↓
4. Generación de CSVs de Trazabilidad (Claude AI)
   ├─ 1_User_Storie.csv
   ├─ 2_Test_Suite.csv
   ├─ 3_Precondition.csv
   └─ 4_Test_Cases.csv (con pasos separados)
   ↓
5. Importación a Herramientas de Gestión
   (Jira, Xray, Azure DevOps, TestRail, Power BI)
📊 ESTRUCTURA DE ARCHIVOS CSV - ESPECIFICACIONES TÉCNICAS
CSV 1: 1_User_Storie.csv
Propósito: Trasladar la Historia de Usuario IDEAL desde HTML a formato CSV estructurado. Columnas:
EPIC_ID, ID_HU, Nombre_HU, Epica, Estado, Prioridad, 
VCR_Valor, VCR_Costo, VCR_Riesgo, VCR_Total, 
Requiere_Regresion, Es_Deuda_Tecnica, 
Estimacion_Original_Hrs, Tiempo_Empleado_Hrs, 
Criterios_Aceptacion, Reglas_Negocio, 
Scope_Acordado, Fuera_Scope, Precondiciones, 
Link_Documentacion_Base
Reglas de Llenado:
EPIC_ID: Formato EPIC-XX (ej: EPIC-01)
ID_HU: Extraer del HTML (ej: HU_SGINC_02)
Nombre_HU: Título exacto de la HU
Epica: Nombre de la épica a la que pertenece
Estado: En Análisis (Versión Ideal - 100% Cobertura)
Prioridad: Extraer del HTML (Alta/Media/Baja + MVP)
VCR_Valor: Número 1-3 extraído de sección "Estimaciones"
VCR_Costo: Número 1-3 extraído de sección "Estimaciones"
VCR_Riesgo: Calculado como Probabilidad × Impacto del HTML
VCR_Total: Suma Valor + Costo + Riesgo
Requiere_Regresion: No (por defecto en análisis inicial)
Es_Deuda_Tecnica: No (por defecto)
Estimacion_Original_Hrs: 0 (aún no estimado)
Tiempo_Empleado_Hrs: 0 (aún no ejecutado)
Criterios_Aceptacion: Concatenar todos los escenarios con formato:
E1 – Título: DADO que... CUANDO... ENTONCES... | E2 – Título: DADO que... CUANDO... ENTONCES... | E3...
Reglas_Negocio: Concatenar todas las BRs:
BR1: Descripción completa. | BR2: Descripción completa. | BR3...
Scope_Acordado: Extraer de "Dentro del Alcance" separado por |
Fuera_Scope: Extraer de "Fuera del Alcance" separado por |
Precondiciones: Extraer y concatenar separado por |
Link_Documentacion_Base: Ruta relativa al HTML ideal
Ejemplo:
EPIC-01,HU_SGINC_02,Alta de Inconsistencias,Módulo Alta de Inconsistencias,En Análisis (Versión Ideal - 100% Cobertura),Alta – MVP 1,3,2,2,7,No,No,0,0,"E1 – Sin datos: DADO que... | E2 – Buscador: DADO que...","BR1: Solo los usuarios... | BR2: La pantalla principal...","Validar: Mostrar pantalla | Validar: Mostrar grilla","Derivación de CUITs | Mantenimiento de catálogos","Sistemas: Base de datos accesible | Datos: Al menos 1 registro",/sigma_analyzer/hu_corregidas/HU_SGINC_02_IDEAL.html
CSV 2: 2_Test_Suite.csv
Propósito: Agrupar Test Cases en suites lógicas según funcionalidad, tipo de prueba o riesgo. Columnas:
EPIC_ID, US_ID, TS_ID, Nombre_Suite, Descripcion_Suite, 
Prioridad, Categoria, Tecnica_Aplicada, Descripcion_Analisis, 
Link_Analisis, TC_Generados, Estado, QA_Framework, 
Ambiente_Testing, Total_TC, Estimacion_Horas
Reglas de Llenado:
EPIC_ID: EPIC-01 (mismo de User Story)
US_ID: HU_SGINC_02 (ID de la HU)
TS_ID: Formato compuesto {US_ID}_TS{NN} (ej: HU_SGINC_02_TS01)
⚠️ IMPORTANTE: Usar IDs compuestos para garantizar unicidad global
Nombre_Suite: Título descriptivo de la suite
Descripcion_Suite: Qué valida esta suite (1-2 líneas)
Prioridad: Muy Alta / Alta / Media / Baja
Categoria:
Funcional
Funcional - Negativa
Seguridad - OWASP
Funcional + Integración
Tecnica_Aplicada:
Partición de Equivalencia
Valores Límite
Análisis de Riesgos
Análisis de Documentación
Combinaciones: Partición de Equivalencia + Valores Límite
Descripcion_Analisis: Resumen de qué BRs/Escenarios cubre
Link_Analisis: Nombre del archivo HTML ideal
TC_Generados: LISTADO COMPLETO de TCs (NO solo cantidad):
TC-001: Validar acceso con perfil CARGA | TC-002: Validar rechazo sin perfil | TC-003: ...
Estado: Planning / En Ejecución / Completada
QA_Framework: Xray Only (Full Manual) / Selenium + Xray / etc.
Ambiente_Testing: QA / Staging / Producción
Total_TC: Cantidad numérica de TCs en esta suite
Estimacion_Horas: Tiempo estimado (ej: 2h, 1.5h)
Estrategia de Suites Recomendada: Suite 1 (TS01) - Flujo Principal y Validaciones Positivas:
TCs positivos (casos felices)
Validación de BRs principales
Escenarios principales
Suite 2 (TS02) - Validaciones Negativas y Manejo de Errores:
TCs negativos
Validación de rechazos
Manejo de errores
Mensajes de validación
Suite 3 (TS03) - Seguridad, Permisos e Integración:
Control de acceso (BR1 típicamente)
Pruebas de seguridad OWASP
Integración con otros módulos
Auditoría
Ejemplo:
EPIC-01,HU_SGINC_02,HU_SGINC_02_TS01,Acceso y Visualización Principal,"Validar acceso según permisos y visualización de grilla",Muy Alta,Funcional,Partición de Equivalencia + Análisis de Documentación,"Verificar que usuarios con perfil CARGA puedan acceder al módulo, visualizar grilla según BR1, BR2, BR3",HU_SGINC_02_IDEAL.html,"TC-001: Validar acceso al módulo con perfil CARGA (BR1 - Positivo) | TC-002: Validar rechazo sin perfil CARGA (BR1 - Negativo) | TC-003: Validar visualización de grilla con datos (BR2 - Positivo) | TC-004: Validar grilla vacía con mensaje (E1) | TC-005: Validar botones Importar Lote y Carga Individual (BR3 - Positivo)",Planning,Xray Only (Full Manual),QA,5,2h
CSV 3: 3_Precondition.csv
Propósito: Definir estados previos necesarios para ejecutar los Test Cases, promoviendo reutilización. Columnas:
PRC_ID, Titulo_PRC, Descripcion, Pasos_Precondicion, 
Datos_Requeridos, Estado_Sistema, Categoria, 
Reutilizable, TC_Asociados
Reglas de Llenado:
PRC_ID: Formato PRC-XXX (consecutivo, ej: PRC-001, PRC-002)
Titulo_PRC: Título descriptivo claro
Descripcion: Explicación detallada del estado requerido
Pasos_Precondicion: Lista de pasos separados por |:
1. Autenticar usuario | 2. Verificar permisos | 3. Acceder al módulo
Datos_Requeridos: Datos específicos necesarios separados por |:
Usuario: qa_carga_test | Contraseña: Test123! | Perfil: CARGA
Estado_Sistema: Condiciones del sistema separadas por |:
Sistema SIGMA operativo | Base de datos disponible | Servicio IAM funcionando
Categoria:
Autenticación
Datos
Configuración
Navegación
Reutilizable: Sí / No
TC_Asociados: Lista de IDs de TCs que usan esta PRC:
TC-001, TC-003, TC-004, TC-005
Precondiciones Típicas a Generar: PRC-001: Usuario CON permisos (positivo) PRC-002: Usuario SIN permisos (negativo) PRC-003: Datos pre-cargados en BD PRC-004: Repositorio vacío PRC-005: Servicios/Módulos externos habilitados PRC-006: Configuración de entidades PRC-007: Datos de prueba para escenario específico PRC-008: Datos inválidos para pruebas negativas PRC-009: Sistema de auditoría configurado Ejemplo:
PRC-001,Usuario autenticado con perfil CARGA en módulo Alta de Inconsistencias,Usuario debe estar autenticado en SIGMA con usuario IAM y contar con perfil CARGA activo,"1. Autenticar usuario con credenciales IAM | 2. Verificar perfil CARGA | 3. Verificar habilitación del módulo | 4. Confirmar permisos activos","Usuario: qa_carga_test | Contraseña: Test123! | Perfil: CARGA | Permisos: Módulo habilitado","Sistema SIGMA operativo | Base de datos disponible | Servicio IAM funcionando | Usuario autenticado con sesión activa",Autenticación,Sí,"TC-001, TC-003, TC-004, TC-005, TC-010, TC-011"
CSV 4: 4_Test_Cases.csv (PASOS SEPARADOS - Modelo JIRA/XRAY)
Propósito: Definir casos de prueba con granularidad máxima (cada paso es una fila) para ejecución detallada y métricas precisas. Columnas:
TC_ID, US_ID, TS_ID, Titulo_TC, Tipo_Prueba, PRC_Asociadas, 
Paso_Numero, Paso_Accion, Datos_Entrada, Resultado_Esperado, 
Prioridad, Complejidad, Estado, Tiempo_Estimado, Creado_Por, 
Fecha_Creacion, Cobertura_Escenario, Cobertura_BR, Tecnica_Aplicada
Reglas de Llenado:
TC_ID: Formato TC-XXX (consecutivo global, ej: TC-001, TC-002)
⚠️ Único en todo el proyecto (no resetear por HU)
US_ID: HU_SGINC_02 (ID de la HU)
TS_ID: HU_SGINC_02_TS01 (ID compuesto de la suite)
Titulo_TC: Formato: TS{NN} | TC-XXX: Descripción [BRXX/EX - Tipo]
TS01 | TC-001: Validar acceso al módulo con perfil CARGA (BR1 - Positivo)
Tipo_Prueba:
Funcional
Funcional - Negativa
Seguridad - OWASP
Funcional + Integración
Rendimiento
PRC_Asociadas: Lista separada por coma: PRC-001, PRC-003
Paso_Numero: Número entero secuencial dentro del TC (1, 2, 3, 4...)
Paso_Accion: Descripción clara de QUÉ HACER en este paso
Datos_Entrada: Datos específicos para este paso (puede ser vacío si no aplica)
Resultado_Esperado: Qué debe ocurrir al ejecutar este paso
Prioridad: Alta / Media / Baja
Complejidad: Alta / Media / Baja
Estado: Diseñando / Ejecutable / En Ejecución / Completado
Tiempo_Estimado: Formato XX min (ej: 10 min, 5-10 min)
Creado_Por: Shift-Left Analyzer / Nombre del QA
Fecha_Creacion: Formato YYYY-MM-DD
Cobertura_Escenario: E1 / E2 / E3 (vacío si no aplica)
Cobertura_BR: BR1 / BR2, BR3 (vacío si no aplica)
Tecnica_Aplicada: Misma que en Test Suite
Estructura de Pasos - Múltiples Filas por TC: Un TC con 3 pasos genera 3 FILAS en el CSV:
TC-001,HU_SGINC_02,HU_SGINC_02_TS01,TS01 | TC-001: Validar acceso...,Funcional,PRC-001,1,Autenticar usuario,Usuario: qa_carga_test,Usuario autenticado correctamente,Alta,Baja,Diseñando,10 min,Shift-Left Analyzer,2025-11-22,,BR1,Partición de Equivalencia

TC-001,HU_SGINC_02,HU_SGINC_02_TS01,TS01 | TC-001: Validar acceso...,Funcional,PRC-001,2,Navegar al módulo,Click en menú,Se muestra opción del módulo,Alta,Baja,Diseñando,10 min,Shift-Left Analyzer,2025-11-22,,BR1,Partición de Equivalencia

TC-001,HU_SGINC_02,HU_SGINC_02_TS01,TS01 | TC-001: Validar acceso...,Funcional,PRC-001,3,Acceder al módulo,Click en opción,Pantalla principal se muestra,Alta,Baja,Diseñando,10 min,Shift-Left Analyzer,2025-11-22,,BR1,Partición de Equivalencia
🎯 METODOLOGÍA DE GENERACIÓN DE TEST CASES
REGLA DE ORO - Cobertura 100%:
Por cada Regla de Negocio (BR):
✅ Mínimo 1 TC POSITIVO (caso feliz)
✅ Mínimo 1 TC NEGATIVO (rechazo/error)
✅ Opcional: 1 TC LÍMITE (valores frontera)
Por cada Escenario (E):
✅ Mínimo 1 TC
✅ Si tiene variantes (ej: "buscar por CUIT, Razón Social o Período") → 1 TC por variante
Cobertura Mínima Esperada:
4 BRs → Mínimo 8 TCs (2 por BR)
3 Escenarios → Mínimo 3 TCs
Total mínimo: 11-15 Test Cases para HU típica
Ejemplo Concreto - HU_SGINC_02:
4 Reglas de Negocio + 3 Escenarios = 13 Test Cases:
TC-001: [BR1 POSITIVO] Usuario CON perfil CARGA accede → Suite TS01
TC-002: [BR1 NEGATIVO] Usuario SIN perfil CARGA rechazado → Suite TS01
TC-003: [BR2 POSITIVO] Grilla muestra datos correctamente → Suite TS01
TC-004: [E1] Grilla vacía con mensaje informativo → Suite TS01
TC-005: [BR3 POSITIVO] Botones Importar Lote y Carga Individual visibles → Suite TS01
TC-006: [E2] Buscar por CUIT → Suite TS02
TC-007: [E2] Buscar por Razón Social → Suite TS02
TC-008: [E2] Buscar por Período → Suite TS02
TC-009: [E2 NEGATIVO] Búsqueda sin resultados → Suite TS02
TC-010: [BR4 POSITIVO] Ingreso masivo a entidades → Suite TS03
TC-011: [BR4 POSITIVO] Ingreso individual a entidades → Suite TS03
TC-012: [E3/BR4 NEGATIVO] Rechazo datos inválidos → Suite TS03
TC-013: [BR4] Registro de auditoría → Suite TS03
🔗 TRAZABILIDAD - Estructura de Relaciones
Jerarquía Completa:
EPIC-01 (Módulo Alta de Inconsistencias)
  │
  ├─ HU_SGINC_02 (Alta de Inconsistencias)
  │   │
  │   ├─ HU_SGINC_02_TS01 (Acceso y Visualización)
  │   │   ├─ TC-001 → PRC-001 → BR1
  │   │   ├─ TC-002 → PRC-002 → BR1
  │   │   ├─ TC-003 → PRC-001, PRC-003 → BR2
  │   │   ├─ TC-004 → PRC-001, PRC-004 → E1
  │   │   └─ TC-005 → PRC-001, PRC-005 → BR3
  │   │
  │   ├─ HU_SGINC_02_TS02 (Búsqueda)
  │   │   ├─ TC-006 → PRC-001, PRC-003 → E2
  │   │   ├─ TC-007 → PRC-001, PRC-003 → E2
  │   │   ├─ TC-008 → PRC-001, PRC-003 → E2
  │   │   └─ TC-009 → PRC-001, PRC-003 → E2
  │   │
  │   └─ HU_SGINC_02_TS03 (Validación e Integración)
  │       ├─ TC-010 → PRC-001, PRC-006, PRC-007 → BR4
  │       ├─ TC-011 → PRC-001, PRC-006, PRC-008 → BR4
  │       ├─ TC-012 → PRC-001, PRC-006, PRC-008 → E3, BR4
  │       └─ TC-013 → PRC-001, PRC-006, PRC-009 → BR4
Matriz de Trazabilidad:
TC_ID	Suite	Escenario	BR	Precondiciones
TC-001	TS01	-	BR1	PRC-001
TC-002	TS01	-	BR1	PRC-002
TC-003	TS01	-	BR2	PRC-001, PRC-003
TC-004	TS01	E1	-	PRC-001, PRC-004
TC-005	TS01	-	BR3	PRC-001, PRC-005
TC-006	TS02	E2	-	PRC-001, PRC-003
TC-007	TS02	E2	-	PRC-001, PRC-003
TC-008	TS02	E2	-	PRC-001, PRC-003
TC-009	TS02	E2	-	PRC-001, PRC-003
TC-010	TS03	-	BR4	PRC-001, PRC-006, PRC-007
TC-011	TS03	-	BR4	PRC-001, PRC-006, PRC-008
TC-012	TS03	E3	BR4	PRC-001, PRC-006, PRC-008
TC-013	TS03	-	BR4	PRC-001, PRC-006, PRC-009
⚠️ REGLAS CRÍTICAS Y VALIDACIONES
1. Nomenclatura de IDs:
✅ CORRECTO:
EPIC_ID: EPIC-01
US_ID: HU_SGINC_02
TS_ID: HU_SGINC_02_TS01 (ID compuesto)
TC_ID: TC-001 (global, único en proyecto)
PRC_ID: PRC-001 (global, reutilizable)
❌ INCORRECTO:
TS_ID: TS-01 (ambiguo, se repite en otras HUs)
TC_ID: TC-001-HU02 (innecesariamente complejo)
2. Formato CSV - Escapado de Comas:
Cuando un campo contiene comas, DEBE ir entre comillas dobles:
"Usuario: qa_test | Contraseña: Test123! | Perfil: CARGA, ADMIN"
3. Separadores:
Pipe |: Para separar múltiples valores dentro de un campo
Coma ,: Para separar columnas CSV
Comillas dobles ": Para escapar campos que contienen comas
4. Campos Vacíos:
Si un campo no aplica, dejar vacío (no escribir "N/A", "null", "-"):
TC-001,HU_SGINC_02,HU_SGINC_02_TS01,Titulo...,Funcional,PRC-001,1,Acción,Datos,Resultado,Alta,Baja,Diseñando,10 min,Analyzer,2025-11-22,,BR1,Técnica
                                                                                                                              ↑↑
                                                                                          Campo Cobertura_Escenario vacío (no aplica)
5. Validación de Trazabilidad:
Antes de entregar, verificar:
✅ Todo TC tiene al menos 1 PRC asociada
✅ Todo TC cubre al menos 1 BR o 1 Escenario
✅ Todas las BRs tienen al menos 1 TC positivo y 1 negativo
✅ Todos los Escenarios tienen al menos 1 TC
✅ Los PRCs listados en TC_Asociados existen en CSV 3
✅ Los TCs listados en TC_Generados (CSV 2) existen en CSV 4
✅ IDs consecutivos sin saltos
📝 TEMPLATE DE RESPUESTA PARA CLAUDE AI
Cuando generes CSVs, usa este formato de respuesta:
===== 1_User_Stories.csv =====
[Header completo]
[Fila de datos]

===== 2_Test_Suites.csv =====
[Header completo]
[Fila Suite 1]
[Fila Suite 2]
[Fila Suite 3]

===== 3_Preconditions.csv =====
[Header completo]
[Fila PRC-001]
[Fila PRC-002]
...

===== 4_Test_Cases.csv =====
[Header completo]
[TC-001 Paso 1]
[TC-001 Paso 2]
[TC-001 Paso 3]
[TC-002 Paso 1]
[TC-002 Paso 2]
...
NO usar bloques markdown csv ni backticks.
🎓 ESTÁNDARES Y BUENAS PRÁCTICAS
ISTQB - International Software Testing Qualifications Board:
Técnicas de Diseño de Pruebas:
Partición de Equivalencia
Análisis de Valores Límite
Tablas de Decisión
Transición de Estados
Casos de Uso
Niveles de Prueba:
Unitarias
Integración
Sistema
Aceptación
Tipos de Prueba:
Funcional
No Funcional (Rendimiento, Seguridad, Usabilidad)
Estructural (Caja Blanca)
Regresión
IEEE 829 - Test Documentation:
Documentos que generamos:
✅ Test Plan (implícito en User Stories)
✅ Test Design Specification (Test Suites)
✅ Test Case Specification (Test Cases)
✅ Test Procedure Specification (Pasos de Test Cases)
IEEE 830 - Requirements Specification:
Verificaciones en HU Ideal:
✅ Correcta (sin errores)
✅ No ambigua (clara)
✅ Completa (100% cobertura)
✅ Consistente (sin contradicciones)
✅ Clasificada por importancia
✅ Verificable (testeable)
✅ Modificable (trazable)
✅ Rastreable (IDs únicos)
🚀 EJEMPLO COMPLETO - REFERENCIA SIPQ
Proyecto de Referencia: Sistema SIPQ (Sistema de Permisos) User Story: US_RYU_01 - Ver Roles Características Observadas:
Test Cases con pasos separados:
TC-001 tiene 1 paso
TC-005 tiene múltiples pasos (cada uno es una fila)
Precondiciones reutilizables:
PRC-001 se usa en: TC-001, TC-002, TC-003, TC-004, TC-009, TC-011
Test Suites agrupadas por funcionalidad:
TS-001: Acceso y Visualización
TS-002: Búsqueda y Filtrado
TS-003: Control de Acceso y Permisos
Trazabilidad explícita:
Cada TC indica qué BR/Escenario cubre
TC_Generados lista nombre completo, no solo cantidad
📂 ESTRUCTURA DE ARCHIVOS DEL PROYECTO
Sigma_plataforma_qa/
├── epicas/
│   ├── EP_SIGMA_01-Modulo Alta de Inconsistencias/
│   │   ├── HU_SGINC_02 Alta de Inconsistencias.md (ORIGINAL)
│   │   ├── HU_SGINC_04 Importar Lote.md
│   │   └── HU_SGINC_05 Carga Individual.md
│   └── EP_SIGMA_08-Gestión de Perfiles y Permisos/
│       └── [HUs de gestión de permisos]
│
├── sigma_analyzer/
│   ├── analyzer.py (Ejecuta pruebas estáticas)
│   ├── hu_ideal_generator.py
│   ├── hu_ideal_html_generator.py
│   ├── report_generator.py
│   ├── parser.py
│   ├── csv_ai_generator.py (NO USAR - Genera formato antiguo)
│   ├── reportes/
│   │   └── RESULTADO_PRUEBAS_ESTATICAS_HU_SGINC_02.md
│   └── hu_corregidas/
│       ├── HU_SGINC_02_IDEAL.html (INPUT PARA CLAUDE)
│       └── HU_SGINC_02_IDEAL.md
│
└── flujo-ideal/
    ├── 1_User_Storie.csv (OUTPUT)
    ├── 2_Test_Suite.csv (OUTPUT)
    ├── 3_Precondition.csv (OUTPUT)
    ├── 4_Test_Cases.csv (OUTPUT - Pasos separados)
    ├── 5_Test_Execution.csv (Futuro)
    ├── 6_Bug_Defect.csv (Futuro)
    └── 7_Retesting.csv (Futuro)
🎯 COMANDO DE EJECUCIÓN
Paso 1: Generar HU Ideal (Pruebas Estáticas)
cd sigma_analyzer
python analyzer.py --input "../epicas/EP_SIGMA_01-Modulo Alta de Inconsistencias/HU_SGINC_02 Alta de Inconsistencias.md" --generate-ideal-hu
Salida:
reportes/RESULTADO_PRUEBAS_ESTATICAS_HU_SGINC_02.md
hu_corregidas/HU_SGINC_02_IDEAL.html ← ESTE ES EL INPUT
hu_corregidas/HU_SGINC_02_IDEAL.md
Paso 2: Generar CSVs con Claude AI (Manual)
INPUT para Claude:
Lee el archivo HU_SGINC_02_IDEAL.html y genera los 4 CSVs de trazabilidad siguiendo el formato SIPQ con pasos separados, nomenclatura EPIC-01, y trazabilidad completa.
✅ CHECKLIST DE VALIDACIÓN FINAL
Antes de entregar los CSVs, verificar: CSV 1 - User Stories:
 EPIC_ID presente (EPIC-01)
 Todos los escenarios concatenados correctamente
 Todas las BRs concatenadas correctamente
 VCR calculado correctamente
CSV 2 - Test Suites:
 EPIC_ID = EPIC-01
 TS_ID con formato compuesto (HU_SGINC_02_TS01)
 TC_Generados con LISTADO completo (no solo cantidad)
 Total_TC coincide con cantidad de TCs listados
CSV 3 - Preconditions:
 Mínimo 5-9 precondiciones generadas
 TC_Asociados completo para cada PRC
 Pasos separados por |
 Categorías correctas
CSV 4 - Test Cases:
 Pasos separados (múltiples filas por TC)
 IDs consecutivos sin saltos
 Todas las BRs cubiertas (positivo + negativo)
 Todos los Escenarios cubiertos
 Cobertura mínima alcanzada (11-15 TCs)
 Todos los TCs tienen PRC asociada
 Trazabilidad US → TS → TC → PRC correcta
🎓 NOTAS FINALES PARA CLAUDE
NUNCA generar CSVs con formato antiguo (todo en una celda)
SIEMPRE usar pasos separados (modelo JIRA/XRAY)
SIEMPRE listar TCs completos en Test Suites (no solo cantidad)
SIEMPRE usar IDs compuestos para Test Suites
SIEMPRE verificar cobertura 100% de BRs y Escenarios
SIEMPRE mantener trazabilidad bidireccional (PRC ↔ TC, TS ↔ TC)
NUNCA dejar campos con "N/A" - usar vacío
SIEMPRE escapar comas con comillas dobles
Fecha de creación: 2025-11-22
Versión: 1.0
Autor: Shift-Left Analyzer Team
Proyecto: SIGMA - Sistema Integral de Gestión y Monitoreo de Actuaciones