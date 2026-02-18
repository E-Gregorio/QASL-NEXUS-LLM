# Master Test Plan (MTP)
**Norma de referencia:** ISO/IEC/IEEE 29119-3 — Test Planning  
**Complemento:** IEEE 829 — Standard for Software Test Documentation

**Proyecto / Sistema:**  
**Versión / Release objetivo:**  
**Fecha de elaboración:**  
**Responsable / Equipo QA:**  

---

## 1. Propósito y Referencias Normativas
Este documento se elabora conforme a **ISO/IEC/IEEE 29119-3 (sección Test Planning)**  
y **IEEE 829 (Test Plan / Master Test Plan)**.  
Su objetivo es definir el enfoque, los recursos y el calendario de todas las pruebas del proyecto,  
establecer criterios de entrada, salida, suspensión y reanudación,  
y asegurar trazabilidad y control de calidad durante todo el ciclo de vida del software.

Referencias específicas:  
- ISTQB v4.0 – Capítulo 5: Planificación y Control de Pruebas  
- ISO/IEC/IEEE 29119-3 – Test Plan & Master Test Plan  
- IEEE 829 – Standard for Software Test Documentation

---

## 2. Alcance del Proyecto de Pruebas
### 2.1 Alcance Incluido
- Sistemas / módulos y componentes a probar.  
- Interfaces internas y externas.  
- Tipos de prueba (funcional, integración, rendimiento, seguridad, etc.).

### 2.2 Fuera de Alcance
- Elementos excluidos y su justificación.

---

## 3. Estrategia de Prueba
- Enfoque general (ágil, cascada, híbrido; shift-left; automatización).  
- Niveles de prueba: componente, integración, sistema, aceptación.  
- Tipos y técnicas de prueba: análisis de valores límite, partición de equivalencia, etc.  
- Datos de prueba: diseño, generación, mantenimiento.  
- Herramientas y entornos: CI/CD, frameworks de automatización, monitoreo.

---

## 4. Organización y Roles
| Rol / Perfil | Responsabilidades |
|--------------|-------------------|
| Líder QA | Planificación y supervisión global del MTP |
| QA Analistas / Automation | Diseño y ejecución de pruebas, automatización, reporte de defectos |
| Desarrolladores | Corrección de defectos, soporte técnico |
| PO / Stakeholders | Aprobación de criterios, aceptación final |

---

## 5. Recursos y Calendario
### 5.1 Recursos
- Personal, infraestructura, licencias de herramientas, ambientes de prueba.

### 5.2 Cronograma Global
- Fases y hitos de prueba.
- Entregables principales.
- Dependencias con otros proyectos o equipos.

---

## 6. Gestión de Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación | Contingencia |
|--------|-------------|---------|-----------|-------------|

---

## 7. Criterios de Entrada, Salida y Suspensión/Reanudación
### 7.1 Criterios de Entrada
- Requisitos baselined, ambiente configurado, datos listos, código integrado.

### 7.2 Criterios de Salida
- Cobertura mínima de requisitos, defectos críticos resueltos, métricas de calidad alcanzadas.

### 7.3 Criterios de Suspensión y Reanudación
- **Suspensión:** Se interrumpen las pruebas si  
  - la tasa de error en pruebas de estrés/concurrencia supera el 25 %.  
  - surgen defectos críticos que bloqueen flujos esenciales.  
  - el entorno QA no es estable.
- **Reanudación:** Se retoman las pruebas cuando  
  - se corrigen los defectos bloqueantes o se restablece el ambiente.  
  - se valida la estabilidad del entorno y el líder QA autoriza la reanudación.

---

## 8. Entregables de Prueba
- Planes de prueba por sprint o release.  
- Suites y casos de prueba.  
- Informes de avance y de cierre.  
- Informes de defectos.  
- Matriz de trazabilidad Requisito/Historia → Caso de prueba → Resultado.

---

## 9. Métricas y Seguimiento
| Métrica | Valor esperado / Objetivo |
|---------|---------------------------|
| Casos planificados / ejecutados | |
| Casos pasados / fallidos | |
| Defectos abiertos / cerrados | |
| Cobertura de requisitos (%) | |
| Cobertura de código (%) (opcional) | |

---

## 10. Trazabilidad
- Mapa de requerimientos a casos de prueba y resultados.
- Documentos de diseño, requisitos, mockups y normas aplicadas.

---

## 11. Control de Cambios
| Versión | Fecha | Autor | Descripción del cambio |
|---------|-------|-------|------------------------|

