#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║           QASL-SENTINEL-UNIFIED - Monitor Orchestrator                      ║
# ║                                                                              ║
# ║  Starts both Backend (API) and Frontend (DOM) monitors simultaneously       ║
# ║  Backend: Prometheus metrics on port 9096                                   ║
# ║  Frontend: InfluxDB metrics on port 8088                                    ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  QASL Sentinel Unified Monitoring"
echo "  Starting both monitors..."
echo "========================================"
echo ""

# Start Backend Monitor (API Sentinel)
echo "[Backend] Starting API Monitor (Prometheus :9097)..."
cd "$SCRIPT_DIR/sentinel-backend" && npm run monitor &
BACKEND_PID=$!
echo "[Backend] PID: $BACKEND_PID"

# Start Frontend Monitor (DOM Sentinel)
echo "[Frontend] Starting DOM Monitor (InfluxDB :8088)..."
cd "$SCRIPT_DIR/sentinel-frontend" && npm run monitor &
FRONTEND_PID=$!
echo "[Frontend] PID: $FRONTEND_PID"

echo ""
echo "========================================"
echo "  Both monitors running."
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo "  Press Ctrl+C to stop."
echo "========================================"

# Handle graceful shutdown
trap "echo ''; echo 'Stopping monitors...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Done.'; exit 0" SIGINT SIGTERM

wait
