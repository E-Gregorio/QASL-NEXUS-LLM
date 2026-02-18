# Guía de Estimación VCR y Story Points para Historias de Usuario

Esta guía explica **qué significa cada métrica**, **cómo calcularla** y **cuándo** hacer la estimación,
siguiendo ISTQB y las normas IEEE 829/830.

---

## Cuándo se realiza la estimación

* **Momento**: en la **ceremonia Planning Poker** (primera ceremonia de cada sprint).
* **Participantes**: todo el equipo (QA, Desarrollo, PO, SM).
* **Ámbito**: solo las **User Stories (US)** que están **refinadas y en el backlog del sprint**.
* **Objetivo**: consensuar el esfuerzo (Story Points) y el riesgo (VCR) antes de iniciar el desarrollo.

---

## Métricas y definiciones

| Métrica               | Qué representa                                             | Escala              | Detalle de uso                                         |
| --------------------- | ---------------------------------------------------------- | ------------------- | ------------------------------------------------------ |
| **Story Points (SP)** | Esfuerzo relativo (complejidad + volumen + incertidumbre). | 1, 2, 3, 5, 8, 13   | Sirve para planificar la **capacidad de cada sprint**. |
| **Valor (V)**         | Beneficio de negocio o impacto para el cliente.            | 1–3                 | Alta prioridad si V = 3.                               |
| **Costo (C)**         | Costo de ejecutar las pruebas manuales en cada ciclo.      | 1–3                 | Incluye esfuerzo de datos, ambientes, repetición.      |
| **Probabilidad (P)**  | Probabilidad de que la US falle en producción.             | 1–3                 | Considera complejidad técnica, integraciones nuevas.   |
| **Impacto (I)**       | Gravedad si ocurre la falla.                               | 1–3                 | Evalúa riesgo legal, reputacional, de negocio.         |
| **Riesgo (R)**        | Nivel de riesgo inherente.                                 | **R = P × I** (1–9) | Usado en la fórmula VCR para priorizar automatización. |

---

## Tabla de Story Points (SP)

| Story Point | Equivalente (hombre-horas) | Criterio orientativo                  | Usar cuando…                                                                                                                  |
| ----------- | -------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **1**       | ≈4 h                       | **Tarea muy pequeña**                 | Cambios visuales simples, ajuste de texto/estilo, sin validaciones ni datos.                                                  |
| **2**       | ≈8 h                       | **Tarea pequeña/mediana**             | Mostrar dato simple, consumir un microservicio ya existente, validaciones mínimas.                                            |
| **3**       | ≈16 h                      | **Tarea mediana**                     | Formulario con validación básica y guardado de datos, lógica de negocio simple, MS ya operativo.                              |
| **5**       | ≈32 h                      | **Tarea grande**                      | CRUD de media complejidad, validaciones múltiples, lógica de negocio moderada, puede requerir mocks si falta backend.         |
| **8**       | ≈64 h                      | **Tarea muy grande**                  | CRUD complejo, integraciones con varios servicios, validaciones cruzadas, lógica de negocio robusta.                          |
| **13**      | >96 h (3 semanas+)         | **Épica o historia demasiado grande** | Migraciones de gran alcance, lógica compleja, servicios nuevos, requiere análisis previo y posiblemente dividir en varias US. |

> Estas equivalencias son orientativas: **no son horas exactas**, sino una medida relativa para comparar esfuerzos.

---

## Cálculo de VCR

```
R = P × I
VCR = V + C + R
```

* **R**: riesgo numérico directo, producto de Probabilidad × Impacto.
* **VCR**: suma de Valor + Costo + Riesgo.

**Rangos posibles:**

* V = 1–3
* C = 1–3
* R = 1–9
* **VCR total = 3 a 15**

---

## Regla de decisión

| VCR total   | Estrategia de prueba                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **VCR ≥ 9** | **Deuda técnica** → Se automatiza y se incorpora a la suite de **regresión**.                            |
| **VCR < 9** | **Pruebas manuales** (se ejecuta en ciclos manuales y se revisa en futuros sprints si cambia el riesgo). |

---

## Ejemplo de cálculo

| Métrica             | Valor  |
| ------------------- | ------ |
| V                   | 3      |
| C                   | 2      |
| P                   | 3      |
| I                   | 2      |
| **R (P × I)**       | 6      |
| **VCR (V + C + R)** | **11** |

**Resultado:**
`11 ≥ 9` → La historia **se automatiza** y pasa a **regresión**.

---

## Plantilla para completar en cada US

```markdown
### Estimación
- Story Points (SP): __
- Valor (V 1–3): __
- Costo (C 1–3): __
- Probabilidad (P 1–3): __
- Impacto (I 1–3): __
- Riesgo (R = P × I): __ × __ = __
- **Total VCR = V + C + R = __ + __ + __ = __**
- **Decisión**: si VCR ≥ 9 → Deuda técnica (automatizar y va a regresión); si VCR < 9 → Pruebas manuales.
```

---

## Buenas prácticas

1. **Definir criterios al inicio del proyecto**
   Asegura que todos en el equipo interpreten de igual forma “bajo”, “medio” y “alto”.
2. **Usar Planning Poker**
   Cada miembro asigna su puntaje de SP, V, C, P e I; luego se debate y se llega a un consenso.
3. **Registrar en la US**
   Documenta todos los valores y el cálculo en la historia de usuario para auditoría y reportes.
4. **Revisar en cada sprint**
   Si cambian dependencias o riesgos, se actualiza el cálculo VCR.

---


