# ═══════════════════════════════════════════════════════════════════════════
# INGRID - AI Testing Framework
# Script de Demo para VENTAS - Secuencia Completa
# Autor: Elyer Maldonado - QA Lead
# ═══════════════════════════════════════════════════════════════════════════

Clear-Host
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   INGRID v2.0 - AI Testing Framework" -ForegroundColor Cyan
Write-Host "   DEMO DE VENTA - Secuencia Completa" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ───────────────────────────────────────────────────────────────
# PASO 1: Verificar Docker
# ───────────────────────────────────────────────────────────────
Write-Host "[1/7] Verificando Docker Desktop..." -ForegroundColor Yellow
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Docker Desktop no esta corriendo!" -ForegroundColor Red
    Write-Host "      Abre Docker Desktop y vuelve a ejecutar este script." -ForegroundColor Red
    Write-Host ""
    exit 1
}
Write-Host "      Docker esta corriendo" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 2: RESETEAR Grafana (apaga, borra datos, levanta limpio)
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/7] Reseteando Grafana (borrando datos anteriores)..." -ForegroundColor Yellow
npm run grafana:reset
Write-Host "      Grafana levantada con datos limpios" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 3: Esperar que Grafana inicie
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/7] Esperando 15 segundos para que Grafana inicie..." -ForegroundColor Yellow
for ($i = 15; $i -gt 0; $i--) {
    Write-Host "`r      Esperando... $i segundos " -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 1
}
Write-Host "`r      Grafana lista!                    " -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 4: Limpiar archivo JSON local
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/7] Limpiando metricas y resultados anteriores..." -ForegroundColor Yellow
npm run clean:metrics 2>$null
npm run clean 2>$null
if (Test-Path "test-results") {
    Remove-Item -Recurse -Force "test-results" 2>$null
}
Write-Host "      Todo limpio" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 5: ABRIR GRAFANA (cliente mirando - debe decir "No data")
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/7] Abriendo Grafana en el navegador..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "   GRAFANA ABIERTA - CLIENTE DEBE ESTAR MIRANDO" -ForegroundColor Magenta
Write-Host "   Credenciales: admin / admin" -ForegroundColor Magenta
Write-Host "   TODOS LOS PANELES DEBEN DECIR 'No data'" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Start-Process "http://localhost:3002/d/ingrid-dashboard/ingrid-v2-0-ai-testing-framework?orgId=1&from=now-15m&to=now&timezone=browser&refresh=5s"
Write-Host "      Presiona ENTER cuando el cliente este listo..." -ForegroundColor Cyan
Read-Host

# ───────────────────────────────────────────────────────────────
# PASO 6: EJECUTAR TESTS (metricas llegan en tiempo real)
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[6/7] Ejecutando tests de Google Gemini..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   AUTOMATIZACION EN VIVO - METRICAS LLEGANDO A GRAFANA" -ForegroundColor Green
Write-Host "   Target: gemini.google.com" -ForegroundColor Green
Write-Host "   Judge: Claude API (LLM-as-Judge)" -ForegroundColor Green
Write-Host "   OWASP: LLM Top 10 2025" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

npm run test:gemini

Write-Host ""
Write-Host "      Tests completados!" -ForegroundColor Green

# ───────────────────────────────────────────────────────────────
# PASO 7: Generar y abrir PDF
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[7/7] Generando reporte PDF profesional..." -ForegroundColor Yellow
npm run pdf

$pdfFile = Get-ChildItem -Path "reports" -Filter "INGRID-AI-Security-Assessment-*.pdf" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($pdfFile) {
    Write-Host "      Abriendo PDF..." -ForegroundColor Yellow
    Start-Process $pdfFile.FullName
    Write-Host "      PDF abierto: $($pdfFile.Name)" -ForegroundColor Green
}

# ───────────────────────────────────────────────────────────────
# FINALIZADO
# ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   DEMO COMPLETADA EXITOSAMENTE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Grafana:  http://localhost:3002" -ForegroundColor White
Write-Host "   PDF:      reports/$($pdfFile.Name)" -ForegroundColor White
Write-Host ""
Write-Host "   Para apagar Grafana:" -ForegroundColor Gray
Write-Host "   npm run grafana:down" -ForegroundColor Gray
Write-Host ""
Write-Host "   Desarrollado por: Elyer Maldonado - QA Lead" -ForegroundColor DarkGray
Write-Host ""
