// ============================================================
// MS-08: URLs de todos los microservicios
// El director de orquesta necesita saber donde esta cada MS
// ============================================================

export const MS_URLS = {
  MS02_STATIC: process.env.MS02_URL || 'http://localhost:4000',
  MS03_FRAMEWORK: process.env.MS03_URL || 'http://localhost:6001',
  MS04_MOBILE: process.env.MS04_URL || 'http://localhost:7500',
  MS06_GARAK: process.env.MS06_URL || 'http://localhost:7600',
  MS09_LLM: process.env.MS09_URL || 'http://localhost:8000',
  MS10_MCP: process.env.MS10_URL || 'http://localhost:5000',
  MS11_REPORT: process.env.MS11_URL || 'http://localhost:9000',
};
