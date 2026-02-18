# QASL-SENTINEL-UNIFIED v3.0.0 - Arquitectura del Sistema

**Proyecto SIGMA** | AGIP (Administracion Gubernamental de Ingresos Publicos) | Buenos Aires Ciudad
**Empresa:** Epidata Consulting | **Lider Tecnico QA:** Elyer Gregorio Maldonado

---

## Diagrama de Arquitectura por Capas

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        QASL-SENTINEL-UNIFIED v3.0.0                             │
│     Backend APIs + Frontend DOM + Seguridad IA/LLM + Testing Mobile con IA     │
│                                                                                 │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│  CAPA 1 - TARGETS (Lo que monitoreamos)                                         │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌───────────────────────────────────────────┐  ┌────────────────────────────┐  │
│  │         SISTEMA SIGMA (AGIP)              │  │       OPENAI               │  │
│  │                                           │  │                            │  │
│  │  ┌─────────┐ ┌───────────┐ ┌───────────┐ │  │  ┌──────────────────────┐  │  │
│  │  │  APIs   │ │ Frontend  │ │ Seguridad │ │  │  │  Modelos IA/LLM      │  │  │
│  │  │ Backend │ │    DOM    │ │    Web    │ │  │  │  (GPT-4, GPT-3.5)    │  │  │
│  │  │7 endpts │ │ 4 paginas │ │ OWASP ZAP│ │  │  │                      │  │  │
│  │  └────┬────┘ └─────┬─────┘ └─────┬─────┘ │  │  └──────────┬───────────┘  │  │
│  │       │            │             │        │  │             │              │  │
│  │  ┌────┴────────────┴─────────────┴─────┐  │  │  ┌──────────┴───────────┐  │  │
│  │  │        Machine Learning             │  │  │  │    NVIDIA Garak      │  │  │
│  │  │   (Analisis predictivo SIGMA)       │  │  │  │  34 detectores       │  │  │
│  │  └─────────────────────────────────────┘  │  │  │  Seguridad IA/LLM    │  │  │
│  └───────────────────────────────────────────┘  │  └──────────────────────┘  │  │
│                                                  └────────────────────────────┘  │
│                                                                                 │
│  ┌────────────────────────────────┐                                             │
│  │  QASL-MOBILE (Canal Satelite)  │                                             │
│  │                                │                                             │
│  │  ┌──────────────────────────┐  │                                             │
│  │  │  Testing Mobile con IA   │  │                                             │
│  │  │  Maestro + Android       │  │                                             │
│  │  │  27 tests, video MP4     │  │                                             │
│  │  │  Streaming :8765         │  │                                             │
│  │  └────────────┬─────────────┘  │                                             │
│  │               │                │                                             │
│  │  ┌────────────┴─────────────┐  │                                             │
│  │  │  InfluxDB :8089          │  │                                             │
│  │  │  DB: qasl_mobile         │  │                                             │
│  │  └─────────────────────────┘  │                                             │
│  └────────────────────────────────┘                                             │
│                          │                                │                     │
│                          ▼                                ▼                     │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│  CAPA 2 - PLATAFORMA DE MONITOREO                                               │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  sentinel-   │ │  sentinel-   │ │  OWASP ZAP   │ │  Machine     │           │
│  │  backend     │ │  frontend    │ │  Scanner     │ │  Learning    │           │
│  │  (Node.js)   │ │ (Playwright) │ │  (Docker)    │ │  Engine      │           │
│  │  :9097       │ │              │ │              │ │              │           │
│  │  [SIGMA]     │ │  [SIGMA]     │ │  [SIGMA]     │ │  [SIGMA]     │           │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘           │
│         │                │               │                │                    │
│  ┌──────┴────────────────┴───────────────┴────────────────┘                    │
│  │                                                                              │
│  │  ┌───────────────────────────────────────────────────────┐                  │
│  │  │  garak-importer.mjs                                   │                  │
│  │  │  JSONL → Pushgateway → 12 metricas Prometheus  :9096  │                  │
│  │  │  [OPENAI]                                              │                  │
│  │  └───────────────────────────┬───────────────────────────┘                  │
│  │                              │                                               │
│  └──────────────────────────────┘                                               │
│                          │                                                      │
│                          ▼                                                      │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│  CAPA 3 - ALMACENAMIENTO DE DATOS                                               │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌─────────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │          Prometheus  :9095              │  │       InfluxDB  :8088        │  │
│  │                                         │  │                              │  │
│  │  ← API metrics         [SIGMA]          │  │  ← DOM metrics    [SIGMA]    │  │
│  │  ← ZAP metrics         [SIGMA]          │  │    load time, errores,       │  │
│  │  ← ML metrics           [SIGMA]          │  │    screenshots, a11y         │  │
│  │  ← Garak metrics x12   [OPENAI]         │  │                              │  │
│  │    (via Pushgateway :9096)               │  │                              │  │
│  └─────────────────┬───────────────────────┘  └──────────────┬───────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────┐                                               │
│  │   InfluxDB-Mobile  :8089     │                                               │
│  │                              │                                               │
│  │  ← test_execution  [MOBILE]  │                                               │
│  │    passed, failed, duration   │                                               │
│  │    screenshots, device        │                                               │
│  │  (Canal Satelite - solo lee)  │                                               │
│  └──────────────────────────────┘                                               │
│                    │                                         │                  │
│                    ▼                                         ▼                  │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│  CAPA 4 - VISUALIZACION E INTELIGENCIA                                          │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │              GRAFANA COMMAND CENTER  :3003  (admin / sentinel2024)       │   │
│  │                                                                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │1.Overview│ │ 2. APIs  │ │3.Frontend│ │ 4. ZAP   │ │  5. Garak    │  │   │
│  │  │SIGMA+OAI │ │  SIGMA   │ │  SIGMA   │ │  SIGMA   │ │   OPENAI     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────────────────────────┐  │   │
│  │  │6.Compli- │ │7. Trends │ │         8. INGRID Chat Widget          │  │   │
│  │  │  ance    │ │          │ │                                        │  │   │
│  │  └──────────┘ └──────────┘ └────────────────────────────────────────┘  │   │
│  │  ┌──────────┐                                                          │   │
│  │  │9. Mobile │                                                          │   │
│  │  │  MOBILE  │                                                          │   │
│  │  └──────────┘                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │         INGRID CHATBOT (Claude Sonnet 4.5)  :3100                        │   │
│  │                                                                          │   │
│  │  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │   │
│  │  │ RAG Prometheus   │  │ RAG InfluxDB      │  │ Generador PDF        │  │   │
│  │  │ (APIs+ZAP+Garak) │  │ (Frontend DOM)    │  │ 5 tipos de reporte   │  │   │
│  │  └──────────────────┘  └───────────────────┘  └──────────────────────┘  │   │
│  │                                                                          │   │
│  │  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │   │
│  │  │ Lenguaje Natural │  │ Email Automatico  │  │ 5 Reportes PDF       │  │   │
│  │  │ Consultas en     │  │ Envio context-    │  │ full | garak | apis  │  │   │
│  │  │ espanol          │  │ aware             │  │ zap | compliance     │  │   │
│  │  └──────────────────┘  └───────────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│                          │                                                      │
│                          ▼                                                      │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│  CAPA 5 - INFRAESTRUCTURA                                                       │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌───────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  Docker Compose                   │  │  Node.js Services                  │  │
│  │  ├─ Prometheus      :9095         │  │  ├─ sentinel-backend (API Monitor) │  │
│  │  ├─ Pushgateway     :9096         │  │  ├─ sentinel-frontend (DOM Monitor)│  │
│  │  ├─ InfluxDB        :8088         │  │  ├─ qasl-ingrid (Chatbot INGRID)   │  │
│  │  ├─ Grafana         :3003         │  │  ├─ garak-importer (Importador)    │  │
│  │  └─ Video Server    :8766         │  │  └─                                │  │
│  └───────────────────────────────────┘  └────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  run-unified.ps1 → Arranque completo en 1 comando (9 pasos)             │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│                          │                                                      │
│                          ▼                                                      │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│  CAPA 6 - OUTPUTS (Entregables)                                                 │
│ ═══════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  Dashboards      │  │  PDF Reports     │  │  Email Automatico            │  │
│  │  Real-time       │  │  5 tipos         │  │  Context-aware               │  │
│  │  8 paneles       │  │  Ejecutivos      │  │  INGRID → Destinatario       │  │
│  │  Grafana         │  │  PDFKit          │  │  Gmail SMTP                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

