/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INGRID AI Testing Framework - REST API Server
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * API REST para ejecutar tests de INGRID remotamente.
 * Permite integración con cualquier sistema externo.
 *
 * Endpoints:
 *   GET  /health          - Estado del servidor
 *   GET  /api/v1/suites   - Lista de suites disponibles
 *   POST /api/v1/run      - Ejecutar tests
 *   GET  /api/v1/jobs/:id - Estado de un job
 *   GET  /api/v1/results  - Últimos resultados
 *   GET  /api/v1/report   - Descargar PDF
 *   GET  /api/v1/metrics  - Métricas actuales
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Estado global
// ═══════════════════════════════════════════════════════════════════════════════
const jobs = new Map(); // Almacena jobs en memoria

const SUITES = {
  all: { name: 'All Tests', command: 'npm test', description: 'Ejecuta todos los tests' },
  functional: { name: 'Functional', command: 'npm run test:chatbot:functional', description: 'Tests funcionales del chatbot' },
  security: { name: 'Security (OWASP)', command: 'npm run test:security', description: 'Tests de seguridad OWASP LLM Top 10' },
  performance: { name: 'Performance', command: 'npm run test:chatbot:performance', description: 'Tests de rendimiento' },
  api: { name: 'API Tests', command: 'npm run test:api', description: 'Tests de API multi-modelo' },
  smoke: { name: 'Smoke', command: 'npm run test:smoke', description: 'Tests rápidos de verificación' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Rutas de archivos
// ═══════════════════════════════════════════════════════════════════════════════
const PATHS = {
  results: path.join(__dirname, '..', 'reports', 'results.json'),
  metrics: path.join(__dirname, '..', 'reports', 'metrics-store.json'),
  reports: path.join(__dirname, '..', 'reports'),
  root: path.join(__dirname, '..')
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utilidades
// ═══════════════════════════════════════════════════════════════════════════════
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  return null;
}

function getLatestPdf() {
  try {
    const files = fs.readdirSync(PATHS.reports)
      .filter(f => f.endsWith('.pdf'))
      .map(f => ({
        name: f,
        path: path.join(PATHS.reports, f),
        time: fs.statSync(path.join(PATHS.reports, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    return files.length > 0 ? files[0] : null;
  } catch (error) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /health
 * Estado del servidor
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'INGRID API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeJobs: [...jobs.values()].filter(j => j.status === 'running').length
  });
});

/**
 * GET /api/v1/suites
 * Lista de suites de tests disponibles
 */
app.get('/api/v1/suites', (req, res) => {
  res.json({
    success: true,
    suites: Object.entries(SUITES).map(([id, suite]) => ({
      id,
      ...suite
    }))
  });
});

/**
 * POST /api/v1/run
 * Ejecutar una suite de tests
 *
 * Body:
 *   - suite: string (all, functional, security, performance, api, smoke)
 *   - chatbotUrl: string (opcional, override de CHATBOT_URL)
 *   - generatePdf: boolean (default: true)
 */
app.post('/api/v1/run', (req, res) => {
  const { suite = 'all', chatbotUrl, generatePdf = true } = req.body;

  // Validar suite
  if (!SUITES[suite]) {
    return res.status(400).json({
      success: false,
      error: `Suite inválida: ${suite}`,
      validSuites: Object.keys(SUITES)
    });
  }

  // Crear job
  const jobId = uuidv4();
  const job = {
    id: jobId,
    suite,
    status: 'running',
    startTime: new Date().toISOString(),
    endTime: null,
    output: [],
    result: null,
    pdfGenerated: false
  };

  jobs.set(jobId, job);

  // Ejecutar tests en background
  const env = { ...process.env };
  if (chatbotUrl) {
    env.CHATBOT_URL = chatbotUrl;
  }

  const testProcess = spawn('npm', ['test'], {
    cwd: PATHS.root,
    env,
    shell: true
  });

  testProcess.stdout.on('data', (data) => {
    job.output.push(data.toString());
  });

  testProcess.stderr.on('data', (data) => {
    job.output.push(data.toString());
  });

  testProcess.on('close', async (code) => {
    job.status = code === 0 ? 'completed' : 'failed';
    job.endTime = new Date().toISOString();
    job.exitCode = code;

    // Leer resultados
    const results = readJsonFile(PATHS.results);
    if (results) {
      job.result = {
        total: results.stats?.expected || 0,
        passed: (results.stats?.expected || 0) - (results.stats?.unexpected || 0) - (results.stats?.skipped || 0),
        failed: results.stats?.unexpected || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0
      };
    }

    // Generar PDF si está habilitado
    if (generatePdf) {
      try {
        const pdfProcess = spawn('npm', ['run', 'pdf'], {
          cwd: PATHS.root,
          shell: true
        });

        pdfProcess.on('close', () => {
          job.pdfGenerated = true;
          const pdf = getLatestPdf();
          if (pdf) {
            job.pdfPath = pdf.name;
          }
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    }
  });

  res.status(202).json({
    success: true,
    message: 'Tests iniciados',
    jobId,
    suite: SUITES[suite].name,
    statusUrl: `/api/v1/jobs/${jobId}`
  });
});

/**
 * GET /api/v1/jobs/:id
 * Estado de un job específico
 */
app.get('/api/v1/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job no encontrado'
    });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      suite: job.suite,
      status: job.status,
      startTime: job.startTime,
      endTime: job.endTime,
      result: job.result,
      pdfGenerated: job.pdfGenerated,
      pdfPath: job.pdfPath
    }
  });
});

/**
 * GET /api/v1/jobs/:id/output
 * Output completo de un job
 */
app.get('/api/v1/jobs/:id/output', (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job no encontrado'
    });
  }

  res.json({
    success: true,
    jobId: job.id,
    status: job.status,
    output: job.output.join('')
  });
});

