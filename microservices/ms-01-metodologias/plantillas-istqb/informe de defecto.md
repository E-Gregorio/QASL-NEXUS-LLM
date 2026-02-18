Aquí tienes la **revisión final** del **Informe de Defecto**, alineada con
**ISTQB Foundation v4.0 (Cap. 5 – Evaluación y Reporte de Defectos)**,
**ISO/IEC/IEEE 29119-3** (*Test Incident Report*) y **IEEE 829**.

La estructura que presentas es muy sólida; he **reforzado y organizado** algunos puntos para mejorar la trazabilidad y cumplir 100 % con las normas.

---

# 🐞 Informe de Defecto – Plantilla Final

**ID:** BUG-\_\_\_\_
**Título:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Resumen / Descripción breve:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Fecha de informe:** ****/****/\_\_\_\_\_\_
**Organización emisora:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Autor (reporter):** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Elemento de prueba / Módulo afectado:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Versión / Build:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Entorno:** SO \_\_\_\_ | Navegador/App \_\_\_\_ | Datos de prueba: \_\_\_\_\_\_
**Fase observada:** \[Revisión estática | Componente | Integración | Sistema | UAT | Producción]

---

## 1️⃣ Pasos para reproducir

1. ---
2. ---
3. ---

**Datos de prueba utilizados:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
**Condiciones previas / Configuración necesaria:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## 2️⃣ Resultados

| Tipo de resultado | Descripción                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| **Esperado**      | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
| **Real**          | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |

---

## 3️⃣ Evidencia adjunta

* **Logs:** Ruta/archivo \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
* **Capturas / Video:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
* **Dumps u otros archivos de soporte:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

> Estos elementos permiten reproducir el defecto y respaldar el análisis.

---

## 4️⃣ Evaluación del defecto

| Campo                         | Detalle                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| **Severidad**                 | \[Bloqueante / Alta / Media / Baja] – impacto en la funcionalidad o en el negocio |
| **Prioridad / Urgencia**      | \[P1 / P2 / P3 / P4] – velocidad requerida para su corrección                     |
| **Frecuencia de ocurrencia**  | \[Siempre / Intermitente / Rara]                                                  |
| **Impacto / Alcance**         | Módulos, procesos o usuarios afectados                                            |
| **Clasificación del defecto** | \[Funcional / Interfaz / Rendimiento / Seguridad / Datos / Ambiente / Requisito]  |

---

## 5️⃣ Referencias y trazabilidad

| Elemento                    | Identificador |
| --------------------------- | ------------- |
| Historia de Usuario / Épica | \_\_\_\_\_\_  |
| Caso de prueba (TC)         | \_\_\_\_\_\_  |
| Build / Release             | \_\_\_\_\_\_  |
| Ticket o issue relacionado  | \_\_\_\_\_\_  |
| Documento de requerimientos | \_\_\_\_\_\_  |

---

## 6️⃣ Información adicional

| Campo                          | Detalle                                                |
| ------------------------------ | ------------------------------------------------------ |
| **Workaround disponible**      | ¿Existe solución temporal? Sí/No – Detallar            |
| **Notas / Observaciones**      | Información adicional, hipótesis, datos de diagnóstico |
| **Acción correctiva sugerida** | Opcional: recomendación del equipo de QA               |

---

## 7️⃣ Estado y seguimiento

| Campo                     | Detalle                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| **Estado actual**         | \[Nuevo / Asignado / En progreso / Resuelto / Cerrado / Rechazado / Duplicado] |
| **Responsable**           | Desarrollador, equipo o área encargada                                         |
| **Fecha de cierre**       | (si aplica)                                                                    |
| **Resultado del re-test** | \[Pass / Fail]                                                                 |

---

### 📚 Normas de referencia

* **ISTQB FL v4.0 – Capítulo 5**: Evaluación y reporte de incidentes/defectos.
* **ISO/IEC/IEEE 29119-3**: Test Incident Report Template.
* **IEEE 829**: Standard for Software Test Documentation.

---

## Principales mejoras respecto a tu versión original

1. **Sección “Clasificación del defecto”**:
   Para cumplir ISO/IEC/IEEE 29119-3 y facilitar métricas por tipo de defecto.
2. **Trazabilidad ampliada**:
   Enlaces directos a **Historia de Usuario, Épica, TC y Build**, asegurando el vínculo con la planificación.
3. **Acción correctiva sugerida**:
   Campo opcional para que QA pueda proponer mitigaciones tempranas.
4. **Resultado del re-test y fecha de cierre**:
   Importante para auditorías y reportes de cierre.

---

✅ **Conclusión**
Con esta versión el **Informe de Defecto** está completamente alineado con
**ISTQB, IEEE 829** y **ISO/IEC/IEEE 29119-3**,
y listo para ser usado en tu Centro de Control de QA para trazabilidad, seguimiento y auditoría.