### Flujos SIGMA (AGIP)
```
SIGMA APIs (7 endpoints)  →  sentinel-backend   →  Prometheus :9095  →  Grafana :3003
SIGMA Frontend (4 paginas) →  sentinel-frontend  →  InfluxDB :8088   →  Grafana :3003
SIGMA Web Security         →  OWASP ZAP          →  Prometheus :9095  →  Grafana :3003
SIGMA Machine Learning     →  ML Engine           →  Prometheus :9095  →  Grafana :3003
```

### Flujo OpenAI (Garak)
```
OpenAI LLMs  →  NVIDIA Garak  →  JSONL  →  garak-importer  →  Pushgateway :9096  →  Prometheus :9095  →  Grafana :3003
```

### Flujo QASL-MOBILE (Canal Satelite)
```
QASL-MOBILE (Maestro)  →  InfluxDB :8089  ←(solo lectura)←  Grafana :3003
QASL-MOBILE (Video)    →  MP4 file        ←(nginx :8766)←   Grafana :3003
```

### Flujo INGRID (Inteligencia)
```
INGRID :3100  ← RAG →  Prometheus + InfluxDB  →  PDF Report  →  Email automatico
```

---

## Mapa de Puertos

| Puerto | Servicio          | Tipo            |
|--------|-------------------|-----------------|
| :9095  | Prometheus        | Docker          |
| :9096  | Pushgateway       | Docker          |
| :9097  | Backend Exporter  | Node.js         |
| :8088  | InfluxDB          | Docker          |
| :3003  | Grafana           | Docker          |
| :3100  | INGRID Chatbot    | Node.js         |
| :8766  | Video Server (nginx) | Docker |
| :8089  | InfluxDB-Mobile      | Satelite (QASL-MOBILE) |
| :8765  | Streaming Mobile     | Satelite (QASL-MOBILE) |
| :3004  | Grafana Mobile       | Satelite (QASL-MOBILE) |

