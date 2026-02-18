# ============================================
# QASL-SENTINEL-UNIFIED - Ejecucion Unificada
# ============================================
# Proyecto: SIGMA
# Cliente: AGIP (Administracion Gubernamental de Ingresos Publicos)
# Empresa: Epidata Consulting
# Lider Tecnico QA: Elyer Gregorio Maldonado
# Version: 3.0.0
# ============================================
#
# Este script ejecuta TODO el sistema unificado:
#   1. Verifica Docker Desktop
#   2. Levanta infraestructura (Prometheus + InfluxDB + Grafana + Pushgateway)
#   3. Instala dependencias si es necesario
#   4. Verifica QASL-API-SENTINEL standalone (Prometheus Exporter :9091)
#   5. Inicia Frontend Monitor (DOM Sentinel - InfluxDB)
#   6. Inicia INGRID Chatbot (Claude AI - Puerto 3100)
#   7. Importa metricas Garak (ultimo reporte disponible)
#   8. Abre Grafana Command Center en el navegador
#
# Uso: .\run-unified.ps1
# ============================================

$ErrorActionPreference = "Continue"

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "    =========================================================================" -ForegroundColor Cyan
    Write-Host "    |                                                                       |" -ForegroundColor Cyan
    Write-Host "    |   QASL-SENTINEL-UNIFIED - Command Center                              |" -ForegroundColor Cyan
    Write-Host "    |   Monitoreo Unificado: Backend APIs + Frontend DOM + Seguridad         |" -ForegroundColor Cyan
    Write-Host "    |                                                                       |" -ForegroundColor Cyan
    Write-Host "    |   AGIP - Buenos Aires Ciudad                                          |" -ForegroundColor Cyan
    Write-Host "    |   Epidata Consulting                                                  |" -ForegroundColor Cyan
    Write-Host "    |                                                                       |" -ForegroundColor Cyan
    Write-Host "    =========================================================================" -ForegroundColor Cyan
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

$startTime = Get-Date

# Step 1: Verificar directorio del proyecto
Show-Step "1/9" "Verificando directorio del proyecto..."

$projectPath = $PSScriptRoot
Set-Location $projectPath

if (-not (Test-Path "docker-compose.yml")) {
    Show-Err "No se encontro docker-compose.yml. Ejecuta este script desde la carpeta unified/."
    exit 1
}
if (-not (Test-Path "sentinel-backend\package.json")) {
    Show-Err "No se encontro sentinel-backend/. Estructura incompleta."
    exit 1
}
if (-not (Test-Path "sentinel-frontend\package.json")) {
    Show-Err "No se encontro sentinel-frontend/. Estructura incompleta."
    exit 1
}
Show-Success "Directorio correcto: $projectPath"

# Step 2: Verificar Docker
Show-Step "2/9" "Verificando Docker Desktop..."

$dockerCheck = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Show-Err "Docker Desktop no esta corriendo. Por favor inicialo primero."
    exit 1
}
Show-Success "Docker Desktop esta corriendo"

# Step 3: Levantar infraestructura Docker
Show-Step "3/9" "Levantando infraestructura Docker..."

# Detener contenedores antiguos si existen
docker-compose down 2>$null | Out-Null

# Levantar servicios
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Show-Err "Error al levantar docker-compose"
    exit 1
}

Show-Success "Contenedores iniciados:"
Show-Info "Prometheus:    http://localhost:9095"
Show-Info "InfluxDB:      http://localhost:8088"
Show-Info "Grafana:       http://localhost:3003 (admin/sentinel2024)"
Show-Info "Pushgateway:   http://localhost:9096"

# Esperar a que los servicios esten listos
Show-Info "Esperando 20 segundos para que los servicios inicien..."
Start-Sleep -Seconds 20
Show-Success "Servicios Docker listos"

# Step 4: Instalar dependencias (si es necesario)
Show-Step "4/9" "Verificando dependencias..."

$backendModules = Join-Path $projectPath "sentinel-backend\node_modules"
$frontendModules = Join-Path $projectPath "sentinel-frontend\node_modules"

if (-not (Test-Path $backendModules)) {
    Show-Info "Instalando dependencias del Backend..."
    Push-Location (Join-Path $projectPath "sentinel-backend")
    npm install 2>&1 | Out-Null
    Pop-Location
    Show-Success "Dependencias del Backend instaladas"
} else {
    Show-Success "Backend: dependencias ya instaladas"
}

