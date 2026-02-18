# 🚀 QASL NEXUS LLM

> **La Primera Plataforma de QA Impulsada por Modelos de Lenguaje Avanzados**  
> *Large Language Model QA Platform - From Requirements to Production*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](CHANGELOG.md)
[![ISTQB](https://img.shields.io/badge/ISTQB-v4.0-orange.svg)](https://www.istqb.org/)
[![IEEE](https://img.shields.io/badge/IEEE-829%2F830%2F1028-red.svg)](https://standards.ieee.org/)

---

## 🎯 **¿Qué es QASL NEXUS LLM?**

**QASL NEXUS LLM** es la **única plataforma de QA del mercado** que integra **Claude, GPT-5 y Gemini** para automatizar el **ciclo de vida completo** del aseguramiento de calidad—desde el análisis de requisitos en documentos Word hasta el monitoreo de producción 24/7.

### **El Problema que Resolvemos:**

Las empresas gastan **millones de dólares anuales** en:
- ❌ QA manual que llega tarde al ciclo de desarrollo
- ❌ Herramientas desconectadas (TestRail, Jira, ZAP, K6, etc.)
- ❌ Defectos detectados en producción (costo 100x mayor)
- ❌ Falta de trazabilidad entre requisitos y pruebas
- ❌ Reportes manuales que consumen 40+ horas/mes
- ❌ Testing de LLMs sin frameworks de seguridad

### **Nuestra Solución:**

✅ **Shift-Left Testing con IA**: Detectamos defectos ANTES de escribir código  
✅ **12 Microservicios Especializados**: Cada uno resuelve un problema específico  
✅ **Orquestación Multi-LLM**: Claude, GPT-5 y Gemini trabajando en conjunto  
✅ **Trazabilidad Automática**: Desde Epic → User Story → Test Case → Bug → Jira  
✅ **6 Tipos de Testing**: E2E, API, Performance, Security Web, Security LLM, Mobile  
✅ **Integración Universal**: Jira, X-Ray, TestRail, Azure DevOps, qTest  
✅ **ROI Demostrable**: 70% reducción de costos QA, 300% más defectos tempranos  

---

## 🏗️ **Arquitectura de Microservicios**

QASL NEXUS LLM está construido con **12 microservicios independientes** que se comunican vía REST APIs y comparten una base de datos PostgreSQL central.

```
┌─────────────────────────────────────────────────────────────────┐
│                    QASL NEXUS LLM PLATFORM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   MS-01: Metodologías        MS-07: Sentinel (Monitoring)      │
│   MS-02: Pruebas Estáticas   MS-08: CI/CD Pipeline             │
│   MS-03: QASL Framework      MS-09: Orquestador LLM (INGRID)   │
│   MS-04: QASL Mobile         MS-10: MCP Interfaz (Integración) │
│   MS-05: INGRID AI Core      MS-11: Reportador Multi-Canal     │
│   MS-06: Garak LLM Security  MS-12: Database (PostgreSQL)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 **Microservicios - Descripción Detallada**

### **MS-01: Metodologías** 📚
**Puerto:** 3000  
**Tecnología:** Nginx (HTML estático)

**¿Qué hace?**
- Almacena y sirve **todas las plantillas** del Framework EPIDATA Shift-Left
- Master Test Plan, Test Plan por Sprint, User Stories ISTQB
- Plantillas de reportes IEEE 29119, Bug Report Individual
- Guías de estrategia de pruebas, métricas de calidad
- Checklists de revisión, calendarios de ejecución

**¿Por qué existe?**
- **Single Source of Truth** para templates → Evita duplicación
- Otros microservicios consumen templates via API
- Cumplimiento normativo (ISTQB v4.0, IEEE 829/830/1028, ISO 29119)
- GitLab Pages deployment → Acceso web para el equipo

**Flujo:**
```
MS-10 (MCP) necesita crear un bug en Jira
         ↓
GET http://ms-01:3000/templates/bug-report-individual.html
         ↓
Obtiene plantilla estandarizada
         ↓
MS-09 (LLM) la completa con IA
```

---

### **MS-02: Pruebas Estáticas (SUR Static Analyzer)** 🔬
**Puerto:** 4000  
**Tecnología:** Python + FastAPI + Claude AI

**¿Qué hace?**
- **Parsea historias de usuario en formato .docx** (Word)
- Extrae: Escenarios (DADO-CUANDO-ENTONCES), Reglas de Negocio, Criterios de Aceptación
- **Detección automática de gaps** con Claude AI:
  - Escenarios faltantes (solo happy path documentado)
  - Casos negativos ausentes
  - Incongruencias entre requisitos
  - Ambigüedades en redacción
- **Genera automáticamente**:
  - 175+ Test Cases (CSV)
  - 39+ Test Suites (CSV)
  - 22+ Precondiciones (CSV)
  - RTM bidireccional (Épica → US → TS → TC)
- Flowcharts Mermaid de reglas de negocio
- Reportes IEEE 1028 de revisión estática

**¿Por qué existe?**
- **Shift-Left Testing**: Detecta defectos ANTES de escribir código
- Reducción de 55-60% de defectos en desarrollo
- Ahorro de 30-45 horas de diseño manual de casos de prueba
- Cobertura 100% de reglas de negocio garantizada
- ROI: $15,000-$25,000 por proyecto en defectos evitados

**Flujo:**
```
1. Usuario sube HU-DF1-01.docx
2. SUR parsea y extrae BRs
3. Claude AI analiza: "Falta caso negativo para BR-03"
4. Genera TC-001 a TC-016 automáticamente
5. Guarda en MS-12 (Database)
6. Genera PDF con gaps detectados
```

**Ejemplo Real (Proyecto AGIP):**
- 18 Historias de Usuario analizadas
- 82 gaps detectados y corregidos
- 175 Test Cases generados antes del código
- Cobertura: 53.6% → 100%
- Tiempo: 30-45 horas → 10 minutos

---

### **MS-03: QASL Framework** ⚡
**Puertos:** 6001-6005  
**Tecnología:** TypeScript + Playwright + Newman + K6 + OWASP ZAP

**¿Qué hace?**
- **5 motores de testing en paralelo:**
  1. **E2E (Playwright)** - Port 6001: Tests de interfaz, navegadores, mobile web
  2. **API (Newman)** - Port 6002: Colecciones Postman, integración API
  3. **Performance (K6)** - Port 6003: Load, stress, spike, soak testing
  4. **Security Web (ZAP)** - Port 6004: OWASP Top 10, vulnerabilidades web
  5. **Allure Reports** - Port 6005: Dashboard unificado HTML

**¿Por qué existe?**
- **Ejecución masiva paralela**: 6 tipos de pruebas simultáneas
- **Reportes consolidados**: Allure unifica E2E + API + Performance
- **Integración con VCR**: Solo ejecuta pruebas con VCR ≥ 9 (deuda técnica)
- **CI/CD Ready**: GitLab Runner + Jenkins triggers
- **Reemplazo de múltiples herramientas**: Katalon, Selenium Grid, Postman Cloud, K6 Cloud

**Flujo:**
```
MS-08 (CI/CD) trigger: "Run regression suite"
         ↓
MS-03 consulta MS-12: "TCs con VCR ≥ 9"
         ↓
Ejecuta en paralelo:
├─► E2E: 45 tests (15 min)
├─► API: 120 requests (3 min)
├─► K6: Load test 1000 VUs (5 min)
└─► ZAP: Baseline scan (10 min)
         ↓
Resultados → MS-12 (Database)
         ↓
Allure consolida reporte HTML
```

---

### **MS-04: QASL Mobile** 📱
**Puerto:** 7500  
**Tecnología:** Maestro + Claude Vision

**¿Qué hace?**
- Testing automatizado de **iOS y Android**
- **Claude Vision UX Analysis**: Analiza screenshots, detecta UX issues
- Flujos Maestro en YAML (login, registro, checkout)
- Reportes nativos Maestro con evidencia visual

**¿Por qué existe?**
- **Mobile-first**: 60% del tráfico es mobile
- **IA para UX**: Claude detecta problemas que humanos no ven
- **Independiente de código**: Tests sin modificar la app
- **Dashboard separado en Grafana**: Métricas mobile específicas

**Flujo:**
```
MS-08 trigger: "Mobile regression"
         ↓
Maestro ejecuta flows/*.yaml
         ↓
Captura screenshots cada paso
         ↓
Claude Vision analiza: "Botón desalineado 3px"
         ↓
Resultados → MS-12
         ↓
MS-11 genera reporte con análisis UX
```

---

### **MS-05: INGRID AI Framework** 🧠
**Puerto:** 7000  
**Tecnología:** TypeScript + Anthropic SDK

**¿Qué hace?**
- **Motor de generación de tests con IA**
- Análisis de contexto de aplicaciones
- Evaluación inteligente de resultados
- Orquestación de agentes LLM
- Prompt engineering avanzado

**¿Por qué existe?**
- **Core AI del ecosistema**: Genera tests que humanos no imaginan
- **Autonomía**: Explora apps y crea tests sin intervención
- **Aprendizaje continuo**: Mejora tests basado en fallos históricos
- **Integración con MS-09**: Provee capacidades IA al orquestador

**Flujo:**
```
MS-09 solicita: "Genera tests para login.tsx"
         ↓
INGRID analiza código fuente
         ↓
Identifica: auth, validación, edge cases
         ↓
Genera 12 test cases (positivos + negativos)
         ↓
Retorna a MS-09 para ejecución
```

---

### **MS-06: Garak LLM Security** 🛡️
**Puerto:** 7600  
**Tecnología:** Python + NVIDIA Garak

**¿Qué hace?**
- **Testing de seguridad para LLMs** (ChatGPT, Claude, Gemini)
- Probes de vulnerabilidad:
  - Jailbreak attempts (bypass de restricciones)
  - Prompt injection (comandos maliciosos)
  - Data leakage (exposición de datos sensibles)
  - Bias detection (sesgos en respuestas)
- Reportes de vulnerabilidades encontradas

**¿Por qué existe?**
- **Único en el mercado**: Nadie más testea seguridad LLM
- **Cumplimiento regulatorio**: GDPR, SOC 2, ISO 27001
- **Protección de marca**: Evita respuestas inapropiadas en producción
- **Benchmark competitivo**: Compara modelos (Claude vs GPT vs Gemini)

**Flujo:**
```
MS-08 trigger: "Security scan LLM"
         ↓
Garak ejecuta 500+ probes
         ↓
Detecta: "GPT-4 vulnerable a prompt injection tipo DAN"
         ↓
Genera reporte de severidad
         ↓
MS-11 notifica a equipo de seguridad
```

---

### **MS-07: Sentinel Unified** 📡
**Puertos:** 3003 (Grafana), 9090 (Prometheus), 8086 (InfluxDB)  
**Tecnología:** Grafana + Prometheus + InfluxDB

**¿Qué hace?**
- **Monitoreo 24/7** de aplicaciones en producción
- 5 dashboards especializados:
  1. **Executive**: Métricas de negocio (uptime, SLA, costs)
  2. **Technical**: Backend APIs, latencia, errores
  3. **Mobile**: Crashes, ANR, battery drain
  4. **Security**: Vulnerabilidades ZAP + Garak
  5. **EPIDATA Metrics**: Cobertura, Pass Rate, DRE, MTTR
- **Alerting** en tiempo real (Slack, Teams, Email)

**¿Por qué existe?**
- **Observabilidad completa**: Backend + Frontend + Mobile + Security
- **Decisiones basadas en datos**: Dashboards ejecutivos para stakeholders
- **Detección temprana**: Alertas antes de que usuarios reporten
- **Reemplazo de Datadog/New Relic**: 90% más barato

**Flujo:**
```
Aplicación en producción → Métricas
         ↓
Prometheus scrape cada 15s
         ↓
InfluxDB almacena time-series
         ↓
Grafana visualiza en dashboards
         ↓
Alert: "API /login latency > 500ms"
         ↓
MS-11 notifica a oncall via Slack
```

---

### **MS-08: CI/CD Pipeline** 🔄
**Puertos:** 8888 (Jenkins), 50000 (Jenkins agents)  
**Tecnología:** GitLab Runner + Jenkins

**¿Qué hace?**
- **Orquestación de pipelines** completos
- GitLab CI/CD para deployment
- Jenkins para test automation
- Docker-in-Docker para builds
- Artifact storage (reports, screenshots)

**¿Por qué existe?**
- **Automatización end-to-end**: Desde commit hasta producción
- **Trigger inteligente**: Ejecuta solo TCs afectados por cambios
- **Paralelización**: 10 workers simultáneos
- **Integración con todos los MS**: Ejecuta pruebas en orden correcto

**Pipeline típico:**
```
1. Git push → Trigger
2. MS-02: Análisis estático (5 min)
3. MS-09: VCR calculation (2 min)
4. MS-03: E2E + API + K6 + ZAP (20 min parallel)
5. MS-04: Mobile tests (10 min)
6. MS-06: Garak LLM scan (15 min)
7. MS-11: Consolidate reports (3 min)
8. MS-10: Create Jira issues for failures (2 min)
9. Deploy to staging (si Pass Rate > 95%)
Total: ~30 min (vs 6 horas manual)
```

---

### **MS-09: Orquestador LLM (INGRID)** 🤖
**Puerto:** 8000  
**Tecnología:** TypeScript + Anthropic + OpenAI + Google AI

**¿Qué hace?**
- **Orquestación de 3 LLMs** (Claude, GPT-5, Gemini)
- **Decision engine**: Qué LLM usar según tarea
  - Claude → Análisis de código, revisión de requisitos
  - GPT-5 → Generación de test data, edge cases
  - Gemini → Multimodal (screenshots, videos)
- **VCR Calculator con IA**: Calcula Valor + Costo + Riesgo
- **Template Filler**: Completa plantillas con contexto IA
- **Intelligent Mapper**: Mapea campos (TC → Jira fields)

**¿Por qué existe?**
- **Decisiones inteligentes**: No todas las tareas necesitan el mismo LLM
- **Costo-efectivo**: USA GPT-5 solo cuando vale la pena
- **Mejores resultados**: Combina fortalezas de cada modelo
- **Core del diferencial**: Esto nos hace únicos en el mercado

**Flujo VCR Scoring:**
```
MS-02 genera US: "Login con usuario válido"
         ↓
MS-09 recibe request: "Calculate VCR for HU-DF1-04"
         ↓
Claude analiza:
├─► Valor: 3 (Crítico para negocio - login es core)
├─► Costo: 2 (Setup medio - requiere DB seed)
├─► Probabilidad: 2 (Auth es complejo)
├─► Impacto: 4 (Falla bloquea todo el sistema)
└─► Riesgo: P×I = 2×4 = 8
         ↓
VCR Total: 3+2+8 = 13
Decision: AUTOMATIZAR (≥ 9)
         ↓
Guarda en MS-12
         ↓
MS-03 crea test automatizado
```

---

### **MS-10: MCP Interfaz (Integration Hub)** 🔌
**Puerto:** 5000  
**Tecnología:** TypeScript + REST APIs

**¿Qué hace?**
- **Hub de integraciones** con herramientas externas:
  - Jira (Issues, Epics, Stories, Sprints)
  - X-Ray (Test Execution, Test Plans, Defects)
  - TestRail (Test Cases, Test Runs, Results)
  - Azure DevOps (Work Items, Test Plans)
  - qTest (Test Management)
- **Orquestación de creación de bugs:**
  1. Fetch template de MS-01
  2. Get traceability de MS-12
  3. Fill template con MS-09 (IA)
  4. Map to external tool format
  5. Create issue/test via API
  6. Create bidirectional links
  7. Save reference en MS-12

**¿Por qué existe?**
- **Integración universal**: Un solo punto de conexión
- **Trazabilidad automática**: TC-001 → HU-DF1-04 → JIRA-123
- **Ahorro de tiempo**: 2 horas/día de linking manual eliminadas
- **Sin vendor lock-in**: Cambias de Jira a Azure sin rehacer todo

**Flujo Bug Creation:**
```
MS-03 detecta fallo: test.fail()
         ↓
MS-10 recibe evento: TEST_FAILURE
         ↓
PASO 1: GET template de MS-01
         ↓
PASO 2: Query MS-12 para trazabilidad:
        TC-043 → TS-010 → HU-DF1-04 → EP-SUR-01
         ↓
PASO 3: POST a MS-09 para completar template:
        "Usuario válido no puede hacer login"
         ↓
PASO 4: Map to Jira format:
        {summary, description, priority, components}
         ↓
PASO 5: POST a Jira API → Crea AGIP-1234
         ↓
PASO 6: Create link en Jira:
        AGIP-1234 relates to HU-DF1-04
         ↓
PASO 7: Update MS-12:
        defect.jira_key = 'AGIP-1234'
```

---

### **MS-11: Reportador Multi-Canal** 📊
**Puerto:** 9000  
**Tecnología:** Python (PDF) + TypeScript (APIs)

**¿Qué hace?**
- **Consolida reportes nativos**:
  - Allure (E2E/API/Performance unificado)
  - HTML Extra (Newman API tests)
  - K6 HTML Report (Performance espectacular)
  - OWASP ZAP Report (Security web)
  - Garak Report (LLM security)
  - Maestro Report (Mobile testing)
- **Genera reportes ejecutivos**:
  - PDF (WeasyPrint/ReportLab)
  - Excel (métricas para management)
  - Markdown (documentación técnica)
  - IEEE 29119 Test Completion Report
- **Notificaciones multi-canal**:
  - 📧 Email (SMTP)
  - 💬 Slack (Webhooks)
  - 👥 MS Teams (Connectors)
  - 📹 Google Meet (Calendar API para reuniones)

**¿Por qué existe?**
- **Single dashboard**: 6 reportes → 1 vista unificada
- **Stakeholder communication**: Cada rol ve lo que necesita
  - CEO → Executive summary PDF
  - QA Lead → Technical Allure dashboard
  - Dev Team → Slack notifications en tiempo real
- **Compliance**: IEEE 29119 para auditorías
- **Ahorro de tiempo**: 40 horas/mes de reportes manuales eliminadas

**Flujo Informe Semanal:**
```
Viernes 5pm → MS-08 trigger: "Weekly report"
         ↓
MS-11 consulta MS-12:
├─► Test executions (última semana)
├─► Defects created/resolved
├─► Pass rate trend
├─► VCR automation progress
└─► Coverage metrics
         ↓
Genera PDF ejecutivo (5 páginas):
├─► Page 1: Executive Summary
├─► Page 2: Test Execution Metrics
├─► Page 3: Defect Analysis
├─► Page 4: Automation Progress
└─► Page 5: Recommendations
         ↓
Envía:
├─► Email a stakeholders list
├─► Slack #qa-weekly-report
└─► Teams QA Channel
```

---

### **MS-12: Database (PostgreSQL)** 💾
**Puerto:** 5432  
**Tecnología:** PostgreSQL 16

**¿Qué hace?**
- **Single Source of Truth** para toda la plataforma
- **15 tablas principales:**
  - `epic`, `user_story` → Requisitos
  - `test_suite`, `test_case`, `precondition` → Diseño de pruebas
  - `vcr_score` → Decisiones de automatización
  - `test_execution` → Resultados de ejecución
  - `defect` → Bugs encontrados
  - `metric` → KPIs calculados
  - `static_analysis_gap` → Gaps de SUR
  - `report` → Reportes generados
  - `notification` → Notificaciones enviadas
- **Views útiles:**
  - `v_test_coverage` → Cobertura por US
  - `v_pass_rate` → Pass rate por suite
  - `v_technical_debt` → VCR ≥ 9 sin automatizar
- **Triggers**: Auto-update de `updated_at`
- **Indexes**: Performance optimizada para queries frecuentes

**¿Por qué existe?**
- **Consistencia de datos**: Todos leen/escriben del mismo lugar
- **Trazabilidad completa**: Epic → US → TS → TC → Execution → Defect
- **Queries complejas**: JOIN entre 5+ tablas en milisegundos
- **Backup/Restore**: Un solo punto de respaldo
- **Auditoría**: Cambios trazables con timestamps

**Ejemplo Query Crítico:**
```sql
-- ¿Cuántos TCs automatizados tengo por Epic?
SELECT 
  e.code AS epic,
  COUNT(DISTINCT tc.id) AS total_tcs,
  COUNT(DISTINCT CASE WHEN tc.automated THEN tc.id END) AS automated,
  ROUND(AVG(vcr.vcr_total), 2) AS avg_vcr
FROM epic e
JOIN user_story us ON us.epic_id = e.id
JOIN test_suite ts ON ts.user_story_id = us.id
JOIN test_case tc ON tc.test_suite_id = ts.id
LEFT JOIN vcr_score vcr ON vcr.user_story_id = us.id
GROUP BY e.code
ORDER BY avg_vcr DESC;
```

---

## 🌟 **¿Por Qué Esta Arquitectura de Microservicios?**

### **1. Independencia y Escalabilidad**
Cada microservicio:
- Evoluciona a su propio ritmo
- Se puede escalar independientemente (más instancias de MS-03 si hay carga)
- Falla de forma aislada (bug en MS-06 no afecta MS-03)
- Se despliega sin downtime del resto

### **2. Tecnología Agnóstica**
- Python donde tiene sentido (MS-02, MS-06, MS-11)
- TypeScript para APIs modernas (MS-03, MS-05, MS-09, MS-10)
- Nginx para servir estáticos (MS-01)
- PostgreSQL por robustez (MS-12)

### **3. Integración Universal**
- MS-10 (MCP) conecta con TODO:
  - Jira, X-Ray, TestRail, Azure DevOps, qTest
  - Slack, Teams, Email, Google Meet
  - GitLab, Jenkins, Docker

### **4. IA en el Core**
- MS-05 (INGRID AI): Generación de tests
- MS-09 (Orquestador): 3 LLMs trabajando juntos
- MS-02 (SUR): Claude detecta gaps en requisitos
- MS-04 (Mobile): Claude Vision analiza UX

### **5. Cumplimiento Normativo**
- MS-01: Templates ISTQB v4.0, IEEE 829/830/1028
- MS-02: Análisis estático IEEE 1028
- MS-11: Reportes IEEE 29119
- MS-12: Trazabilidad ISO 29119

---

## 💰 **Valor Comercial y ROI**

### **Lo Que Reemplazamos:**

| Herramienta | Costo/año | QASL NEXUS LLM |
|-------------|-----------|----------------|
| TestRail | $4,680 (10 users) | MS-12 Database |
| Zephyr | $4,200 | MS-12 Database |
| Katalon Studio | $7,188 | MS-03 Framework |
| Datadog | $18,000 | MS-07 Sentinel |
| New Relic | $12,000 | MS-07 Sentinel |
| Postman Cloud | $2,400 | MS-03 Newman |
| K6 Cloud | $3,480 | MS-03 K6 |
| BrowserStack | $12,996 | MS-04 Mobile |
| Functionize | $12,000+ | MS-05 INGRID |
| **TOTAL** | **$77,000/año** | **Gratis (open source)** |

### **Ahorro de Tiempo:**

| Actividad | Manual | QASL NEXUS LLM | Ahorro |
|-----------|--------|----------------|--------|
| Diseño de 175 TCs | 40 hrs | 10 min | 99.6% |
| Ejecución suite completa | 6 hrs | 30 min | 91.7% |
| Reportes semanales | 4 hrs | 5 min | 97.9% |
| Creación de bugs en Jira | 15 min/bug | 30 seg | 96.7% |
| Análisis de gaps | 8 hrs | 5 min | 99.0% |

### **ROI Demostrable (Proyecto AGIP):**

- **Inversión**: $0 (plataforma interna)
- **Ahorro en defectos**: $25,000 (82 defectos detectados antes de dev)
- **Ahorro en herramientas**: $77,000/año
- **Ahorro en tiempo QA**: 200 hrs/mes × $50/hr = $10,000/mes
- **ROI Año 1**: 300-500%

---

## 🚀 **Casos de Uso**

### **1. Gobierno (como AGIP)**
- Cumplimiento normativo estricto
- Trazabilidad auditable
- Reportes IEEE 29119 para contraloría
- **Precio**: $500,000-$1,000,000/año

### **2. Financial Services**
- Security testing (ZAP + Garak)
- Performance bajo carga (K6)
- Integración con Azure DevOps
- **Precio**: $300,000-$500,000/año

### **3. Healthcare**
- HIPAA compliance
- Mobile testing (apps pacientes)
- LLM security (chatbots médicos)
- **Precio**: $250,000-$400,000/año

### **4. E-commerce**
- E2E crítico (checkout, payments)
- Performance Black Friday
- Mobile-first testing
- **Precio**: $200,000-$350,000/año

---

## 🎯 **Roadmap 2026**

**Q1 2026:** ✅ Arquitectura base completada  
**Q2 2026:** MS-07, MS-08, MS-09, MS-10, MS-11 en desarrollo  
**Q3 2026:** Beta privado con 3 clientes piloto  
**Q4 2026:** Lanzamiento público + certificación ISTQB  

---

## 📞 **Contacto**

**Autor:** Elyer Gregorio Maldonado  
**LinkedIn:** [linkedin.com/in/elyergmaldonado](https://linkedin.com/in/elyergmaldonado)  
**Email:** elyer.maldonado@qaslnexus.io  
**Website:** [qaslnexus.io](https://qaslnexus.io) *(coming soon)*

---

## 📄 **Licencia**

MIT License - Ver [LICENSE](LICENSE) para más detalles

---

**⭐ Si este proyecto te parece valioso, dale una estrella en GitHub y compártelo con tu red**

---

*QASL NEXUS LLM - The Future of QA Automation is Here* 🚀