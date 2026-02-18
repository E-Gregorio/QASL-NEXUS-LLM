# MS-11: Reportador Multi-Canal

## Puerto: 9000
## Rol: Consolida reportes y notifica por Email, Slack, Teams

## Que hace
- Lee datos de MS-12 (views: v_executive_summary, v_pass_rate, etc.)
- Genera PDFs ejecutivos de 5 paginas
- Notifica por Slack, Teams, Email
- Cron semanal automatico (viernes 5pm)

## Canales de notificacion

| Canal | Tecnologia | Uso |
|-------|-----------|-----|
| Email | Nodemailer (SMTP) | Reportes PDF a stakeholders |
| Slack | Webhooks | Notificaciones en tiempo real |
| Teams | Webhooks | Notificaciones QA channel |

## API Endpoints

| Metodo | Ruta | Descripcion | Usado por |
|--------|------|-------------|-----------|
| POST | /api/report/executive | Genera PDF + envia | MS-08 |
| POST | /api/report/pipeline | Notifica resultado pipeline | MS-08 |
| POST | /api/report/alert | Alerta critica multicanal | MS-07 |
| GET | /api/report/summary | Resumen JSON (sin PDF) | MS-07 |
| GET | /api/report/health | Health check | Todos |

## PDF Ejecutivo (5 paginas)

1. Executive Summary (epics, TCs, VCR, bloqueantes)
2. Test Execution Metrics (pass rate por MS)
3. Defect Analysis (severidad, estado, MTTR)
4. Automation Progress (cobertura, deuda tecnica)
5. Recommendations (alertas, mejoras sugeridas)

## Estructura

```
ms-11-reportador/
├── src/
│   ├── server.ts                  # Express + cron semanal
│   ├── config/
│   │   └── database.ts
│   ├── services/
│   │   └── data-collector.ts      # Lee datos de MS-12
│   ├── generators/
│   │   └── pdf-generator.ts       # Genera PDFs ejecutivos
│   ├── channels/
│   │   ├── email.channel.ts       # SMTP
│   │   ├── slack.channel.ts       # Webhooks
│   │   └── teams.channel.ts       # Webhooks
│   ├── routes/
│   │   └── report.routes.ts
│   └── types/
│       └── index.ts
├── reports/                        # PDFs generados
├── docker/ + docker-compose.yml
├── .env.example
└── README.md
```
