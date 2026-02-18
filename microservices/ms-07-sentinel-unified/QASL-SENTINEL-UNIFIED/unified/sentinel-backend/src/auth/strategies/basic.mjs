/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          BASIC AUTH STRATEGY                                 ║
 * ║                   Para HTTP Basic Authentication                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export class BasicStrategy {
  constructor(config = {}) {
    this.config = {
      username: config.username || process.env.BASIC_AUTH_USER,
      password: config.password || process.env.BASIC_AUTH_PASS,
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
    const username = api.auth?.basic?.username || this.config.username;
    const password = api.auth?.basic?.password || this.config.password;

    if (!username || !password) {
      return {};
    }

    // Codificar en Base64
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    return {
      'Authorization': `Basic ${credentials}`
    };
  }

  /**
   * Valida las credenciales
   */
  async validate(api) {
    const username = api.auth?.basic?.username || this.config.username;
    const password = api.auth?.basic?.password || this.config.password;

    if (!username || !password) {
      return {
        valid: false,
        message: 'Faltan credenciales Basic Auth (username, password)'
      };
    }

    return {
      valid: true,
      message: 'Basic Auth configurado',
      username: username
    };
  }

  /**
   * Basic Auth no expira
   */
  getTokenLifetime() {
    return Infinity;
  }
}
