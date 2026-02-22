# PROMPT FASE 2: Generacion de CSVs de Trazabilidad Shift-Left Testing

## CONTEXTO DEL PROYECTO

Este es el proyecto **QASL NEXUS LLM** — Plataforma QA con 12 Microservicios + Multi-LLM.

El **MS-02 Pruebas Estaticas** ejecuta analisis estatico sobre Historias de Usuario (HU) en formato ISTQB y genera reportes de cobertura, gaps y escenarios sugeridos.

El flujo de trabajo se divide en **2 fases**:

### FASE 1 (Automatizada - Usuario ejecuta)
```
python run_analysis.py HU_XXX_01
python run_analysis.py --all
```
- Lee la HU original desde: `sigma_analyzer/HU_Original/`
- Genera analisis estatico con Claude AI (gaps de cobertura)
- Guarda reporte en: `sigma_analyzer/reportes/`
- Guarda HU actualizada en: `sigma_analyzer/hu_actualizadas/`

### FASE 2 (Claude - Manual con este prompt)
Claude lee las HUs actualizadas y genera/actualiza los 4 CSVs de trazabilidad.

---

## INSTRUCCIONES PARA CLAUDE - FASE 2

### ARCHIVOS A LEER
1. **HU Actualizada**: `sigma_analyzer/hu_actualizadas/{HU_ID}_ACTUALIZADA.html`

2. **CSVs existentes** (para continuar secuencia):
   - `flujo-ideal/1_User_Stories.csv`
   - `flujo-ideal/2_Test_Suites.csv`
   - `flujo-ideal/3_Preconditions.csv`
   - `flujo-ideal/4_Test_Cases.csv`

### REGLA CRITICA: SECUENCIA GLOBAL DE IDs
Antes de agregar datos, SIEMPRE verificar el ultimo ID en cada CSV:
- **TC-XXX**: Continuar desde el ultimo Test Case
- **TS-XXX**: Continuar desde el ultimo Test Suite
- **PRC-XXX**: Continuar desde la ultima Precondicion

Si los CSVs no existen, comenzar desde TC-001, TS-001, PRC-001.

---

## FORMATO EXACTO DE CADA CSV

### 1. User_Stories.csv
```
HEADER: US_ID,Nombre_US,Epic,Estado,Prioridad,VCR_Valor,VCR_Costo,VCR_Riesgo,VCR_Total,Requiere_Regresion,Es_Deuda_Tecnica,Estimacion_Original_Hrs,Tiempo_Empleado_Hrs,ESCENARIOS DE PRUEBA,Reglas_Negocio,Scope_Acordado,Fuera_Scope,Precondiciones,Link_Documentacion_Base
```

**Reglas:**
- US_ID: Extraer del HTML (campo ID de la HU)
- Epic: Extraer del HTML (campo Epica de la HU)
- Estado: "Completada"
- VCR_Valor, VCR_Costo, VCR_Riesgo, VCR_Total: Extraer de Estimaciones si existen, sino dejar en blanco
- Requiere_Regresion: "Si" si VCR_Total >= 9, "No" si < 9
- Es_Deuda_Tecnica: "Si" si VCR_Total >= 9, "No" si < 9
- ESCENARIOS DE PRUEBA: Formato condensado con pipe `|` separador
  - Ejemplo: `"E1: Titulo (Dado... cuando... entonces...) | E2: Titulo (Dado... cuando... entonces...)"`
- Reglas_Negocio: Formato `"BR1: desc | BR2: desc | BR3: desc"`
- Scope_Acordado: Extraer de "Dentro del Alcance"
- Fuera_Scope: Extraer de "Fuera del Alcance"
- Precondiciones: Extraer de "Precondiciones"

### 2. Test_Suites.csv
```
HEADER: EPIC_ID,US_ID,TS_ID,Nombre_Suite,Descripcion_Suite,Prioridad,Categoria,Tecnica_Aplicada,Descripcion_Analisis,Link_Analisis,TC_Generados,Estado,QA_Framework,Ambiente_Testing,Total_TC,Estimacion_Horas
```

**Reglas:**
- EPIC_ID: Extraer de la Epica de la HU
- Crear 2-3 Suites por HU segun funcionalidad:
  - Suite 1: Flujos positivos (escenarios de camino feliz)
  - Suite 2: Flujos negativos (escenarios de error/validacion)
  - Suite 3: Seguridad/Integracion (si aplica)
- TC_Generados: **CADA TC EN LINEA SEPARADA** dentro de la celda
  ```
  "TC-001: Validar acceso al modulo
  TC-002: Validar visualizacion tabla
  TC-003: Validar botones"
  ```
- Prioridad: Alta/Media segun criticidad
- Estado: "Activa"
- QA_Framework: "Selenium" (o el que corresponda al proyecto)
- Ambiente_Testing: "QA"

### 3. Preconditions.csv
```
HEADER: PRC_ID,Titulo_PRC,Descripcion,Datos_Requeridos,Estado_Sistema,Categoria,Reutilizable,TC_Asociados
```

**Reglas:**
- Crear 2-3 Precondiciones por HU basadas en las precondiciones del HTML
- Datos_Requeridos: Datos necesarios para ejecutar los TCs (usuarios, credenciales, datos de prueba)
- Estado_Sistema: Estado que debe tener el sistema antes de ejecutar (ej: `Sistema operativo / BD disponible / Usuario autenticado`)
- Categoria: General, Seguridad, Datos, Funcional, Integracion
- Reutilizable: "Si"
- TC_Asociados: Separados por pipe `|` → `TC-001 | TC-002 | TC-003`

