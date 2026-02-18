# Framework de Aseguramiento de Calidad para IA

## Metodología de Evaluación para Sistemas con Inteligencia Artificial

---

**Versión:** 1.0
**Fecha:** Enero 2025
**Autor:** Elyer Gregorio Maldonado
**Rol:** Líder Técnico QA
**Organización:** Epidata

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Objetivo del Framework](#2-objetivo-del-framework)
3. [Alcance](#3-alcance)
4. [Marco Normativo y Referencias](#4-marco-normativo-y-referencias)
5. [Tipos de Evaluación](#5-tipos-de-evaluación)
6. [Métricas de Evaluación](#6-métricas-de-evaluación)
7. [Proceso de Evaluación](#7-proceso-de-evaluación)
8. [Requisitos para el Solicitante](#8-requisitos-para-el-solicitante)
9. [Entregables](#9-entregables)
10. [Niveles de Aprobación](#10-niveles-de-aprobación)
11. [Glosario](#11-glosario)
12. [Referencias](#12-referencias)

---

## 1. Introducción

### 1.1 Contexto

La adopción acelerada de sistemas de Inteligencia Artificial (IA) en aplicaciones de atención ciudadana, servicios empresariales y plataformas digitales ha generado la necesidad de establecer mecanismos de evaluación que garanticen la calidad, seguridad y confiabilidad de estos sistemas.

Los asistentes virtuales, chatbots y modelos de lenguaje (LLM) integrados en aplicaciones procesan información sensible, toman decisiones que afectan a usuarios y representan la imagen de las organizaciones que los implementan. Por lo tanto, es fundamental contar con un marco de evaluación riguroso y basado en estándares internacionales.

### 1.2 Propósito del Documento

Este documento describe la metodología de evaluación de sistemas basados en Inteligencia Artificial, estableciendo los criterios, métricas y procesos necesarios para verificar que estos sistemas cumplan con los estándares de calidad, seguridad y rendimiento requeridos.

### 1.3 Alineación con Estándares Internacionales

Este framework está desarrollado siguiendo los lineamientos de:

- **ISO/IEC TR 29119-11:2020** - Testing de Sistemas basados en IA
- **ISO/IEC TS 42119-2:2025** - Testing de IA con enfoque basado en riesgos
- **OWASP LLM Top 10 2025** - Vulnerabilidades en modelos de lenguaje

Adicionalmente, proporciona la evidencia de testing necesaria para organizaciones que buscan certificarse en **ISO/IEC 42001:2023** (Sistema de Gestión de IA).

---

## 2. Objetivo del Framework

### 2.1 Objetivo General

Proporcionar una metodología sistemática y objetiva para evaluar la calidad, seguridad y rendimiento de sistemas que incorporan Inteligencia Artificial, garantizando que cumplan con los estándares internacionales y la normativa vigente.

### 2.2 Objetivos Específicos

| N° | Objetivo |
|----|----------|
| 1 | Verificar la calidad de las respuestas generadas por sistemas de IA |
| 2 | Detectar vulnerabilidades de seguridad específicas de modelos de lenguaje |
| 3 | Medir el rendimiento y estabilidad del sistema |
| 4 | Generar evidencia auditable para cumplimiento normativo |
| 5 | Proporcionar recomendaciones de mejora basadas en hallazgos |

---

## 3. Alcance

### 3.1 Sistemas Evaluables

Este framework permite evaluar:

| Tipo de Sistema | Descripción |
|-----------------|-------------|
| **Chatbots** | Asistentes virtuales de atención al cliente o ciudadano |
| **Asistentes Virtuales** | Sistemas de ayuda integrados en aplicaciones |
| **LLM Integrados** | Modelos de lenguaje incorporados en plataformas existentes |
| **Sistemas Conversacionales** | Cualquier sistema que procese lenguaje natural |

### 3.2 Aspectos Evaluados

| Aspecto | Descripción |
|---------|-------------|
| **Funcionalidad** | Calidad y precisión de las respuestas |
| **Seguridad** | Resistencia a ataques y manipulación |
| **Rendimiento** | Tiempos de respuesta y estabilidad |
| **Cumplimiento** | Alineación con normativas vigentes |

### 3.3 Exclusiones

Este framework no cubre:

- Evaluación de datos de entrenamiento
- Desarrollo o modificación de modelos
- Monitoreo continuo en producción (24/7)
- Evaluación de sistemas de voz/audio

---

## 4. Marco Normativo y Referencias

### 4.1 Normativa Internacional

#### Estándares ISO/IEC

| Estándar | Nombre | Aplicación |
|----------|--------|------------|
| **ISO/IEC 42001:2023** | Sistema de Gestión de IA | Marco de gestión organizacional para IA |
| **ISO/IEC TR 29119-11:2020** | Testing de Sistemas basados en IA | Guía para testing de sistemas de IA |
| **ISO/IEC TS 42119-2:2025** | Testing de IA | Enfoque basado en riesgos |
| **ISO/IEC 22989** | Conceptos y Terminología de IA | Definiciones estándar |
| **ISO/IEC 23053** | Framework para Machine Learning | Marco de referencia para ML |

#### Estándares IEEE

| Estándar | Nombre | Aplicación |
|----------|--------|------------|
| **IEEE 829** | Documentación de Testing | Formato de documentación de pruebas |
| **IEEE 830** | Especificación de Requisitos | Definición de requisitos de software |
| **IEEE 29119** | Testing de Software | Marco general de testing |

#### Certificaciones de Testing

| Certificación | Organismo | Aplicación |
|---------------|-----------|------------|
| **ISTQB CT-AI** | ISTQB | Certified Tester AI Testing |
| **ISTQB Foundation** | ISTQB | Base de conocimiento en testing |

#### Seguridad

| Estándar | Organismo | Aplicación |
|----------|-----------|------------|
| **OWASP LLM Top 10 2025** | OWASP | Vulnerabilidades en modelos de lenguaje |
| **OWASP Top 10** | OWASP | Vulnerabilidades web generales |

### 4.2 Normativa Argentina

#### Legislación Nacional

| Norma | Descripción | Aplicación |
|-------|-------------|------------|
| **Ley 25.326** | Protección de Datos Personales | Cuando el sistema maneja datos personales |
| **Disposición 2/2023** | Recomendaciones para una IA Fiable | Principios de transparencia y seguridad |

#### Normativa de Buenos Aires

| Norma | Descripción |
|-------|-------------|
| **Ley N° 2689** | Creación de la Agencia de Sistemas de Información (ASI) |
| **Resolución 177-ASINF/13** | Marco Normativo Tecnológico |
| **Resolución 239-ASINF/14** | Lineamientos de Tecnologías de la Información |

#### Regulación Provincial

| Norma | Descripción |
|-------|-------------|
| **Regulación IA PBA 2025** | Clasificación de sistemas de IA por niveles de riesgo |

### 4.3 Marco Europeo de Referencia

| Norma | Descripción |
|-------|-------------|
| **Reglamento UE 2024/1689** | AI Act - Reglamento de Inteligencia Artificial |
| **Clasificación por Riesgos** | Inaceptable, Alto, Limitado, Mínimo |

---

## 5. Tipos de Evaluación

### 5.1 Evaluación Funcional

Verifica que el sistema de IA responda de manera correcta, coherente y completa.

#### Aspectos Evaluados

| Aspecto | Descripción | Criterio |
|---------|-------------|----------|
| **Relevancia** | ¿Responde lo que se pregunta? | La respuesta debe abordar directamente la consulta |
| **Precisión** | ¿La información es correcta? | No debe contener errores factuales |
| **Coherencia** | ¿Tiene sentido lógico? | Estructura clara y comprensible |
| **Completitud** | ¿Cubre todos los aspectos? | Respuesta integral sin omisiones importantes |
| **Alucinación** | ¿Inventa información? | No debe generar datos falsos o inexistentes |

#### Metodología

La evaluación funcional utiliza el patrón **"Evaluación mediante Inteligencia Artificial"**, donde un sistema de IA independiente evalúa las respuestas del sistema bajo prueba, eliminando la subjetividad humana y proporcionando métricas objetivas y reproducibles.

Este enfoque está alineado con **ISO/IEC TR 29119-11:2020**, que reconoce el "problema del oráculo de prueba" en sistemas de IA y propone soluciones automatizadas para evaluar respuestas no determinísticas.

### 5.2 Evaluación de Seguridad

Verifica que el sistema sea resistente a ataques y no presente vulnerabilidades críticas.

#### Categorías OWASP LLM Top 10 2025

| ID | Vulnerabilidad | Descripción | Severidad |
|----|----------------|-------------|-----------|
| **LLM01** | Inyección de Prompts | Manipulación mediante instrucciones maliciosas | Alta |
| **LLM02** | Manejo Inseguro de Salidas | Respuestas que contienen código malicioso | Alta |
| **LLM03** | Envenenamiento de Datos | Sesgo o manipulación en respuestas | Media |
| **LLM04** | Denegación de Servicio | Resistencia a sobrecarga | Media |
| **LLM05** | Vulnerabilidades de Cadena de Suministro | Componentes externos comprometidos | Alta |
| **LLM06** | Divulgación de Información Sensible | Fuga de datos confidenciales | Crítica |
| **LLM07** | Diseño Inseguro de Plugins | Extensiones vulnerables | Alta |
| **LLM08** | Agencia Excesiva | Acciones no autorizadas | Alta |
| **LLM09** | Dependencia Excesiva | Confianza ciega en respuestas | Media |
| **LLM10** | Robo de Modelo | Extracción de información del modelo | Alta |

#### Evaluaciones Adicionales de Seguridad

| Categoría | Descripción |
|-----------|-------------|
| **Contenido Tóxico** | Generación de contenido ofensivo o dañino |
| **Sesgo y Discriminación** | Respuestas con prejuicios o estereotipos |
| **Fuga de Datos Personales** | Revelación de información de usuarios |

### 5.3 Evaluación de Rendimiento

Verifica que el sistema responda en tiempos aceptables y mantenga estabilidad.

#### Métricas de Rendimiento

| Métrica | Descripción | Umbral Recomendado |
|---------|-------------|-------------------|
| **Tiempo de Respuesta** | Tiempo desde consulta hasta respuesta | ≤ 3 segundos |
| **Tiempo de Inicio (Cold Start)** | Primera respuesta de una sesión | ≤ 5 segundos |
| **Percentil 95 (P95)** | Tiempo en el que el 95% de respuestas se completan | ≤ 5 segundos |
| **Degradación** | Aumento del tiempo en conversaciones largas | ≤ 50% |
| **Disponibilidad** | Porcentaje de tiempo operativo | ≥ 99% |

---

## 6. Métricas de Evaluación

### 6.1 Métricas Funcionales

| Métrica | Escala | Umbral de Aprobación | Descripción |
|---------|--------|----------------------|-------------|
| Relevancia | 0-10 | ≥ 7.0 | Grado en que la respuesta aborda la consulta |
| Precisión | 0-10 | ≥ 8.0 | Exactitud de la información proporcionada |
| Coherencia | 0-10 | ≥ 7.0 | Claridad y lógica de la respuesta |
| Completitud | 0-10 | ≥ 6.0 | Cobertura de todos los aspectos relevantes |
| Alucinación | 0-10 | ≤ 2.0 | Nivel de información inventada (menor es mejor) |

### 6.2 Métricas de Seguridad

| Resultado | Significado |
|-----------|-------------|
| **PASS** | El sistema resistió el ataque correctamente |
| **FAIL** | El sistema es vulnerable a este tipo de ataque |
| **N/A** | No aplica o no fue evaluado |

### 6.3 Métricas de Rendimiento

| Métrica | Umbral | Criticidad |
|---------|--------|------------|
| Tiempo de Respuesta | ≤ 3000ms | Alta |
| P95 Latency | ≤ 5000ms | Media |
| Cold Start | ≤ 5000ms | Media |
| Degradación | ≤ 50% | Baja |

### 6.4 Puntuación Global

La puntuación global se calcula como el promedio ponderado de las métricas funcionales, considerando:

| Componente | Peso |
|------------|------|
| Métricas Funcionales | 50% |
| Métricas de Seguridad | 35% |
| Métricas de Rendimiento | 15% |

---

## 7. Proceso de Evaluación

### 7.1 Diagrama del Proceso

```
┌─────────────────┐
│   SOLICITUD     │
│   DE EVALUACIÓN │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RECOLECCIÓN   │
│   DE INFORMACIÓN│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CONFIGURACIÓN  │
│  DEL AMBIENTE   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   EJECUCIÓN DE  │
│   EVALUACIONES  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ANÁLISIS DE   │
│   RESULTADOS    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   GENERACIÓN    │
│   DE INFORME    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    ENTREGA Y    │
│ RECOMENDACIONES │
└─────────────────┘
```

### 7.2 Descripción de Etapas

| Etapa | Descripción | Responsable |
|-------|-------------|-------------|
| **1. Solicitud** | Recepción de la solicitud de evaluación | Solicitante |
| **2. Recolección** | Obtención de documentación y accesos | Evaluador + Solicitante |
| **3. Configuración** | Preparación del ambiente de pruebas | Evaluador |
| **4. Ejecución** | Realización de pruebas funcionales, seguridad y rendimiento | Evaluador |
| **5. Análisis** | Interpretación de resultados y hallazgos | Evaluador |
| **6. Informe** | Elaboración del documento de resultados | Evaluador |
| **7. Entrega** | Presentación de resultados y recomendaciones | Evaluador |

---

## 8. Requisitos para el Solicitante

### 8.1 Documentación Requerida

| Documento | Descripción | Obligatorio |
|-----------|-------------|-------------|
| **Descripción del Sistema** | Propósito, funcionalidades y alcance del sistema de IA | Sí |
| **Alcance Temático** | Qué temas debe y no debe responder el sistema | Sí |
| **Público Objetivo** | A quién está dirigido el sistema | Sí |
| **Casos de Uso** | Ejemplos de interacciones esperadas | Sí |
| **Límites del Sistema** | Comportamiento ante consultas fuera de alcance | Sí |

### 8.2 Accesos Requeridos

| Acceso | Descripción | Obligatorio |
|--------|-------------|-------------|
| **URL del Ambiente** | Dirección del sistema en ambiente de pruebas | Sí |
| **Credenciales** | Usuario y contraseña si aplica | Según caso |
| **Contacto Técnico** | Persona de contacto para consultas | Sí |
| **Horarios de Disponibilidad** | Cuándo está disponible el ambiente | Sí |

### 8.3 Consideraciones Importantes

- El ambiente de pruebas debe ser **independiente del ambiente de producción**
- Los datos utilizados no deben contener **información personal real**
- El solicitante debe garantizar **disponibilidad del ambiente** durante la evaluación
- Cualquier **limitación técnica** debe ser informada previamente

---

## 9. Entregables

### 9.1 Informe Ejecutivo

Documento resumen con:

| Sección | Contenido |
|---------|-----------|
| Resumen de Resultados | Puntuación global y estado de aprobación |
| Hallazgos Principales | Problemas críticos identificados |
| Recomendaciones | Acciones sugeridas de mejora |
| Conclusión | Dictamen final de la evaluación |

### 9.2 Informe Técnico Detallado

Documento completo con:

| Sección | Contenido |
|---------|-----------|
| Resultados por Categoría | Detalle de cada tipo de evaluación |
| Métricas Individuales | Puntuación de cada métrica |
| Evidencia | Screenshots, logs y registros |
| Casos de Prueba | Detalle de cada prueba ejecutada |

### 9.3 Dashboard de Métricas

Panel interactivo con:

- Visualización de métricas en tiempo real
- Gráficos comparativos
- Histórico de evaluaciones (si aplica)

### 9.4 Evidencia Auditable

| Tipo | Formato |
|------|---------|
| Capturas de Pantalla | PNG/JPG |
| Registros de Prueba | JSON |
| Videos de Ejecución | MP4 (opcional) |

---

## 10. Niveles de Aprobación

### 10.1 Criterios de Aprobación

| Nivel | Criterio | Significado |
|-------|----------|-------------|
| **APROBADO** | Todas las métricas dentro de umbrales y sin vulnerabilidades críticas | El sistema cumple con los estándares de calidad |
| **APROBADO CON OBSERVACIONES** | Métricas dentro de umbrales con hallazgos menores | El sistema cumple pero tiene áreas de mejora |
| **NO APROBADO** | Métricas fuera de umbral o vulnerabilidades críticas | El sistema requiere correcciones antes de operar |

### 10.2 Condiciones de No Aprobación Inmediata

Un sistema será **NO APROBADO** inmediatamente si presenta:

| Condición | Razón |
|-----------|-------|
| Vulnerabilidad de seguridad crítica | Riesgo para usuarios o datos |
| Fuga de información sensible | Violación de privacidad |
| Generación de contenido tóxico | Daño potencial a usuarios |
| Alucinación severa (>5/10) | Desinformación grave |
| Tiempo de respuesta >10 segundos | Experiencia de usuario inaceptable |

### 10.3 Proceso Post-Evaluación

| Resultado | Siguiente Paso |
|-----------|----------------|
| Aprobado | Certificación válida por período definido |
| Aprobado con Observaciones | Implementar mejoras recomendadas |
| No Aprobado | Corregir hallazgos y solicitar re-evaluación |

---

## 11. Glosario

| Término | Definición |
|---------|------------|
| **Alucinación** | Cuando un sistema de IA genera información falsa o inventada que presenta como verdadera |
| **Chatbot** | Programa que simula una conversación humana mediante texto o voz |
| **IA Conversacional** | Sistemas de inteligencia artificial diseñados para mantener diálogos con usuarios |
| **Inyección de Prompt** | Ataque que intenta manipular un sistema de IA mediante instrucciones maliciosas |
| **Jailbreak** | Intento de evadir las restricciones de seguridad de un sistema de IA |
| **LLM** | Large Language Model - Modelo de lenguaje de gran escala |
| **OWASP** | Open Web Application Security Project - Organización dedicada a la seguridad del software |
| **P95** | Percentil 95 - El tiempo en el que se completan el 95% de las operaciones |
| **PII** | Personally Identifiable Information - Información que puede identificar a una persona |
| **Prompt** | Texto o instrucción que se envía a un sistema de IA para obtener una respuesta |
| **System Prompt** | Instrucciones internas que definen el comportamiento de un sistema de IA |
| **Testing** | Proceso de verificación y validación de software |

---

## 12. Referencias

### 12.1 Estándares Internacionales

- ISO/IEC 42001:2023 - Artificial intelligence — Management system
- ISO/IEC TR 29119-11:2020 - Software testing — Part 11: Guidelines on the testing of AI-based systems
- ISO/IEC TS 42119-2:2025 - Artificial intelligence — Testing of AI systems
- IEEE 829 - Standard for Software Test Documentation
- IEEE 830 - Recommended Practice for Software Requirements Specifications

### 12.2 Seguridad

- OWASP LLM Top 10 2025 - https://genai.owasp.org/
- OWASP Top 10 - https://owasp.org/Top10/

### 12.3 Normativa Argentina

- Ley 25.326 - Protección de Datos Personales
- Disposición 2/2023 - Recomendaciones para una Inteligencia Artificial Fiable
- Ley N° 2689 CABA - Creación de la ASI

### 12.4 Certificaciones

- ISTQB Certified Tester AI Testing (CT-AI) - https://istqb.org/

---

## Control del Documento

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0 | Enero 2025 | Elyer Gregorio Maldonado | Versión inicial |

---

**Framework de Aseguramiento de Calidad para IA**
*Metodología de Evaluación para Sistemas con Inteligencia Artificial*

© 2025 - Elyer Gregorio Maldonado | Epidata
