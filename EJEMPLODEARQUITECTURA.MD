╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                           🚀 QASL NEXUS LLM PLATFORM 🚀                                   ║
║                    Large Language Model QA Automation Platform                            ║
║                                                                                           ║
║              Plataforma de Automatización QA con Modelos de Lenguaje Avanzados           ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

                                    ┌─────────────────────────┐
                                    │   🌐 API GATEWAY        │
                                    │   (Kong/Traefik)        │
                                    │   Port: 8080            │
                                    └───────────┬─────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
        
    ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
    │ 📚 MS-01              │     │ 🧠 MS-05              │     │ 🤖 MS-09              │
    │ METODOLOGÍAS          │     │ INGRID AI FRAMEWORK   │     │ ORQUESTADOR LLM       │
    │ (GitLab Pages)        │     │ AI Testing Core       │     │ (Multi-LLM Engine)    │
    │ Port: 3000            │     │ Port: 7000            │     │ Port: 8000            │
    ├───────────────────────┤     ├───────────────────────┤     ├───────────────────────┤
    │ • Templates EPIDATA   │     │ • AI Test Generation  │     │ • Claude (Anthropic)  │
    │ • Master Test Plan    │     │ • Context Analysis    │     │ • GPT-5 (OpenAI)      │
    │ • Test Plan Sprint    │     │ • Test Evaluation     │     │ • Gemini (Google)     │
    │ • User Story ISTQB    │     │ • LLM Orchestration   │     │ • Decision Engine     │
    │ • Bug Report Template │     │ • Prompt Engineering  │     │ • VCR Calculator      │
    │ • IEEE 29119 Docs     │     │ • AI Agents           │     │ • Template Filler     │
    │ • Métricas Calidad    │     │                       │     │ • Intelligent Mapper  │
    └───────────────────────┘     └───────────────────────┘     └───────────────────────┘
             │ Templates                    │ AI Power                  │ Intelligence
             │                              │                           │
             └──────────────────────────────┴───────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
                    ▼                                               ▼
        
    ┌───────────────────────┐                         ┌───────────────────────┐
    │ 🔬 MS-02              │                         │ 📊 MS-11              │
    │ PRUEBAS ESTÁTICAS     │◄────────────────────────┤ REPORTADOR            │
    │ (SUR Static Analyzer) │                         │ (Multi-Channel)       │
    │ Port: 4000            │                         │ Port: 9000            │
    ├───────────────────────┤                         ├───────────────────────┤
    │ • Parser .docx HUs    │                         │ 📧 Email (SMTP)       │
    │ • Claude AI Analyzer  │                         │ 💬 Slack Webhooks     │
    │ • Gap Detection       │                         │ 👥 MS Teams           │
    │ • RTM Generator       │                         │ 📹 Google Meet        │
    │ • TC Auto-generation  │                         │ 📄 PDF Reports        │
    │ • Flowcharts Mermaid  │                         │ 📊 Allure Dashboard   │
    │ • IEEE 1028 Reports   │                         │ 📈 HTML Extra         │
    └───────────────────────┘                         │ 🎯 K6 Report          │
             │                                        │ 🔒 ZAP Report         │
             │ Genera TCs + Trazabilidad              │ 🛡️ Garak Report       │
             ▼                                        │ 📱 Maestro Report     │
                                                      └───────────────────────┘
    ┌─────────────────────────────────────────────────────────────────┐
    │                  💾 MS-12: DATABASE (PostgreSQL)                │
    │                        Port: 5432                               │
    ├─────────────────────────────────────────────────────────────────┤
    │  Tables:                                                        │
    │  • epic                    • test_execution                     │
    │  • user_story              • defect                             │
    │  • test_suite              • metric                             │
    │  • test_case               • static_analysis_gap                │
    │  • precondition            • report                             │
    │  • vcr_score               • notification                       │
    │                                                                 │
    │  ⭐ SINGLE SOURCE OF TRUTH - Todos los MS escriben/leen aquí   │
    └─────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ All services consume/produce
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
        
