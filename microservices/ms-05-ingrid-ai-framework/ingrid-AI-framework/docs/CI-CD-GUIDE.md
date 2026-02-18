# INGRID - Guía de Integración CI/CD

## Descripción General

INGRID incluye pipelines de CI/CD listos para usar con GitHub Actions. Esta guía explica cómo configurar y usar las integraciones.

---

## Workflows Disponibles

| Workflow | Archivo | Propósito |
|----------|---------|-----------|
| **INGRID Tests** | `ingrid-tests.yml` | Pipeline principal para el repo INGRID |
| **Reusable Workflow** | `ingrid-reusable.yml` | Template para integrar en otros proyectos |
| **Release** | `release.yml` | Crea releases automáticos con tags |

---

## 1. Pipeline Principal (ingrid-tests.yml)

Este workflow se ejecuta automáticamente en:
- Push a `main` o `develop`
- Pull Requests a `main`
- Ejecución manual (workflow_dispatch)

### Ejecución Manual

Puedes ejecutar el pipeline manualmente desde GitHub:

1. Ve a **Actions** → **🤖 INGRID AI Tests**
2. Click en **Run workflow**
3. Selecciona opciones:
   - `test_suite`: all, functional, security, performance, api
   - `chatbot_url`: URL del chatbot a testear (opcional)

### Secrets Requeridos

Configura estos secrets en tu repositorio (Settings → Secrets → Actions):

| Secret | Requerido | Descripción |
|--------|-----------|-------------|
| `ANTHROPIC_API_KEY` | Recomendado | Para LLM-as-Judge (Claude) |
| `GOOGLE_AI_API_KEY` | Opcional | Para tests con Gemini |
| `OPENAI_API_KEY` | Opcional | Para tests con OpenAI |
| `SLACK_WEBHOOK_URL` | Opcional | Notificaciones Slack |

### Artifacts Generados

Después de cada ejecución, descarga los artifacts:

- **allure-report**: Reporte interactivo HTML
- **ingrid-pdf-report**: Reporte ejecutivo PDF
- **test-videos**: Grabaciones de los tests
- **metrics-store**: Datos raw de métricas

---

## 2. Integración en Otros Proyectos

Para usar INGRID en otro proyecto, crea el archivo `.github/workflows/ai-testing.yml`:

```yaml
name: AI Testing with INGRID

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  # Permite ejecución manual
  workflow_dispatch:

jobs:
  ingrid-test:
    uses: TU-USUARIO/ingrid-AI-framework/.github/workflows/ingrid-reusable.yml@main
    with:
      chatbot_url: 'https://tu-chatbot.com'
      test_suite: 'all'           # all, functional, security, performance, api
      generate_pdf: true          # Generar reporte PDF
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
```

### Parámetros Disponibles

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `chatbot_url` | string | **requerido** | URL del chatbot a testear |
| `test_suite` | string | `all` | Suite: all, functional, security, performance, api |
| `node_version` | string | `20` | Versión de Node.js |
| `generate_pdf` | boolean | `true` | Generar reporte PDF |
| `ingrid_ref` | string | `main` | Branch/tag de INGRID a usar |

---

## 3. Releases Automáticos

Para crear un release automático:

```bash
# Crear tag
git tag -a v2.1.0 -m "Release v2.1.0"

# Push del tag
git push origin v2.1.0
```

El workflow `release.yml` automáticamente:
1. Genera changelog con los commits
2. Crea el release en GitHub
3. Adjunta notas de la versión

### Versionado

- `v2.0.0` → Release estable
- `v2.1.0-beta` → Pre-release beta
- `v2.1.0-rc.1` → Release candidate

---

## 4. GitHub Pages (Reportes Públicos)

Para publicar reportes Allure en GitHub Pages:

1. Ve a **Settings** → **Pages**
2. Source: **GitHub Actions**
3. El workflow desplegará automáticamente después de cada push a `main`

URL del reporte: `https://TU-USUARIO.github.io/ingrid-AI-framework/`

---

## 5. Ejemplo de Integración Completa

### Proyecto con Chatbot Existente

```yaml
# .github/workflows/chatbot-tests.yml
name: 🤖 Chatbot Quality Assurance

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    # Ejecutar diariamente a las 6 AM
    - cron: '0 6 * * *'

jobs:
  # Tests funcionales y de seguridad
  quality-tests:
    uses: TU-USUARIO/ingrid-AI-framework/.github/workflows/ingrid-reusable.yml@main
    with:
      chatbot_url: ${{ vars.CHATBOT_URL }}
      test_suite: 'all'
      generate_pdf: true
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

  # Notificar resultados
  notify:
    needs: quality-tests
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ needs.quality-tests.result }}
          fields: repo,message,commit,author
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 6. Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"

El LLM-as-Judge requiere la API key de Anthropic. Configúrala en:
Settings → Secrets and variables → Actions → New repository secret

### Error: "Target URL not accessible"

Verifica que:
1. La URL del chatbot sea accesible desde GitHub Actions
2. No requiera VPN o IP whitelist
3. El servidor esté corriendo

### Tests timeout

Aumenta el timeout en `playwright.config.ts`:
```typescript
timeout: 120000, // 2 minutos
```

### Artifacts no disponibles

Los artifacts se retienen por 30 días. Descárgalos desde la pestaña **Actions** → selecciona el workflow → **Artifacts**.

---

## 7. Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `CHATBOT_URL` | URL base del chatbot |
| `ANTHROPIC_API_KEY` | API key de Claude |
| `GOOGLE_AI_API_KEY` | API key de Gemini |
| `OPENAI_API_KEY` | API key de OpenAI |
| `CI` | Detecta entorno CI (auto) |

---

## Soporte

Para soporte técnico o personalización de pipelines, contactar al autor.

---

*INGRID AI Testing Framework - CI/CD Guide v2.0*
