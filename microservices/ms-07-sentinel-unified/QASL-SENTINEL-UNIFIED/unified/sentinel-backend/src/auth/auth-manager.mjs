/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                           AUTH MANAGER v2.0                                  ║
 * ║         Sistema Universal de Autenticación para APIs                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata                          ║
 * ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Soporta:
 * - Bearer/JWT Tokens (con verificación de firma)
 * - JWT Advanced (RS256, HS256, ES256, JWKS)
 * - OAuth2/OIDC (con PKCE)
 * - Keycloak
 * - Basic Auth
 * - API Keys
 * - Cookies/Session
 * - AFIP WSAA (Argentina)
 * - Custom headers
 * - Auto-refresh inteligente
 */

import { log } from '../core/banner.mjs';

// Importar estrategias
import { BearerStrategy } from './strategies/bearer.mjs';
import { OAuth2Strategy } from './strategies/oauth2.mjs';
import { KeycloakStrategy } from './strategies/keycloak.mjs';
import { CookieStrategy } from './strategies/cookie-session.mjs';
import { ApiKeyStrategy } from './strategies/api-key.mjs';
import { BasicStrategy } from './strategies/basic.mjs';
import { JwtAdvancedStrategy } from './strategies/jwt-advanced.mjs';

export class AuthManager {
  constructor(config = {}) {
    this.config = config;

    // Registrar estrategias
    this.strategies = {
      bearer: new BearerStrategy(config.strategies?.bearer),
      jwt: new JwtAdvancedStrategy(config.strategies?.jwt),
      'jwt-advanced': new JwtAdvancedStrategy(config.strategies?.jwt),
      oauth2: new OAuth2Strategy(config.strategies?.oauth2),
      keycloak: new KeycloakStrategy(config.strategies?.keycloak),
      cookie: new CookieStrategy(config.strategies?.cookie),
      'api-key': new ApiKeyStrategy(config.strategies?.apiKey),
      basic: new BasicStrategy(config.strategies?.basic)
    };

    // Cache de tokens
    this.tokenCache = new Map();

    // Cache de tokens dinámicos (para dynamic-bearer)
    this.dynamicTokenCache = new Map();

    // Referencia a las APIs cargadas (se setea desde sentinel.mjs)
    this.apis = [];

    // Auto-refresh configuration
    this.autoRefresh = {
      enabled: config.autoRefresh !== false,
      checkIntervalMs: config.refreshCheckInterval || 60000, // 1 minuto
      refreshBeforeExpiryMs: config.refreshBeforeExpiry || 300000 // 5 minutos
    };

    // Iniciar auto-refresh si está habilitado
    if (this.autoRefresh.enabled) {
      this.startAutoRefresh();
    }
  }