---

## Stack Tecnologico

| Categoria       | Tecnologias                                    |
|-----------------|------------------------------------------------|
| Runtime         | Node.js, TypeScript                            |
| Contenedores    | Docker, Docker Compose                         |
| Metricas        | Prometheus, Pushgateway, InfluxDB              |
| Visualizacion   | Grafana (8 dashboards)                         |
| IA/Chatbot      | Claude Sonnet 4.5 (Anthropic)                  |
| Testing Browser | Playwright                                     |
| Seguridad Web   | OWASP ZAP                                      |
| Seguridad IA    | NVIDIA Garak (34 detectores)                   |
| Reportes        | PDFKit (5 tipos context-aware)                 |
| Testing Mobile  | Maestro, Android SDK, InfluxDB v1              |
| Email           | Nodemailer + Gmail SMTP                        |

---

## Targets por Ecosistema

### SIGMA (AGIP)
- **APIs Backend**: Token, selections, expedient, inconsistencies, inspection, caratulacion, SIGMA Frontend
- **Frontend DOM**: Dashboard, Alta Inconsistencias, Seleccion Candidatos, Fiscalizacion
- **Seguridad Web**: OWASP ZAP Scanner (vulnerabilidades, headers, XSS, CSRF)
- **Machine Learning**: Analisis predictivo, deteccion de anomalias, tendencias

### OpenAI
- **Modelos IA/LLM**: GPT-4, GPT-3.5 y otros modelos OpenAI
- **NVIDIA Garak**: 34 detectores, multiples categorias de ataque, probes especializados

### QASL-MOBILE (Canal Satelite)
- **Testing Mobile**: Ejecucion de tests en dispositivo Android con Maestro
- **Video MP4**: Grabacion de la ejecucion de tests
- **Streaming**: Transmision en vivo del dispositivo (:8765)
- **Metricas**: pass rate, tests totales, duration, screenshots, selector confidence

---

## Dashboards Grafana

| #  | Dashboard       | Target   | Descripcion                        |
|----|-----------------|----------|------------------------------------|
| 1  | Overview        | SIGMA+OAI| Vision general del sistema         |
| 2  | APIs Backend    | SIGMA    | Estado de 7 endpoints              |
| 3  | Frontend DOM    | SIGMA    | Metricas de 4 paginas              |
| 4  | OWASP ZAP       | SIGMA    | Vulnerabilidades web               |
| 5  | NVIDIA Garak    | OPENAI   | Seguridad IA/LLM                   |
| 6  | Compliance      | SIGMA    | SOC2, ISO27001, PCI-DSS            |
| 7  | Trends          | AMBOS    | Tendencias historicas              |
| 8  | INGRID Chat     | AMBOS    | Widget chatbot integrado           |
| 9  | QASL-MOBILE     | MOBILE   | Testing mobile con IA              |

---

## Reportes PDF (INGRID)

| Tipo       | Contenido                                           |
|------------|-----------------------------------------------------|
| full       | Reporte completo (todas las secciones)              |
| garak      | Seguridad IA/LLM OpenAI (detectores, probes, cards) |
| apis       | Estado de APIs SIGMA (resumen, performance, detalle) |
| zap        | Vulnerabilidades web SIGMA (OWASP ZAP)              |
| compliance | Cumplimiento normativo (SOC2, ISO, PCI, HIPAA)      |

---

**Epidata Consulting** | AGIP - Buenos Aires Ciudad | Febrero 2026
