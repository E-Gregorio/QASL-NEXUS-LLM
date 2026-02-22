# ═══════════════════════════════════════════════════════════════════════════
# INGRID - AI Testing Framework
# Script para Video Demo: Tests de Google Gemini
# Autor: Elyer Maldonado - QA Lead
# ═══════════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   INGRID - AI Testing Framework" -ForegroundColor Cyan
Write-Host "   Video Demo: Testing Google Gemini con IA" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ───────────────────────────────────────────────────────────────
# PASO 1: Resetear Grafana (limpia todo y levanta de nuevo)
# ───────────────────────────────────────────────────────────────
Write-Host "[1/5] Reseteando Grafana..." -ForegroundColor Yellow
npm run grafana:reset
Write-Host "      Esperando 15 segundos para que Grafana levante..." -ForegroundColor Gray
Start-Sleep -Seconds 15
Write-Host "      Grafana lista en http://localhost:3002" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 2: Limpiar metricas anteriores
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Limpiando metricas anteriores..." -ForegroundColor Yellow
npm run clean:metrics
Write-Host "      Metricas limpiadas" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 3: Limpiar resultados anteriores
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Limpiando resultados anteriores..." -ForegroundColor Yellow
npm run clean
if (Test-Path "test-results") {
    Remove-Item -Recurse -Force "test-results"
}
Write-Host "      Resultados limpiados" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 4: Ejecutar tests de Gemini
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Ejecutando tests de Google Gemini..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "   INICIANDO AUTOMATIZACION - Playwright + LLM-as-Judge" -ForegroundColor Magenta
Write-Host "   Target: gemini.google.com" -ForegroundColor Magenta
Write-Host "   Judge: Claude API (Anthropic)" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

npm run test:gemini

# ───────────────────────────────────────────────────────────────
# PASO 5: Abrir Grafana para ver metricas
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Abriendo Grafana para ver metricas..." -ForegroundColor Yellow
Start-Process "http://localhost:3002/d/ingrid-dashboard/ingrid-ai-testing-framework"

# ───────────────────────────────────────────────────────────────
# FINALIZADO
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   DEMO COMPLETADO" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "   Grafana: http://localhost:3002" -ForegroundColor Cyan
Write-Host "   Videos:  ./test-results/" -ForegroundColor Cyan
Write-Host "   Screenshots: ./reports/" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Desarrollado por: Elyer Maldonado - QA Lead" -ForegroundColor Gray
Write-Host "   Framework: INGRID v2.0" -ForegroundColor Gray
Write-Host ""