  /**
   * Inicia el proceso de auto-refresh de tokens
   */
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshTokens();
    }, this.autoRefresh.checkIntervalMs);

    log('Auto-refresh de tokens iniciado', 'info');
  }

  /**
   * Detiene el auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Verifica y refresca tokens próximos a expirar
   */
  async checkAndRefreshTokens() {
    const now = Date.now();

    for (const [cacheKey, cached] of this.tokenCache.entries()) {
      if (!cached.api || !cached.expiresAt) continue;

      const timeUntilExpiry = cached.expiresAt - now;

      // Si expira pronto, refrescar
      if (timeUntilExpiry > 0 && timeUntilExpiry < this.autoRefresh.refreshBeforeExpiryMs) {
        log(`Auto-refrescando token para: ${cached.api.name || cacheKey}`, 'info');
        await this.refreshToken(cached.api);
      }
    }
  }

  /**
   * Detecta automáticamente el tipo de auth de una API
   */
  detectAuthType(api) {
    const auth = {
      type: 'none',
      detected: [],
      confidence: 0
    };

    // Si ya tiene auth detectado (por importer), usarlo
    if (api.auth && api.auth.type !== 'none') {
      return api.auth;
    }

    const headers = api.headers || {};
    const url = api.url || '';

    // 1. Buscar Authorization header
    const authHeader = Object.entries(headers)
      .find(([k]) => k.toLowerCase() === 'authorization');

    if (authHeader) {
      const [, value] = authHeader;

      if (value.toLowerCase().startsWith('bearer')) {
        auth.type = 'bearer';
        auth.detected.push('Bearer token en header Authorization');
        auth.confidence = 90;
      } else if (value.toLowerCase().startsWith('basic')) {
        auth.type = 'basic';
        auth.detected.push('Basic auth en header Authorization');
        auth.confidence = 90;
      }
    }

    // 2. Buscar API Key headers
    const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey', 'x-auth-token', 'x-access-token'];
    for (const [key, value] of Object.entries(headers)) {
      if (apiKeyHeaders.includes(key.toLowerCase())) {
        auth.type = 'api-key';
        auth.detected.push(`API Key en header: ${key}`);
        auth.headerName = key;
        auth.confidence = 85;
      }
    }

    // 3. Buscar token en URL
    const tokenParams = ['token', 'access_token', 'api_key', 'apikey', 'key'];
    try {
      const urlObj = new URL(url);
      for (const param of tokenParams) {
        if (urlObj.searchParams.has(param)) {
          auth.type = 'url-token';
          auth.detected.push(`Token en URL param: ${param}`);
          auth.paramName = param;
          auth.confidence = 70;
        }
      }
    } catch {
      // URL inválida, ignorar
    }

    // 4. Detectar por patrones de URL
    if (url.includes('oauth') || url.includes('authorize')) {
      auth.detected.push('URL contiene patrones OAuth');
      if (auth.type === 'none') {
        auth.type = 'oauth2';
        auth.confidence = 60;
      }
    }

    if (url.includes('keycloak') || url.includes('/realms/')) {
      auth.type = 'keycloak';
      auth.detected.push('URL contiene patrones Keycloak');
      auth.confidence = 80;
    }

    return auth;
  }

  /**
   * Setea la lista de APIs (llamado desde sentinel.mjs)
   */
  setApis(apis) {
    this.apis = apis || [];
  }

  /**
   * Obtiene un token dinámico de otra API
   * Usado para dynamic-bearer donde una API depende del token de otra
   */
  async getDynamicToken(tokenFromApiId, tokenPath) {
    // Verificar cache primero
    const cacheKey = `dynamic_${tokenFromApiId}`;
    const cached = this.dynamicTokenCache.get(cacheKey);

    if (cached && !this.isExpired(cached)) {
      return cached.token;
    }

    // Buscar la API fuente del token
    const tokenApi = this.apis.find(a => a.id === tokenFromApiId);
    if (!tokenApi) {
      log(`API fuente de token no encontrada: ${tokenFromApiId}`, 'error');
      return null;
    }

    try {
      // Hacer request a la API de token
      const response = await fetch(tokenApi.url, {
        method: tokenApi.method || 'POST',
        headers: tokenApi.headers || {},
        body: tokenApi.body?.data ? JSON.stringify(tokenApi.body.data) : undefined
      });

      if (!response.ok) {
        log(`Error obteniendo token de ${tokenFromApiId}: ${response.status}`, 'error');
        return null;
      }

      const data = await response.json();

      // Extraer token del path especificado (ej: "accessToken" o "data.token")
      const token = this.extractFromPath(data, tokenPath);

      if (!token) {
        log(`Token no encontrado en path: ${tokenPath}`, 'error');
        return null;
      }

      // Guardar en cache (30 minutos por defecto para tokens SADE)
      this.dynamicTokenCache.set(cacheKey, {
        token,
        timestamp: Date.now(),
        expiresIn: 1800000, // 30 minutos
        expiresAt: Date.now() + 1800000
      });

      log(`Token dinámico obtenido de ${tokenFromApiId}`, 'success');
      return token;

    } catch (error) {
      log(`Error obteniendo token dinámico: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Extrae un valor de un objeto usando un path (ej: "data.accessToken")
   */
  extractFromPath(obj, path) {
    if (!path || !obj) return null;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }

    return current;
  }

  /**
   * Obtiene headers de autenticación para una API
   */
  async getAuthHeaders(api) {
    const authType = api.auth?.type || 'none';

    if (authType === 'none') {
      return {};
    }

    // Soporte para dynamic-bearer (token obtenido de otra API)
    if (authType === 'dynamic-bearer') {
      const { tokenFrom, tokenPath } = api.auth;

      if (!tokenFrom) {
        log(`dynamic-bearer requiere tokenFrom para ${api.name}`, 'error');
        return {};
      }

      const token = await this.getDynamicToken(tokenFrom, tokenPath || 'accessToken');

      if (token) {
        return { 'Authorization': `Bearer ${token}` };
      }

      return {};
    }

    const strategy = this.strategies[authType];
    if (!strategy) {
      log(`Estrategia de auth no encontrada: ${authType}`, 'warning');
      return {};
    }

    try {
      // Verificar cache
      const cacheKey = this.getCacheKey(api);
      const cached = this.tokenCache.get(cacheKey);

      if (cached && !this.isExpired(cached)) {
        return cached.headers;
      }

      // Obtener nuevos headers
      const headers = await strategy.getHeaders(api);

      // Guardar en cache con información de expiración
      const expiresIn = strategy.getTokenLifetime?.() || 3600000; // 1 hora por defecto
      this.tokenCache.set(cacheKey, {
        headers,
        api,
        timestamp: Date.now(),
        expiresIn,
        expiresAt: Date.now() + expiresIn
      });

      return headers;

    } catch (error) {
      log(`Error obteniendo auth headers: ${error.message}`, 'error');
      return {};
    }
  }

  /**
   * Refresca el token de una API
   */
  async refreshToken(api) {
    const authType = api.auth?.type || 'none';
    const strategy = this.strategies[authType];

    if (!strategy || !strategy.refresh) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(api);

      // Eliminar de cache
      this.tokenCache.delete(cacheKey);

      // Refrescar
      await strategy.refresh(api);

      log(`Token refrescado para ${api.name}`, 'success');
      return true;

    } catch (error) {
      log(`Error refrescando token: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Valida que el auth esté funcionando
   */
  async validateAuth(api) {
    const authType = api.auth?.type || 'none';
    const strategy = this.strategies[authType];

    if (!strategy) {
      return { valid: true, message: 'Sin autenticación configurada' };
    }

    try {
      const headers = await this.getAuthHeaders(api);

      if (Object.keys(headers).length === 0 && authType !== 'none') {
        return {
          valid: false,
          message: 'No se pudieron obtener headers de auth'
        };
      }

      // Si la estrategia tiene validación propia
      if (strategy.validate) {
        return await strategy.validate(api);
      }

      return { valid: true, message: 'Auth configurado correctamente' };

    } catch (error) {
      return {
        valid: false,
        message: `Error validando auth: ${error.message}`
      };
    }
  }

  /**
   * Genera clave de cache
   */
  getCacheKey(api) {
    return `${api.id || api.url}_${api.auth?.type || 'none'}`;
  }

  /**
   * Verifica si un token en cache expiró
   */
  isExpired(cached) {
    if (!cached.timestamp || !cached.expiresIn) {
      return true;
    }

    const now = Date.now();
    const expiresAt = cached.timestamp + cached.expiresIn;

    // Refrescar 5 minutos antes de expirar
    return now > (expiresAt - 300000);
  }

  /**
   * Limpia el cache de tokens
   */
  clearCache() {
    this.tokenCache.clear();
    log('Cache de tokens limpiado', 'info');
  }

  /**
   * Obtiene estadísticas del auth manager
   */
  getStats() {
    const tokenStats = [];
    for (const [key, cached] of this.tokenCache.entries()) {
      const timeUntilExpiry = cached.expiresAt ? cached.expiresAt - Date.now() : null;
      tokenStats.push({
        key,
        api: cached.api?.name || 'unknown',
        expiresIn: timeUntilExpiry ? Math.round(timeUntilExpiry / 1000) + 's' : 'N/A',
        isExpired: timeUntilExpiry ? timeUntilExpiry <= 0 : true
      });
    }

    return {
      cachedTokens: this.tokenCache.size,
      tokenDetails: tokenStats,
      strategies: Object.keys(this.strategies),
      autoRefresh: this.autoRefresh,
      supportedTypes: [
        'bearer', 'jwt', 'jwt-advanced', 'oauth2', 'keycloak',
        'cookie', 'api-key', 'basic', 'dynamic-bearer', 'none'
      ]
    };
  }

  /**
   * Configura una estrategia específica
   */
  configureStrategy(type, config) {
    if (this.strategies[type]) {
      this.strategies[type].configure(config);
      log(`Estrategia ${type} configurada`, 'info');
    }
  }

  /**
   * Analiza el patrón de autenticación de múltiples APIs
   */
  analyzeAuthPatterns(apis) {
    const patterns = {
      types: {},
      needsConfig: [],
      summary: []
    };

    for (const api of apis) {
      const auth = this.detectAuthType(api);
      const type = auth.type;

      patterns.types[type] = (patterns.types[type] || 0) + 1;

      if (auth.confidence < 70 && type !== 'none') {
        patterns.needsConfig.push({
          api: api.name || api.url,
          detected: type,
          confidence: auth.confidence
        });
      }
    }

    // Generar resumen
    for (const [type, count] of Object.entries(patterns.types)) {
      patterns.summary.push(`${type}: ${count} APIs`);
    }

    return patterns;
  }
}