if (-not (Test-Path $frontendModules)) {
    Show-Info "Instalando dependencias del Frontend..."
    Push-Location (Join-Path $projectPath "sentinel-frontend")
    npm install 2>&1 | Out-Null
    Pop-Location
    Show-Success "Dependencias del Frontend instaladas"
} else {
    Show-Success "Frontend: dependencias ya instaladas"
}

$ingridModules = Join-Path $projectPath "qasl-ingrid\node_modules"
if (-not (Test-Path $ingridModules)) {
    Show-Info "Instalando dependencias de INGRID Chatbot..."
    Push-Location (Join-Path $projectPath "qasl-ingrid")
    npm install 2>&1 | Out-Null
    Pop-Location
    Show-Success "Dependencias de INGRID instaladas"
} else {
    Show-Success "INGRID: dependencias ya instaladas"
}

# Step 5: Iniciar Backend Monitor (API Sentinel Unified)
Show-Step "5/9" "Iniciando Backend Monitor (API Sentinel)..."
Show-Info "Prometheus Exporter en puerto 9097 -> Prometheus Unified (:9095)"

$backendPath = Join-Path $projectPath "sentinel-backend"
$backendProcess = Start-Process -FilePath "node" -ArgumentList "cli/sentinel-cli.mjs start --watch" -WorkingDirectory $backendPath -PassThru -WindowStyle Minimized
Show-Success "Backend Monitor iniciado (PID: $($backendProcess.Id))"

# Verificar canales satelite (proyectos externos - solo lectura)
$apiSentinelOk = $false
$mobileSentinelOk = $false

Show-Info "Verificando canales satelite..."
Start-Sleep -Seconds 3

# Canal: QASL-API-SENTINEL standalone (Prometheus :9091)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9091/metrics" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $apiSentinelOk = $true
        $qaslMetrics = ($response.Content -split "`n" | Where-Object { $_ -match "^qasl_" -and $_ -notmatch "^#" }).Count
        Show-Success "QASL-API-SENTINEL: CONECTADO ($qaslMetrics metricas en :9091)"
    }
} catch {
    Show-Info "QASL-API-SENTINEL standalone: no detectado (opcional)"
}

# Canal: QASL-MOBILE (InfluxDB :8089)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8089/ping" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 204 -or $response.StatusCode -eq 200) {
        $mobileSentinelOk = $true
        Show-Success "QASL-MOBILE: CONECTADO (InfluxDB en :8089)"
    }
} catch {
    Show-Info "QASL-MOBILE: no detectado (opcional)"
}

# Step 6: Iniciar Frontend Monitor (DOM Sentinel)
Show-Step "6/9" "Iniciando Frontend Monitor (DOM Sentinel)..."
Show-Info "Enviando metricas a InfluxDB (puerto 8088)"
Show-Info "Monitoreando: Dashboard, Alta Inconsistencias, Seleccion Candidatos, Fiscalizacion"

$frontendPath = Join-Path $projectPath "sentinel-frontend"
$frontendProcess = Start-Process -FilePath "npx" -ArgumentList "tsx src/guardian.ts" -WorkingDirectory $frontendPath -PassThru -WindowStyle Minimized
Show-Success "Frontend Monitor iniciado (PID: $($frontendProcess.Id))"

# Step 7: Iniciar INGRID Chatbot (Claude AI)
Show-Step "7/9" "Iniciando INGRID Chatbot (Claude AI)..."
Show-Info "Servidor en puerto 3100"
Show-Info "Modelo: claude-sonnet-4-5 | Prometheus + InfluxDB RAG"

$ingridPath = Join-Path $projectPath "qasl-ingrid"
$ingridProcess = Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $ingridPath -PassThru -WindowStyle Minimized
Show-Success "INGRID Chatbot iniciado (PID: $($ingridProcess.Id))"

# Esperar a que INGRID levante
Start-Sleep -Seconds 3

# Step 8: Importar metricas Garak (ultimo reporte disponible)
Show-Step "8/9" "Importando metricas NVIDIA Garak..."

$garakRunsPath = Join-Path $env:USERPROFILE ".local\share\garak\garak_runs"
$garakImporter = Join-Path $projectPath "sentinel-backend\src\importers\garak-importer.mjs"

if (Test-Path $garakRunsPath) {
    $latestReport = Get-ChildItem -Path $garakRunsPath -Filter "*.report.jsonl" -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestReport) {
        Show-Info "Reporte encontrado: $($latestReport.Name)"
        $garakResult = node $garakImporter $latestReport.FullName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Metricas Garak importadas a Pushgateway (puerto 9096)"
        } else {
            Show-Warn "No se pudieron importar metricas Garak (Pushgateway puede no estar listo)"
        }
    } else {
        Show-Info "No hay reportes Garak disponibles. Ejecuta un scan para generar metricas."
    }
} else {
    Show-Info "Directorio Garak no encontrado. Las metricas se importaran cuando ejecutes un scan."
}

