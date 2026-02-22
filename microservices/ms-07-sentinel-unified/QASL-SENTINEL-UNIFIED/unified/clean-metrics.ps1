# ============================================
# QASL-SENTINEL-UNIFIED - Limpieza de Metricas
# ============================================
# Proyecto: QASL NEXUS LLM
# Autor: Elyer Gregorio Maldonado
# Organizacion: QASL NEXUS LLM
# Lider Tecnico QA: Elyer Gregorio Maldonado
# Version: 1.0.0
# ============================================
#
# Este script limpia todas las metricas almacenadas:
#   - Prometheus (volumenes Docker)
#   - InfluxDB (bucket sentinel_metrics)
#   - Grafana (estado de dashboards)
#
# Uso: .\clean-metrics.ps1
# ============================================

$ErrorActionPreference = "Continue"

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "    =========================================================================" -ForegroundColor Red
    Write-Host "    |                                                                       |" -ForegroundColor Red
    Write-Host "    |   QASL-SENTINEL-UNIFIED - Limpieza de Metricas                        |" -ForegroundColor Red
    Write-Host "    |   QASL NEXUS LLM - Elyer Gregorio Maldonado                            |" -ForegroundColor Red
    Write-Host "    |                                                                       |" -ForegroundColor Red
    Write-Host "    =========================================================================" -ForegroundColor Red
    Write-Host ""
}

function Show-Step {
    param($step, $message)
    Write-Host ""
    Write-Host "[$step] $message" -ForegroundColor Yellow
}

function Show-Success {
    param($message)
    Write-Host "    [OK] $message" -ForegroundColor Green
}

function Show-Info {
    param($message)
    Write-Host "    [i] $message" -ForegroundColor Gray
}

function Show-Err {
    param($message)
    Write-Host "    [X] $message" -ForegroundColor Red
}

function Show-Warn {
    param($message)
    Write-Host "    [!] $message" -ForegroundColor DarkYellow
}

# ============================================
# MAIN SCRIPT
# ============================================

Show-Banner

$projectPath = $PSScriptRoot
Set-Location $projectPath

# Confirmacion del usuario
Write-Host "    ATENCION: Este script eliminara TODAS las metricas almacenadas:" -ForegroundColor Red
Write-Host "      - Datos de Prometheus (metricas de APIs)" -ForegroundColor Red
Write-Host "      - Datos de InfluxDB (metricas de Frontend/Seguridad)" -ForegroundColor Red
Write-Host "      - Datos de Grafana (estado del dashboard)" -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "    Confirmar limpieza? Escribir 'SI' para continuar"
if ($confirm -ne "SI") {
    Show-Info "Limpieza cancelada."
    exit 0
}

$startTime = Get-Date

# Step 1: Verificar Docker
Show-Step "1/4" "Verificando Docker..."

$dockerCheck = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Show-Err "Docker Desktop no esta corriendo. Por favor inicialo primero."
    exit 1
}
Show-Success "Docker Desktop esta corriendo"

# Step 2: Detener contenedores
Show-Step "2/4" "Deteniendo contenedores..."

docker-compose down 2>$null | Out-Null
Show-Success "Contenedores detenidos"

# Step 3: Eliminar volumenes de datos
Show-Step "3/4" "Eliminando volumenes de datos..."

# Eliminar volumenes de Docker
$volumes = @("unified_prometheus-data", "unified_influxdb-data", "unified_influxdb-config", "unified_grafana-data")
foreach ($vol in $volumes) {
    $exists = docker volume ls -q --filter "name=$vol" 2>$null
    if ($exists) {
        docker volume rm $vol 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Volumen eliminado: $vol"
        } else {
            Show-Warn "No se pudo eliminar: $vol (puede estar en uso)"
        }
    } else {
        Show-Info "Volumen no encontrado: $vol (ya limpio)"
    }
}

# Step 4: Limpiar snapshots y reportes del frontend
Show-Step "4/4" "Limpiando snapshots y reportes locales..."

$snapshotsDir = Join-Path $projectPath "sentinel-frontend\snapshots"
$reportsDir = Join-Path $projectPath "sentinel-frontend\reports\zap"
$baselinesDir = Join-Path $projectPath "sentinel-frontend\security-baselines"
$backendHistoryDir = Join-Path $projectPath "sentinel-backend\data\history"
$backendMetricsDir = Join-Path $projectPath "sentinel-backend\data\metrics"
$backendAlertsDir = Join-Path $projectPath "sentinel-backend\data\alerts"
$backendBaselinesDir = Join-Path $projectPath "sentinel-backend\data\baselines"
$backendReportsDir = Join-Path $projectPath "sentinel-backend\data\reports"

$dirs = @(
    @{Path=$snapshotsDir; Name="Snapshots Frontend"},
    @{Path=$reportsDir; Name="Reportes ZAP"},
    @{Path=$baselinesDir; Name="Baselines de Seguridad"},
    @{Path=$backendHistoryDir; Name="Historial Backend"},
    @{Path=$backendMetricsDir; Name="Metricas Backend"},
    @{Path=$backendAlertsDir; Name="Alertas Backend"},
    @{Path=$backendBaselinesDir; Name="Baselines Backend"},
    @{Path=$backendReportsDir; Name="Reportes Backend"}
)

foreach ($dir in $dirs) {
    if (Test-Path $dir.Path) {
        $files = Get-ChildItem -Path $dir.Path -File -ErrorAction SilentlyContinue
        $count = ($files | Measure-Object).Count
        if ($count -gt 0) {
            Remove-Item -Path (Join-Path $dir.Path "*") -Force -ErrorAction SilentlyContinue
            Show-Success "$($dir.Name): $count archivos eliminados"
        } else {
            Show-Info "$($dir.Name): ya vacio"
        }
    } else {
        Show-Info "$($dir.Name): directorio no existe (limpio)"
    }
}

# Resumen
$endTime = Get-Date
$duration = $endTime - $startTime
$durationStr = $duration.ToString("mm\:ss")

Write-Host ""
Write-Host "    ================================================================" -ForegroundColor Green
Write-Host "    |              LIMPIEZA COMPLETADA                             |" -ForegroundColor Green
Write-Host "    |--------------------------------------------------------------|" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   Prometheus:  Datos eliminados (volumen limpio)            |" -ForegroundColor Green
Write-Host "    |   InfluxDB:    Datos eliminados (volumen limpio)            |" -ForegroundColor Green
Write-Host "    |   Grafana:     Estado reseteado (volumen limpio)            |" -ForegroundColor Green
Write-Host "    |   Frontend:    Snapshots y reportes eliminados              |" -ForegroundColor Green
Write-Host "    |   Backend:     Historial y metricas eliminados              |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   Duracion: $durationStr                                          |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |--------------------------------------------------------------|" -ForegroundColor Green
Write-Host "    |   Proximo paso: .\run-unified.ps1                           |" -ForegroundColor Green
Write-Host "    ================================================================" -ForegroundColor Green
Write-Host ""