┌───────────────┐       ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ ⚡ MS-03      │       │ 📱 MS-04      │       │ 🛡️ MS-06      │       │ 📡 MS-07      │
│ QASL          │       │ QASL MOBILE   │       │ GARAK LLM     │       │ SENTINEL      │
│ FRAMEWORK     │       │ (Maestro)     │       │ SECURITY      │       │ UNIFIED       │
│ Port: 6000+   │       │ Port: 7500    │       │ Port: 7600    │       │ Port: 3003    │
├───────────────┤       ├───────────────┤       ├───────────────┤       ├───────────────┤
│ 🎭 E2E        │       │ • iOS Testing │       │ • Jailbreak   │       │ 📊 Grafana    │
│   Playwright  │       │ • Android     │       │ • Injection   │       │ 📈 Prometheus │
│   :6001       │       │ • Claude      │       │ • Leakage     │       │ 💾 InfluxDB   │
│               │       │   Vision UX   │       │ • Prompt Eng  │       │ 🔔 Alertmgr   │
│ 🔌 API        │       │ • Maestro     │       │ • NVIDIA      │       │               │
│   Newman      │       │   Flows       │       │   Garak       │       │ Dashboards:   │
│   :6002       │       │               │       │               │       │ • Executive   │
│               │       │               │       │               │       │ • Technical   │
│ ⚡ Performance│       │               │       │               │       │ • Mobile      │
│   K6          │       │               │       │               │       │ • Security    │
│   :6003       │       │               │       │               │       │ • EPIDATA     │
│               │       │               │       │               │       │   Metrics     │
│ 🔒 Security   │       │               │       │               │       │               │
│   OWASP ZAP   │       │               │       │               │       │               │
│   :6004       │       │               │       │               │       │               │
│               │       │               │       │               │       │               │
│ 📊 Allure     │       │               │       │               │       │               │
│   :6005       │       │               │       │               │       │               │
└───────────────┘       └───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │                       │
        └───────────────────────┼───────────────────────┼───────────────────────┘
                                │                       │
                                ▼                       ▼
                                
                    ┌───────────────────────────────────────┐
                    │  🔌 MS-10: MCP INTERFAZ              │
                    │  (Integration Hub)                    │
                    │  Port: 5000                          │
                    ├───────────────────────────────────────┤
                    │  Connectors:                         │
                    │  • 🎫 Jira (Issues, Epics, Stories)  │
                    │  • ✅ X-Ray (Test Execution)         │
                    │  • 📋 TestRail (Test Cases)          │
                    │  • 🔷 Azure DevOps (Work Items)      │
                    │  • 🧪 qTest (Test Management)        │
                    │                                      │
                    │  Orchestration:                      │
                    │  1. Fetch template (MS-01)           │
                    │  2. Get traceability (MS-12)         │
                    │  3. Fill with AI (MS-09)             │
                    │  4. Map to external tool             │
                    │  5. Create issue/test                │
                    │  6. Create bidirectional links       │
                    └───────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────────┐
                    │  🔄 MS-08: CI/CD PIPELINE            │
                    │  Port: 8888                          │
                    ├───────────────────────────────────────┤
                    │  • 🦊 GitLab Runner                  │
                    │  • 🔨 Jenkins Master + Agents        │
                    │  • 🐳 Docker-in-Docker               │
                    │  • 📦 Artifact Storage               │
                    │                                      │
                    │  Pipelines:                          │
                    │  ├─ Static Analysis (MS-02)          │
                    │  ├─ VCR Calculation (MS-09)          │
                    │  ├─ Test Execution (MS-03/04/06)     │
                    │  ├─ Report Generation (MS-11)        │
                    │  └─ Deployment (GitLab Pages)        │
                    └───────────────────────────────────────┘