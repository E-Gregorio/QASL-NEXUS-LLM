// ============================================================
// MS-00: URLs de todos los microservicios backend
// ============================================================

export const MS_URLS = {
  MS03_FRAMEWORK: process.env.MS03_URL || 'http://localhost:6001',
  MS08_PIPELINE: process.env.MS08_URL || 'http://localhost:8888',
  MS09_LLM: process.env.MS09_URL || 'http://localhost:8000',
  MS10_MCP: process.env.MS10_URL || 'http://localhost:5000',
  MS11_REPORT: process.env.MS11_URL || 'http://localhost:9000',
};
