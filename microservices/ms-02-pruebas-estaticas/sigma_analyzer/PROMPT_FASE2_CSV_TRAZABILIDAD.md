# PROMPT FASE 2: Generación de CSVs de Trazabilidad Shift-Left Testing

## CONTEXTO DEL PROYECTO

Este es el proyecto **SIGMA QA Platform** para el módulo **Alta de Inconsistencias (EP_SIGMA_01)**.

El flujo de trabajo se divide en **2 fases**:

### FASE 1 (Automatizada - Usuario ejecuta)
```
python C:\Users\Epidater\Desktop\Proyectos\Sigma_plataforma_qa\sigma_analyzer\run_analysis.py
```
- Lee la HU original
- Genera análisis estático (gaps de cobertura)
- Guarda reporte en: `sigma_analyzer\reportes\`
- Guarda HU actualizada en: `sigma_analyzer\hu_actualizadas\`

### FASE 2 (Claude - Manual con este prompt)
Claude lee las HUs actualizadas y genera/actualiza los 4 CSVs de trazabilidad.

---

## INSTRUCCIONES PARA CLAUDE - FASE 2

### ARCHIVOS A LEER
1. **HU Actualizada**: `C:\Users\Epidater\Desktop\Proyectos\Sigma_plataforma_qa\sigma_analyzer\hu_actualizadas\HU_SGINC_XX_ACTUALIZADA.html`

2. **CSVs existentes** (para continuar secuencia):
   - `flujo-ideal\1_User_Stories.csv`
   - `flujo-ideal\2_Test_Suites.csv`
   - `flujo-ideal\3_Preconditions.csv`
   - `flujo-ideal\4_Test_Cases.csv`

### REGLA CRÍTICA: SECUENCIA GLOBAL DE IDs
Antes de agregar datos, SIEMPRE verificar el último ID en cada CSV:
- **TC-XXX**: Continuar desde el último Test Case
- **TS-XXX**: Continuar desde el último Test Suite
- **PRC-XXX**: Continuar desde la última Precondición

---

## FORMATO EXACTO DE CADA CSV

### 1. User_Stories.csv
```
HEADER: US_ID,Nombre_US,Epic,Estado,Prioridad,VCR_Valor,VCR_Costo,VCR_Riesgo,VCR_Total,Requiere_Regresion,Es_Deuda_Tecnica,Estimacion_Original_Hrs,Tiempo_Empleado_Hrs,ESCENARIOS DE PRUEBA,Reglas_Negocio,Scope_Acordado,Fuera_Scope,Precondiciones,Link_Documentacion_Base
```

**Reglas:**
- US_ID: HU_SGINC_XX (extraer del HTML)
- Epic: "EP_SIGMA_01 Módulo Alta de Inconsistencias"
- Estado: "Completada"
- ESCENARIOS DE PRUEBA: Formato condensado con pipe `|` separador
  - Ejemplo: `"E1: Título (Dado... cuando... entonces...) | E2: Título (Dado... cuando... entonces...)"`

### 2. Test_Suites.csv
```
HEADER: EPIC_ID,US_ID,TS_ID,Nombre_Suite,Descripcion_Suite,Prioridad,Categoria,Tecnica_Aplicada,Descripcion_Analisis,Link_Analisis,TC_Generados,Estado,QA_Framework,Ambiente_Testing,Total_TC,Estimacion_Horas
```

**Reglas:**
- Crear 2-3 Suites por HU según funcionalidad
- TC_Generados: **CADA TC EN LÍNEA SEPARADA** dentro de la celda
  ```
  "TC-001: Validar acceso al módulo
  TC-002: Validar visualización tabla
  TC-003: Validar botones"
  ```
- Prioridad: Alta/Media según criticidad
- Estado: "Activa"
- QA_Framework: "Selenium"
- Ambiente_Testing: "QA"

### 3. Preconditions.csv
```
HEADER: PRC_ID,Titulo_PRC,Descripcion,Datos_Requeridos,Estado_Sistema,Categoria,Reutilizable,TC_Asociados
```

**Reglas:**
- Crear 2-3 Precondiciones por HU
- Datos_Requeridos: `Usuario: qa_test / Contraseña: Test123! / Permisos: específicos`
- Estado_Sistema: `Sistema operativo / BD disponible / Usuario autenticado`
- Categoria: General, Seguridad, Datos, Funcional, Integración
- Reutilizable: "Si"
- TC_Asociados: Separados por pipe `|` → `TC-001 | TC-002 | TC-003`

### 4. Test_Cases.csv
```
HEADER: ID_TC,US_ID,TS_ID,Titulo_TC,Tipo_Prueba,PRC_Asociadas,Tecnica_Aplicada,Descripcion_Tecnica,Paso_Numero,Paso_Accion,Paso_Datos,Resultado Esperado,Prioridad,Complejidad,Estado,Tiempo_Estimado,Creado_Por,Fecha_Creacion,Ultima_Ejecucion,Ultimo_Resultado
```

**Reglas CRÍTICAS:**
- Titulo_TC: Formato `"TS-XXX | TC-XXX: Validar descripción"`
- Tipo_Prueba: Funcional, Seguridad, Integración
- Tecnica_Aplicada: "Caja Negra"
- Descripcion_Tecnica: `"Verificar X según BRX"` (referenciar Business Rule)
- Paso_Numero: 1 (un paso por TC)
- **"Resultado Esperado"**: CON ESPACIO (no underscore)
- Prioridad: Alta/Media/Baja según criticidad del escenario
- Complejidad: Alta/Media/Baja
- Estado: "Designing"
- Tiempo_Estimado: 10m, 15m, 20m, 25m
- Creado_Por: "Elyer Maldonado"
- Fecha_Creacion: DD/MM/YYYY (fecha actual)
- Ultima_Ejecucion: DD/MM/YYYY (fecha actual)
- Ultimo_Resultado: "PENDIENTE"

---

## PROCESO PASO A PASO

1. **Leer la HU actualizada** del HTML
2. **Leer los 4 CSVs existentes** para obtener últimos IDs
3. **Identificar**:
   - ID de la HU (HU_SGINC_XX)
   - Nombre de la HU
   - Escenarios de prueba (E1, E2, E3...)
   - Reglas de negocio (BR1, BR2, BR3...)
   - Prioridad

4. **Calcular nuevos IDs**:
   - Siguiente TC: último TC + 1
   - Siguiente TS: último TS + 1
   - Siguiente PRC: último PRC + 1

5. **Generar contenido**:
   - 1 fila en User_Stories
   - 2-3 filas en Test_Suites (agrupando TCs lógicamente)
   - 2-3 filas en Preconditions
   - 1 TC por cada escenario de la HU

6. **Actualizar los 4 CSVs** añadiendo las nuevas filas

---

## EJEMPLO DE MAPEO HU → CSVs

**HU_SGINC_06 - Generar Expediente Lote** (7 escenarios, 4 BRs)

| Escenario | Test Case | Test Suite | Precondición |
|-----------|-----------|------------|--------------|
| E1: Habilitación | TC-038 | TS-013 | PRC-013, PRC-015 |
| E2: Generación exitosa | TC-040 | TS-014 | PRC-013, PRC-014 |
| E3: Error generación | TC-043 | TS-015 | PRC-014 |
| E4: Negativo BR1 | TC-039 | TS-013 | PRC-015 |
| E5: Negativo BR2 | TC-043 | TS-015 | PRC-014 |
| E6: Negativo BR3 | TC-044 | TS-015 | PRC-013 |
| E7: Positivo BR4 | TC-041 | TS-014 | PRC-014 |

---

## RESUMEN ESTADO ACTUAL

### EP_SIGMA_01 - Módulo Alta de Inconsistencias

| HU | Test Suites | Test Cases | Preconditions |
|----|-------------|------------|---------------|
| HU_SGINC_02 | TS-001 a TS-003 | TC-001 a TC-008 | PRC-001 a PRC-003 |
| HU_SGINC_03 | TS-004 a TS-006 | TC-009 a TC-019 | PRC-004 a PRC-006 |
| HU_SGINC_04 | TS-007 a TS-009 | TC-020 a TC-029 | PRC-007 a PRC-009 |
| HU_SGINC_05 | TS-010 a TS-012 | TC-030 a TC-037 | PRC-010 a PRC-012 |
| HU_SGINC_06 | TS-013 a TS-015 | TC-038 a TC-044 | PRC-013 a PRC-015 |

### EP_SGPP - Perfiles y Permisos

| HU | Test Suites | Test Cases | Preconditions |
|----|-------------|------------|---------------|
| HU_SGPP_01 | TS-016 a TS-024 | TC-045 a TC-071 | PRC-016 a PRC-024 |
| HU_SGPP_02 | TS-025 a TS-028 | TC-072 a TC-083 | PRC-025 a PRC-028 |

**Próximos IDs disponibles:**
- TC-084
- TS-029
- PRC-029

---

## NOTAS IMPORTANTES

1. **NO usar IA externa** - Claude genera directamente los CSVs
2. **Mantener coherencia** - Los IDs deben ser secuenciales sin saltos
3. **Trazabilidad completa** - Cada TC debe referenciar su TS y PRC
4. **Formato estricto** - Respetar exactamente los headers y formatos
5. **Creado_Por**: Siempre "Elyer Maldonado"
6. **Fechas**: Usar la fecha en que se genera

---

*Prompt generado el 29/11/2025 - SIGMA QA Platform v3.0*
