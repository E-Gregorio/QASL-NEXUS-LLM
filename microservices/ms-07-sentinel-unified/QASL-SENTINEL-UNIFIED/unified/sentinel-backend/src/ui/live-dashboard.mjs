import blessed from 'blessed';
import contrib from 'blessed-contrib';
import axios from 'axios';
import chalk from 'chalk';

export class LiveDashboard {
  constructor(metricsUrl = 'http://localhost:9092/metrics', refreshRate = 2) {
    this.metricsUrl = metricsUrl;
    this.refreshRate = refreshRate * 1000; // Convert to milliseconds
    this.screen = null;
    this.grid = null;
    this.widgets = {};
    this.data = {
      apis: [],
      metrics: {},
      alerts: [],
      logs: []
    };
  }

  async init() {
    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'QASL-API-SENTINEL - Mission Control Dashboard'
    });

    // Create grid layout
    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });

    this.createWidgets();
    this.setupKeyBindings();

    // Initial data fetch
    await this.fetchMetrics();
    this.updateAllWidgets();

    // Start refresh interval
    this.startRefreshLoop();

    this.screen.render();
  }

  createWidgets() {
    // 1. Status Overview (top-left)
    this.widgets.statusBox = this.grid.set(0, 0, 3, 4, blessed.box, {
      label: ' STATUS OVERVIEW ',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      style: {
        fg: 'white',
        border: { fg: 'cyan' }
      }
    });

    // 2. Latency Heatmap (top-center)
    this.widgets.heatmap = this.grid.set(0, 4, 3, 4, contrib.heatmap, {
      label: ' LATENCY HEATMAP (24H) ',
      border: { type: 'line', fg: 'yellow' },
      style: {
        border: { fg: 'yellow' }
      }
    });

    // 3. Live Logs (top-right)
    this.widgets.logs = this.grid.set(0, 8, 3, 4, contrib.log, {
      label: ' LIVE LOGS ',
      tags: true,
      border: { type: 'line', fg: 'green' },
      style: {
        fg: 'white',
        border: { fg: 'green' }
      }
    });

    // 4. Response Time Graph (middle)
    this.widgets.lineChart = this.grid.set(3, 0, 4, 12, contrib.line, {
      label: ' RESPONSE TIME (LAST 60 MIN) ',
      showNthLabel: 5,
      maxY: 2000,
      border: { type: 'line', fg: 'magenta' },
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black',
        border: { fg: 'magenta' }
      },
      xLabelPadding: 3,
      xPadding: 5,
      showLegend: true,
      legend: { width: 12 }
    });

    // 5. API Status Table (bottom-left)
    this.widgets.table = this.grid.set(7, 0, 5, 8, contrib.table, {
      label: ' API STATUS TABLE ',
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [25, 10, 8, 10, 15]
    });

    // 6. Alerts Panel (bottom-right)
    this.widgets.alerts = this.grid.set(7, 8, 5, 4, blessed.box, {
      label: ' ALERTS ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        bg: 'red'
      },
      border: { type: 'line', fg: 'red' },
      style: {
        fg: 'white',
        border: { fg: 'red' }
      }
    });
  }

  setupKeyBindings() {
    // Quit on Escape, q, or Control-C
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    // Refresh on 'r'
    this.screen.key(['r'], async () => {
      await this.fetchMetrics();
      this.updateAllWidgets();
      this.screen.render();
    });
  }

  async fetchMetrics() {
    try {
      const response = await axios.get(this.metricsUrl, { timeout: 5000 });
      this.parsePrometheusMetrics(response.data);
      this.addLog('INFO', 'Metrics fetched successfully');
    } catch (error) {
      this.addLog('ERROR', `Failed to fetch metrics: ${error.message}`);
    }
  }

  parsePrometheusMetrics(metricsText) {
    const lines = metricsText.split('\n');
    const apis = new Map();

    lines.forEach(line => {
      if (line.startsWith('#') || !line.trim()) return;

      // Parse sentinel_api_up
      if (line.includes('sentinel_api_up')) {
        const match = line.match(/api_name="([^"]+)".*?\} (\d+)/);
        if (match) {
          const [, apiName, status] = match;
          if (!apis.has(apiName)) {
            apis.set(apiName, { name: apiName, status: parseInt(status) });
          } else {
            apis.get(apiName).status = parseInt(status);
          }
        }
      }

      // Parse sentinel_api_response_time_ms
      if (line.includes('sentinel_api_response_time_ms')) {
        const match = line.match(/api_name="([^"]+)".*?\} ([\d.]+)/);
        if (match) {
          const [, apiName, latency] = match;
          if (!apis.has(apiName)) {
            apis.set(apiName, { name: apiName, latency: parseFloat(latency) });
          } else {
            apis.get(apiName).latency = parseFloat(latency);
          }
        }
      }

      // Parse sentinel_api_http_status
      if (line.includes('sentinel_api_http_status')) {
        const match = line.match(/api_name="([^"]+)".*?\} (\d+)/);
        if (match) {
          const [, apiName, httpCode] = match;
          if (!apis.has(apiName)) {
            apis.set(apiName, { name: apiName, httpCode: parseInt(httpCode) });
          } else {
            apis.get(apiName).httpCode = parseInt(httpCode);
          }
        }
      }
    });

    this.data.apis = Array.from(apis.values());
  }

  updateAllWidgets() {
    this.updateStatusOverview();
    this.updateHeatmap();
    this.updateLineChart();
    this.updateTable();
    this.updateAlerts();
    this.screen.render();
  }

  updateStatusOverview() {
    const total = this.data.apis.length;
    const healthy = this.data.apis.filter(api => api.status === 1).length;
    const unhealthy = this.data.apis.filter(api => api.status === 0).length;
    const availability = total > 0 ? ((healthy / total) * 100).toFixed(1) : 0;

    const content = `
  {bold}QASL-API-SENTINEL{/bold}
  Mission Control Dashboard
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {cyan-fg}Total APIs:{/cyan-fg}      ${total}
  {green-fg}✓ Healthy:{/green-fg}      ${healthy}
  {red-fg}✗ Unhealthy:{/red-fg}    ${unhealthy}

  {bold}{${availability >= 99 ? 'green' : availability >= 95 ? 'yellow' : 'red'}-fg}Availability: ${availability}%{/}

  Last Update: ${new Date().toLocaleTimeString()}
  Refresh Rate: ${this.refreshRate / 1000}s

  {gray-fg}Press 'r' to refresh{/gray-fg}
  {gray-fg}Press 'q' to quit{/gray-fg}
    `;

    this.widgets.statusBox.setContent(content);
  }

  updateHeatmap() {
    // Generate mock heatmap data (in real impl, use historical data)
    const data = [];
    for (let y = 0; y < 24; y++) {
      const row = [];
      for (let x = 0; x < 7; x++) {
        // Mock latency data: random between 50-500ms
        row.push(Math.floor(Math.random() * 450) + 50);
      }
      data.push(row);
    }

    this.widgets.heatmap.setData({
      data: data,
      xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      yLabels: Array.from({ length: 24 }, (_, i) => `${i}:00`)
    });
  }

  updateLineChart() {
    // Generate mock line chart data for last 60 minutes
    const series = [];
    const colors = ['green', 'yellow', 'red', 'cyan', 'magenta', 'blue'];

    this.data.apis.slice(0, 6).forEach((api, index) => {
      const points = [];
      const baseLatency = api.latency || 200;

      for (let i = 0; i < 60; i++) {
        // Generate realistic latency variation
        const variation = (Math.random() - 0.5) * 100;
        points.push(Math.max(50, baseLatency + variation));
      }

      series.push({
        title: api.name.substring(0, 20),
        x: Array.from({ length: 60 }, (_, i) => `-${60 - i}m`),
        y: points,
        style: { line: colors[index] }
      });
    });

    if (series.length > 0) {
      this.widgets.lineChart.setData(series);
    }
  }

  updateTable() {
    const headers = ['API Name', 'Status', 'HTTP', 'Latency', 'Last Check'];
    const data = this.data.apis.map(api => {
      const status = api.status === 1 ? '{green-fg}UP{/green-fg}' : '{red-fg}DOWN{/red-fg}';
      const httpCode = api.httpCode || 'N/A';
      const latency = api.latency ? `${api.latency.toFixed(0)}ms` : 'N/A';
      const lastCheck = new Date().toLocaleTimeString();

      return [
        api.name.substring(0, 24),
        status,
        httpCode.toString(),
        latency,
        lastCheck
      ];
    });

    this.widgets.table.setData({
      headers: headers,
      data: data
    });
  }

  updateAlerts() {
    // Generate alerts for unhealthy APIs
    const newAlerts = [];
    this.data.apis.forEach(api => {
      if (api.status === 0) {
        newAlerts.push({
          severity: 'CRITICAL',
          message: `API DOWN: ${api.name}`,
          timestamp: new Date()
        });
      } else if (api.latency && api.latency > 1000) {
        newAlerts.push({
          severity: 'HIGH',
          message: `High latency: ${api.name} (${api.latency.toFixed(0)}ms)`,
          timestamp: new Date()
        });
      }
    });

    // Keep last 10 alerts
    this.data.alerts = [...newAlerts, ...this.data.alerts].slice(0, 10);

    const content = this.data.alerts.map(alert => {
      const color = alert.severity === 'CRITICAL' ? 'red' : 'yellow';
      const time = alert.timestamp.toLocaleTimeString();
      return `{${color}-fg}[${alert.severity}]{/${color}-fg} ${time}\n${alert.message}\n`;
    }).join('\n');

    this.widgets.alerts.setContent(content || '{gray-fg}No alerts{/gray-fg}');
  }

  addLog(level, message) {
    const colors = {
      'INFO': 'green',
      'WARN': 'yellow',
      'ERROR': 'red'
    };

    const color = colors[level] || 'white';
    const timestamp = new Date().toLocaleTimeString();

    this.widgets.logs.log(`{${color}-fg}[${level}]{/${color}-fg} ${timestamp} - ${message}`);
    this.data.logs.push({ level, message, timestamp });
  }

  startRefreshLoop() {
    setInterval(async () => {
      await this.fetchMetrics();
      this.updateAllWidgets();
    }, this.refreshRate);
  }

  async start() {
    await this.init();
  }
}

// CLI Usage
export async function startLiveDashboard(options = {}) {
  const dashboard = new LiveDashboard(
    options.url || 'http://localhost:9092/metrics',
    options.refresh || 2
  );

  await dashboard.start();
}
