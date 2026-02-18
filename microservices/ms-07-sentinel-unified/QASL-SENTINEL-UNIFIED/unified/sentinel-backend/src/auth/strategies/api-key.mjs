/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                           API KEY STRATEGY                                   ║
 * ║                    Para autenticación con API Keys                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export class ApiKeyStrategy {
  constructor(config = {}) {
    this.config = {
      key: config.key || process.env.API_KEY,
      headerName: config.headerName || 'X-API-Key',
      queryParam: config.queryParam, // Si se usa en query string
      location: config.location || 'header', // 'header' o 'query'
      ...config
    };
  }

  /**
   * Configura la estrategia
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtiene los headers de auth
   */
  async getHeaders(api) {
    const key = api.auth?.apiKey?.key || this.config.key;

    if (!key) {
      return {};
    }

    // Si la API Key va en header
    const location = api.auth?.apiKey?.in || this.config.location;

    if (location === 'header') {
      const headerName = api.auth?.apiKey?.name ||
        api.auth?.apiKey?.headerName ||
        this.config.headerName;

      return {
        [headerName]: key
      };
    }

    // Si va en query, no retornamos header pero marcamos que hay que modificar la URL
    return {};
  }

  /**
   * Obtiene la URL modificada con API Key en query string
   */
  getUrlWithKey(url, api) {
    const key = api.auth?.apiKey?.key || this.config.key;
    const location = api.auth?.apiKey?.in || this.config.location;

    if (!key || location !== 'query') {
      return url;
    }

    const paramName = api.auth?.apiKey?.name ||
      api.auth?.apiKey?.queryParam ||
      this.config.queryParam ||
      'api_key';

    const urlObj = new URL(url);
    urlObj.searchParams.set(paramName, key);

    return urlObj.toString();
  }

  /**
   * Valida la API Key
   */
  async validate(api) {
    const key = api.auth?.apiKey?.key || this.config.key;

    if (!key) {
      return {
        valid: false,
        message: 'No hay API Key configurada'
      };
    }

    return {
      valid: true,
      message: 'API Key configurada',
      location: api.auth?.apiKey?.in || this.config.location,
      headerName: this.config.headerName
    };
  }

  /**
   * Las API Keys no expiran (generalmente)
   */
  getTokenLifetime() {
    return Infinity;
  }
}