### 4. Test_Cases.csv
```
HEADER: ID_TC,US_ID,TS_ID,Titulo_TC,Tipo_Prueba,PRC_Asociadas,Tecnica_Aplicada,Descripcion_Tecnica,Paso_Numero,Paso_Accion,Paso_Datos,Resultado Esperado,Prioridad,Complejidad,Estado,Tiempo_Estimado,Creado_Por,Fecha_Creacion,Ultima_Ejecucion,Ultimo_Resultado
```

**Reglas CRITICAS:**
- ID_TC: Secuencial global (TC-001, TC-002, etc.)
- US_ID: ID de la HU analizada
- TS_ID: ID del Test Suite al que pertenece
- Titulo_TC: Formato `"TS-XXX | TC-XXX: Validar descripcion"`
- Tipo_Prueba: Funcional, Seguridad, Integracion
- PRC_Asociadas: IDs de precondiciones separados por pipe `|`
- Tecnica_Aplicada: "Caja Negra"
- Descripcion_Tecnica: `"Verificar X segun BRX"` (referenciar Business Rule)
- Paso_Numero: 1 (un paso por TC)
- Paso_Accion: Accion derivada del CUANDO del escenario Gherkin
- Paso_Datos: Datos del DADO del escenario Gherkin
- **"Resultado Esperado"**: CON ESPACIO (no underscore) — derivado del ENTONCES del escenario
- Prioridad: Alta/Media/Baja segun criticidad del escenario
- Complejidad: Alta/Media/Baja
- Estado: "Designing"
- Tiempo_Estimado: 10m, 15m, 20m, 25m
- Creado_Por: Nombre del QA del proyecto
- Fecha_Creacion: DD/MM/YYYY (fecha actual)
- Ultima_Ejecucion: DD/MM/YYYY (fecha actual)
- Ultimo_Resultado: "PENDIENTE"

---

## PROCESO PASO A PASO

1. **Leer la HU actualizada** del HTML en `hu_actualizadas/`
2. **Leer los 4 CSVs existentes** en `flujo-ideal/` para obtener ultimos IDs (si no existen, iniciar desde 001)
3. **Identificar**:
   - ID de la HU
   - Nombre de la HU
   - Epica
   - Escenarios de prueba (E1, E2, E3... originales + agregados)
   - Reglas de negocio (BR1, BR2, BR3...)
   - Prioridad y VCR

4. **Calcular nuevos IDs**:
   - Siguiente TC: ultimo TC + 1
   - Siguiente TS: ultimo TS + 1
   - Siguiente PRC: ultimo PRC + 1

5. **Generar contenido**:
   - 1 fila en User_Stories (la HU completa)
   - 2-3 filas en Test_Suites (agrupando TCs logicamente por tipo)
   - 2-3 filas en Preconditions (basadas en precondiciones de la HU)
   - 1 TC por cada escenario de la HU (tanto originales como agregados por el analisis)

6. **Actualizar los 4 CSVs** anadiendo las nuevas filas

---

## EJEMPLO DE MAPEO HU → CSVs

**HU_LOGIN_01 - Inicio de Sesion de Usuario** (10 escenarios, 5 BRs)

| Escenario | Test Case | Test Suite | Precondicion |
|-----------|-----------|------------|--------------|
| E1: Login exitoso | TC-001 | TS-001 (Flujos positivos) | PRC-001, PRC-002 |
| E2: Contrasena incorrecta | TC-002 | TS-002 (Flujos negativos) | PRC-001, PRC-002 |
| E3: Bloqueo de cuenta | TC-003 | TS-002 (Flujos negativos) | PRC-001, PRC-003 |
| E4: Email invalido (Agregado) | TC-004 | TS-002 (Flujos negativos) | PRC-001 |
| E5: Contrasena invalida (Agregado) | TC-005 | TS-002 (Flujos negativos) | PRC-001 |
| E6: Desbloqueo correcto (Agregado) | TC-006 | TS-001 (Flujos positivos) | PRC-001, PRC-003 |
| E7: Expiracion sesion (Agregado) | TC-007 | TS-003 (Seguridad) | PRC-001, PRC-002 |
| E8: Sesion activa (Agregado) | TC-008 | TS-003 (Seguridad) | PRC-001, PRC-002 |
| E9: Log auditoria exitoso (Agregado) | TC-009 | TS-003 (Seguridad) | PRC-001, PRC-002 |
| E10: Log auditoria fallido (Agregado) | TC-010 | TS-003 (Seguridad) | PRC-001, PRC-002 |

---

## RESUMEN ESTADO ACTUAL

Los IDs inician desde cero. A medida que se analicen HUs y se generen CSVs, actualizar esta seccion.

**Proximos IDs disponibles:**
- TC-001
- TS-001
- PRC-001

---

## NOTAS IMPORTANTES

1. **Trazabilidad completa** - Cada TC debe referenciar su TS y PRC
2. **Mantener coherencia** - Los IDs deben ser secuenciales sin saltos
3. **Formato estricto** - Respetar exactamente los headers y formatos de cada CSV
4. **Escenarios originales + agregados** - Incluir TODOS los escenarios de la HU actualizada (los que escribio el analista + los sugeridos por el analisis estatico)
5. **Mapeo Gherkin → TC**: DADO → Paso_Datos / CUANDO → Paso_Accion / ENTONCES → Resultado Esperado
6. **VCR >= 9**: Marcar como deuda tecnica → automatizar y pasar a regresion
7. **VCR < 9**: Pruebas manuales
8. **Fechas**: Usar la fecha en que se genera

---

*QASL NEXUS LLM - MS-02 Pruebas Estaticas | Metodologia Shift-Left Testing*
*Normas: ISTQB v4.0 | IEEE 829 | IEEE 830 | ISO 29119*
