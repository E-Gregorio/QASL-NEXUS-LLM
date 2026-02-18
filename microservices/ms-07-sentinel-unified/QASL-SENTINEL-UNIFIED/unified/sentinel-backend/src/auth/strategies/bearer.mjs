/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         BEARER TOKEN STRATEGY                                ║
 * ║                    Para JWT y Bearer tokens simples                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export class BearerStrategy {
  constructor(config = {}) {
    this.config = {
      tokenEnvVar: 'DEFAULT_BEARER_TOKEN',
      headerName: 'Authorization',
      prefix: 'Bearer',
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
    let token = null;

    // 1. Token específico de la API
    if (api.auth?.token) {
      token = api.auth.token;
    }
    // 2. Token del config
    else if (this.config.token) {
      token = this.config.token;
    }
    // 3. Token de variable de entorno
    else if (this.config.tokenEnvVar) {
      token = process.env[this.config.tokenEnvVar];
    }

    if (!token) {
      return {};
    }

    // Construir header
    const headerValue = this.config.prefix ?
      `${this.config.prefix} ${token}` : token;

    return {
      [this.config.headerName]: headerValue
    };
  }

  /**
   * Valida el token (decode JWT si es posible)
   */
  async validate(api) {
    const headers = await this.getHeaders(api);
    const authHeader = headers[this.config.headerName];

    if (!authHeader) {
      return { valid: false, message: 'No hay token configurado' };
    }

    // Extraer token
    const token = authHeader.replace(`${this.config.prefix} `, '');

    // Si es JWT, intentar decodificar
    if (this.isJwt(token)) {
      try {
        const payload = this.decodeJwt(token);

        // Verificar expiración
        if (payload.exp) {
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            return {
              valid: false,
              message: 'Token JWT expirado',
              expiredAt: new Date(payload.exp * 1000).toISOString()
            };
          }
        }

        return {
          valid: true,
          message: 'Token JWT válido',
          payload: {
            sub: payload.sub,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
            iss: payload.iss
          }
        };

      } catch (error) {
        return { valid: false, message: `Error decodificando JWT: ${error.message}` };
      }
    }

    // Token no-JWT, solo verificar que existe
    return { valid: true, message: 'Token presente (no-JWT)' };
  }

  /**
   * Verifica si es un JWT
   */
  isJwt(token) {
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Decodifica un JWT (sin verificar firma)
   */
  decodeJwt(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token no es JWT válido');
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  /**
   * Obtiene el tiempo de vida del token
   */
  getTokenLifetime() {
    // Por defecto 1 hora, pero si tenemos el JWT podemos calcularlo
    return this.config.tokenLifetime || 3600000;
  }
}