/**
 * GET /api/v1/jobs
 * Lista todos los jobs
 */
app.get('/api/v1/jobs', (req, res) => {
  const jobList = [...jobs.values()].map(j => ({
    id: j.id,
    suite: j.suite,
    status: j.status,
    startTime: j.startTime,
    endTime: j.endTime,
    result: j.result
  }));

  res.json({
    success: true,
    total: jobList.length,
    jobs: jobList.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
  });
});

/**
 * GET /api/v1/results
 * Últimos resultados de tests
 */
app.get('/api/v1/results', (req, res) => {
  const results = readJsonFile(PATHS.results);

  if (!results) {
    return res.status(404).json({
      success: false,
      error: 'No hay resultados disponibles. Ejecuta tests primero.'
    });
  }

  const stats = results.stats || {};

  res.json({
    success: true,
    summary: {
      total: stats.expected || 0,
      passed: (stats.expected || 0) - (stats.unexpected || 0) - (stats.skipped || 0),
      failed: stats.unexpected || 0,
      skipped: stats.skipped || 0,
      duration: stats.duration || 0,
      passRate: stats.expected > 0
        ? (((stats.expected - stats.unexpected - stats.skipped) / stats.expected) * 100).toFixed(1) + '%'
        : '0%'
    },
    suites: results.suites?.map(s => ({
      title: s.title,
      tests: s.specs?.length || 0
    })) || []
  });
});

/**
 * GET /api/v1/metrics
 * Métricas LLM-as-Judge y OWASP
 */
app.get('/api/v1/metrics', (req, res) => {
  const metrics = readJsonFile(PATHS.metrics);

  if (!metrics) {
    return res.status(404).json({
      success: false,
      error: 'No hay métricas disponibles. Ejecuta tests primero.'
    });
  }

  // Calcular promedios
  const evaluations = metrics.evaluations || [];
  const avgScores = {};

  if (evaluations.length > 0) {
    const scoreKeys = ['relevance', 'accuracy', 'helpfulness', 'safety', 'coherence'];
    scoreKeys.forEach(key => {
      const values = evaluations.map(e => e.scores?.[key]).filter(v => v !== undefined);
      if (values.length > 0) {
        avgScores[key] = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      }
    });
  }

  res.json({
    success: true,
    metrics: {
      totalEvaluations: evaluations.length,
      averageScores: avgScores,
      owaspResults: metrics.owaspResults || {},
      lastUpdated: metrics.lastUpdated || null
    }
  });
});

/**
 * GET /api/v1/report
 * Descargar último PDF generado
 */
app.get('/api/v1/report', (req, res) => {
  const pdf = getLatestPdf();

  if (!pdf) {
    return res.status(404).json({
      success: false,
      error: 'No hay reportes PDF disponibles. Ejecuta: npm run pdf'
    });
  }

  res.download(pdf.path, pdf.name);
});

/**
 * GET /api/v1/report/info
 * Info del último reporte sin descargarlo
 */
app.get('/api/v1/report/info', (req, res) => {
  const pdf = getLatestPdf();

  if (!pdf) {
    return res.status(404).json({
      success: false,
      error: 'No hay reportes PDF disponibles'
    });
  }

  const stats = fs.statSync(pdf.path);

  res.json({
    success: true,
    report: {
      name: pdf.name,
      size: stats.size,
      sizeHuman: (stats.size / 1024).toFixed(1) + ' KB',
      created: stats.mtime.toISOString(),
      downloadUrl: '/api/v1/report'
    }
  });
});

/**
 * DELETE /api/v1/jobs/:id
 * Eliminar un job del historial
 */
app.delete('/api/v1/jobs/:id', (req, res) => {
  const deleted = jobs.delete(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Job no encontrado'
    });
  }

  res.json({
    success: true,
    message: 'Job eliminado'
  });
});

/**
 * POST /api/v1/report/generate
 * Generar nuevo PDF manualmente
 */
app.post('/api/v1/report/generate', (req, res) => {
  const pdfProcess = spawn('npm', ['run', 'pdf'], {
    cwd: PATHS.root,
    shell: true
  });

  let output = '';

  pdfProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pdfProcess.stderr.on('data', (data) => {
    output += data.toString();
  });

  pdfProcess.on('close', (code) => {
    if (code === 0) {
      const pdf = getLatestPdf();
      res.json({
        success: true,
        message: 'PDF generado exitosamente',
        report: pdf ? {
          name: pdf.name,
          downloadUrl: '/api/v1/report'
        } : null
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error generando PDF',
        output
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'GET  /health',
      'GET  /api/v1/suites',
      'POST /api/v1/run',
      'GET  /api/v1/jobs',
      'GET  /api/v1/jobs/:id',
      'GET  /api/v1/jobs/:id/output',
      'GET  /api/v1/results',
      'GET  /api/v1/metrics',
      'GET  /api/v1/report',
      'GET  /api/v1/report/info',
      'POST /api/v1/report/generate'
    ]
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Iniciar servidor
// ═══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   🤖 INGRID API Server v2.0');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   📡 Running on: http://localhost:${PORT}`);
  console.log('   📚 Endpoints:');
  console.log('      GET  /health              - Server status');
  console.log('      GET  /api/v1/suites       - Available test suites');
  console.log('      POST /api/v1/run          - Run tests');
  console.log('      GET  /api/v1/jobs         - List all jobs');
  console.log('      GET  /api/v1/jobs/:id     - Job status');
  console.log('      GET  /api/v1/results      - Latest test results');
  console.log('      GET  /api/v1/metrics      - LLM-as-Judge metrics');
  console.log('      GET  /api/v1/report       - Download PDF report');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

module.exports = app;