# Step 9: Resumen y abrir Grafana
Show-Step "9/9" "Resumen de ejecucion"

$endTime = Get-Date
$duration = $endTime - $startTime
$durationStr = $duration.ToString("mm\:ss")

Write-Host ""
Write-Host "    ================================================================" -ForegroundColor Green
Write-Host "    |          QASL-SENTINEL-UNIFIED - SISTEMA ACTIVO              |" -ForegroundColor Green
Write-Host "    |--------------------------------------------------------------|" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   INFRAESTRUCTURA DOCKER                                     |" -ForegroundColor Green
Write-Host "    |     Prometheus:    http://localhost:9095                     |" -ForegroundColor Green
Write-Host "    |     InfluxDB:      http://localhost:8088                     |" -ForegroundColor Green
Write-Host "    |     Grafana:       http://localhost:3003                     |" -ForegroundColor Green
Write-Host "    |     Pushgateway:   http://localhost:9096                     |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   PROCESOS LOCALES                                            |" -ForegroundColor Green
Write-Host "    |     Backend (APIs):     PID $($backendProcess.Id)                          |" -ForegroundColor Green
Write-Host "    |     Frontend (DOM):     PID $($frontendProcess.Id)                          |" -ForegroundColor Green
Write-Host "    |     INGRID (Chatbot):   PID $($ingridProcess.Id)                          |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   CANALES SATELITE (proyectos externos)                      |" -ForegroundColor Green
if ($apiSentinelOk) {
Write-Host "    |     QASL-API-SENTINEL:  CONECTADO :9091                     |" -ForegroundColor Green
} else {
Write-Host "    |     QASL-API-SENTINEL:  NO DETECTADO                        |" -ForegroundColor DarkYellow
}
if ($mobileSentinelOk) {
Write-Host "    |     QASL-MOBILE:        CONECTADO :8089                     |" -ForegroundColor Green
} else {
Write-Host "    |     QASL-MOBILE:        NO DETECTADO                        |" -ForegroundColor DarkYellow
}
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   CHATBOT INGRID                                             |" -ForegroundColor Green
Write-Host "    |     API:         http://localhost:3100                      |" -ForegroundColor Green
Write-Host "    |     Modelo:      Claude Sonnet 4.5                         |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   CREDENCIALES GRAFANA                                       |" -ForegroundColor Green
Write-Host "    |     Usuario:   admin                                        |" -ForegroundColor Green
Write-Host "    |     Password:  sentinel2024                                 |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    |   Duracion arranque: $durationStr                                 |" -ForegroundColor Green
Write-Host "    |                                                              |" -ForegroundColor Green
Write-Host "    ================================================================" -ForegroundColor Green
Write-Host ""

# Abrir Grafana en el navegador
$openGrafana = Read-Host "Abrir Command Center en el navegador? (S/N)"
if ($openGrafana -eq "S" -or $openGrafana -eq "s" -or $openGrafana -eq "") {
    Start-Process "http://localhost:3003/d/qasl-command-center-unified"
    Show-Success "Abriendo Command Center en el navegador..."
}

Write-Host ""
Write-Host "    Los monitores estan corriendo en segundo plano." -ForegroundColor Cyan
Write-Host "    Las metricas se actualizan automaticamente en Grafana." -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere apagar todo
$stopAll = Read-Host "Apagar todo (Docker + Monitores)? (S/N)"
if ($stopAll -eq "S" -or $stopAll -eq "s") {
    Show-Info "Deteniendo monitores..."

    # Detener procesos locales (los satelites se gestionan desde sus propios proyectos)
    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        Show-Success "Backend Monitor detenido"
    }
    if (-not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
        Show-Success "Frontend Monitor detenido"
    }
    if (-not $ingridProcess.HasExited) {
        Stop-Process -Id $ingridProcess.Id -Force -ErrorAction SilentlyContinue
        Show-Success "INGRID Chatbot detenido"
    }

    Show-Info "Deteniendo Docker..."
    docker-compose down
    Show-Success "Servicios Docker detenidos"
}

Write-Host ""
Write-Host "QASL-SENTINEL-UNIFIED - Epidata Consulting" -ForegroundColor Cyan
Write-Host "AGIP - Buenos Aires Ciudad" -ForegroundColor Gray
Write-Host ""
