import { WebSocketServer, WebSocket } from 'ws';
import { execSync } from 'child_process';
import * as http from 'http';

export interface StreamerConfig {
  port: number;
  fps: number;
  quality: number;
  width: number;
  height: number;
}

const DEFAULT_CONFIG: StreamerConfig = {
  port: 8765,
  fps: 15,
  quality: 80,
  width: 360,
  height: 640
};

export class ScreenStreamer {
  private config: StreamerConfig;
  private wss: WebSocketServer | null = null;
  private httpServer: http.Server | null = null;
  private clients: Set<WebSocket> = new Set();
  private isStreaming: boolean = false;
  private frameInterval: NodeJS.Timeout | null = null;
  private lastFrame: Buffer | null = null;

  constructor(config: Partial<StreamerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    // Create HTTP server for serving the viewer page
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/viewer') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getViewerHTML());
      } else if (req.url === '/stream') {
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(this.getEmbedHTML());
      } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          streaming: this.isStreaming,
          clients: this.clients.size
        }));
      } else if (req.url === '/frame' || req.url === '/frame.png') {
        // Return last captured frame as PNG image (for Grafana iframe)
        if (this.lastFrame) {
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          res.end(this.lastFrame);
        } else {
          // Capture a fresh frame if none available
          this.captureFrame().then(frame => {
            if (frame) {
              this.lastFrame = frame;
              res.writeHead(200, {
                'Content-Type': 'image/png',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              });
              res.end(frame);
            } else {
              res.writeHead(503);
              res.end('No frame available');
            }
          });
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📱 New client connected to stream');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('📱 Client disconnected from stream');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Start streaming if not already
      if (!this.isStreaming) {
        this.startCapture();
      }
    });

    return new Promise((resolve) => {
      this.httpServer!.listen(this.config.port, () => {
        console.log(`\n╔════════════════════════════════════════════════════════╗`);
        console.log(`║  📺 QASL-MOBILE Screen Streamer                        ║`);
        console.log(`╠════════════════════════════════════════════════════════╣`);
        console.log(`║  HTTP Server: http://localhost:${this.config.port}                  ║`);
        console.log(`║  WebSocket:   ws://localhost:${this.config.port}                    ║`);
        console.log(`║  Viewer:      http://localhost:${this.config.port}/viewer           ║`);
        console.log(`║  Embed URL:   http://localhost:${this.config.port}/stream           ║`);
        console.log(`║  FPS:         ${this.config.fps}                                      ║`);
        console.log(`║  Quality:     ${this.config.quality}%                                    ║`);
        console.log(`╚════════════════════════════════════════════════════════╝\n`);
        resolve();
      });
    });
  }

  private async startCapture(): Promise<void> {
    if (this.isStreaming) return;
    this.isStreaming = true;

    console.log('📸 Starting screen capture...');

    // Capture frames at specified FPS
    const frameDelay = Math.floor(1000 / this.config.fps);

    this.frameInterval = setInterval(async () => {
      if (this.clients.size === 0) {
        return; // Don't capture if no clients
      }

      try {
        const frame = await this.captureFrame();
        if (frame) {
          this.lastFrame = frame;  // Store for /frame endpoint
          this.broadcastFrame(frame);
        }
      } catch (error) {
        // Silently continue on capture errors
      }
    }, frameDelay);
  }

  private captureFrame(): Promise<Buffer | null> {
    return new Promise((resolve) => {
      try {
        // Use execSync for more reliable Windows capture
        const buffer = execSync('adb exec-out screencap -p', {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large screens
          timeout: 2000,
          windowsHide: true
        });

        if (buffer && buffer.length > 0) {
          resolve(buffer);
        } else {
          resolve(null);
        }
      } catch (error) {
        resolve(null);
      }
    });
  }

  private broadcastFrame(frame: Buffer): void {
    const base64Frame = frame.toString('base64');
    const message = JSON.stringify({
      type: 'frame',
      data: base64Frame,
      timestamp: Date.now()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async stop(): Promise<void> {
    this.isStreaming = false;

    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    this.clients.forEach((client) => client.close());
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }

    console.log('📺 Screen streamer stopped');
  }

  private getViewerHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QASL-MOBILE | Device Stream</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      color: #667eea;
      margin-bottom: 5px;
    }
    .header p {
      color: #98c1d9;
      font-size: 12px;
    }
    .device-frame {
      background: #1e1e1e;
      border-radius: 30px;
      padding: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      position: relative;
    }
    .device-screen {
      background: #000;
      border-radius: 20px;
      overflow: hidden;
      position: relative;
    }
    #stream {
      display: block;
      max-width: ${this.config.width}px;
      max-height: ${this.config.height}px;
      width: auto;
      height: auto;
    }
    .status {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 11px;
      font-weight: 600;
    }
    .status.connected { background: #73BF69; color: #000; }
    .status.disconnected { background: #F2495C; color: #fff; }
    .status.connecting { background: #FF9830; color: #000; }
    .stats {
      margin-top: 15px;
      display: flex;
      gap: 20px;
      justify-content: center;
      font-size: 12px;
      color: #98c1d9;
    }
    .stats span { display: flex; align-items: center; gap: 5px; }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #3d5a80;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>QASL-MOBILE Device Stream</h1>
    <p>Powered by Elyer Gregorio Maldonado - Lider Tecnico QA</p>
  </div>

  <div class="device-frame">
    <span class="status connecting" id="status">Connecting...</span>
    <div class="device-screen">
      <img id="stream" alt="Device Stream" />
    </div>
  </div>

  <div class="stats">
    <span id="fps">FPS: --</span>
    <span id="latency">Latency: --ms</span>
    <span id="frames">Frames: 0</span>
  </div>

  <div class="footer">
    QASL-MOBILE v1.0.0 | Real-time Device Streaming
  </div>

  <script>
    const img = document.getElementById('stream');
    const status = document.getElementById('status');
    const fpsEl = document.getElementById('fps');
    const latencyEl = document.getElementById('latency');
    const framesEl = document.getElementById('frames');

    let frameCount = 0;
    let lastFrameTime = Date.now();
    let fps = 0;

    function connect() {
      const ws = new WebSocket('ws://' + window.location.host);

      ws.onopen = () => {
        status.textContent = 'Live';
        status.className = 'status connected';
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'frame') {
          img.src = 'data:image/png;base64,' + data.data;

          // Update stats
          frameCount++;
          const now = Date.now();
          const latency = now - data.timestamp;

          if (now - lastFrameTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFrameTime = now;
            fpsEl.textContent = 'FPS: ' + fps;
          }

          latencyEl.textContent = 'Latency: ' + latency + 'ms';
          framesEl.textContent = 'Frames: ' + frameCount;
        }
      };

      ws.onclose = () => {
        status.textContent = 'Disconnected';
        status.className = 'status disconnected';
        setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        status.textContent = 'Error';
        status.className = 'status disconnected';
      };
    }

    connect();
  </script>
</body>
</html>`;
  }

  private getEmbedHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Device Stream</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
    }
    .container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #stream {
      max-width: 100%;
      max-height: calc(100vh - 40px);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 8px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      font-family: -apple-system, sans-serif;
    }
    .live { background: #73BF69; color: #000; }
    .offline { background: #F2495C; color: #fff; }
    .fps { background: rgba(0,0,0,0.7); color: #fff; }
    .placeholder {
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #667eea;
      font-family: -apple-system, sans-serif;
    }
    .placeholder h2 { font-size: 18px; margin-bottom: 10px; }
    .placeholder p { font-size: 12px; color: #98c1d9; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="overlay">
      <span class="badge offline" id="status">Connecting</span>
      <span class="badge fps" id="fps">-- FPS</span>
    </div>
    <img id="stream" class="hidden" alt="Device" />
    <div id="placeholder" class="placeholder">
      <h2>QASL-MOBILE</h2>
      <p>Waiting for device stream...</p>
    </div>
  </div>
  <script>
    const img = document.getElementById('stream');
    const placeholder = document.getElementById('placeholder');
    const status = document.getElementById('status');
    const fpsEl = document.getElementById('fps');
    let frameCount = 0, lastTime = Date.now();

    function connect() {
      const ws = new WebSocket('ws://' + window.location.host);
      ws.onopen = () => {
        status.textContent = 'LIVE';
        status.className = 'badge live';
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'frame') {
          img.src = 'data:image/png;base64,' + data.data;
          img.classList.remove('hidden');
          placeholder.classList.add('hidden');
          frameCount++;
          if (Date.now() - lastTime >= 1000) {
            fpsEl.textContent = frameCount + ' FPS';
            frameCount = 0;
            lastTime = Date.now();
          }
        }
      };
      ws.onclose = () => {
        status.textContent = 'OFFLINE';
        status.className = 'badge offline';
        setTimeout(connect, 2000);
      };
    }
    connect();
  </script>
</body>
</html>`;
  }
}

// CLI entry point
if (require.main === module) {
  const streamer = new ScreenStreamer();

  streamer.start().catch((error) => {
    console.error('Failed to start streamer:', error);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await streamer.stop();
    process.exit(0);
  });
}
