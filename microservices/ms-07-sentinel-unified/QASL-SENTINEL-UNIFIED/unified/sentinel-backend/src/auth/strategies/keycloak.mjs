/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          KEYCLOAK STRATEGY                                   ║
 * ║                 Para autenticación con Keycloak/OIDC                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Muy usado en sistemas gubernamentales y enterprise en Argentina
 */

export class KeycloakStrategy {
  constructor(config = {}) {
    this.config = {
      url: config.url || process.env.KEYCLOAK_URL,
      realm: config.realm || process.env.KEYCLOAK_REALM || 'master',
      clientId: config.clientId || process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.KEYCLOAK_CLIENT_SECRET,
      username: config.username || process.env.KEYCLOAK_USERNAME,
      password: config.password || process.env.KEYCLOAK_PASSWORD,
      grantType: config.grantType || 'client_credentials', // o 'password'
      ...config
    };

    this.currentToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Configura la estrategia
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this.currentToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Obtiene la URL del token endpoint
   */
  getTokenUrl() {
    const baseUrl = this.config.url.replace(/\/$/, '');
    return `${baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;
  }

  /**
   * Obtiene los headers de auth
   */
  async getHeaders(api) {
    // Verificar si necesitamos nuevo token
    if (!this.currentToken || this.isExpired()) {
      await this.fetchToken(api);
    }

    if (!this.currentToken) {
      return {};
    }

    return {
      'Authorization': `Bearer ${this.currentToken}`
    };
  }

  /**
   * Obtiene un nuevo token de Keycloak
   */
  async fetchToken(api) {
    const tokenUrl = this.getTokenUrl();

    // Usar config de la API si existe, sino la config general
    const clientId = api.auth?.keycloak?.clientId || this.config.clientId;
    const clientSecret = api.auth?.keycloak?.clientSecret || this.config.clientSecret;

    if (!this.config.url || !clientId) {
      throw new Error('Keycloak: Faltan credenciales (url, clientId)');
    }

    // Construir body según grant type
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: this.config.grantType
    });

    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }

    // Si es password grant, agregar usuario y password
    if (this.config.grantType === 'password') {
      if (!this.config.username || !this.config.password) {
        throw new Error('Keycloak: Grant type "password" requiere username y password');
      }
      body.append('username', this.config.username);
      body.append('password', this.config.password);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Keycloak: Error obteniendo token: ${error}`);
    }

    const data = await response.json();

    this.currentToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in || 300) * 1000);

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
      this.refreshExpiry = Date.now() + ((data.refresh_expires_in || 1800) * 1000);
    }

    return this.currentToken;
  }

  /**
   * Refresca el token usando refresh_token
   */
  async refresh(api) {
    if (!this.refreshToken || this.isRefreshExpired()) {
      return this.fetchToken(api);
    }

    const tokenUrl = this.getTokenUrl();
    const clientId = api.auth?.keycloak?.clientId || this.config.clientId;
    const clientSecret = api.auth?.keycloak?.clientSecret || this.config.clientSecret;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: clientId
    });

    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      // Si falla refresh, obtener token nuevo
      this.refreshToken = null;
      return this.fetchToken(api);
    }

    const data = await response.json();

    this.currentToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in || 300) * 1000);

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
      this.refreshExpiry = Date.now() + ((data.refresh_expires_in || 1800) * 1000);
    }
  }

  /**
   * Verifica si el token expiró
   */
  isExpired() {
    if (!this.tokenExpiry) return true;
    // Refrescar 30 segundos antes
    return Date.now() > (this.tokenExpiry - 30000);
  }

  /**
   * Verifica si el refresh token expiró
   */
  isRefreshExpired() {
    if (!this.refreshExpiry) return true;
    return Date.now() > this.refreshExpiry;
  }

  /**
   * Valida la conexión con Keycloak
   */
  async validate(api) {
    try {
      // Intentar obtener token
      await this.fetchToken(api);

      // Intentar obtener info del usuario (introspect)
      const userInfo = await this.getUserInfo();

      return {
        valid: true,
        message: 'Keycloak autenticación exitosa',
        expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
        userInfo: userInfo
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  /**
   * Obtiene info del usuario actual
   */
  async getUserInfo() {
    if (!this.currentToken) return null;

    const baseUrl = this.config.url.replace(/\/$/, '');
    const userInfoUrl = `${baseUrl}/realms/${this.config.realm}/protocol/openid-connect/userinfo`;

    try {
      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${this.currentToken}`
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Ignorar errores de userinfo
    }

    return null;
  }

  /**
   * Cierra la sesión en Keycloak
   */
  async logout() {
    if (!this.refreshToken) return;

    const baseUrl = this.config.url.replace(/\/$/, '');
    const logoutUrl = `${baseUrl}/realms/${this.config.realm}/protocol/openid-connect/logout`;

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      refresh_token: this.refreshToken
    });

    if (this.config.clientSecret) {
      body.append('client_secret', this.config.clientSecret);
    }

    try {
      await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
    } finally {
      this.currentToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
    }
  }

  /**
   * Obtiene tiempo de vida del token
   */
  getTokenLifetime() {
    if (this.tokenExpiry) {
      return this.tokenExpiry - Date.now();
    }
    return 300000; // 5 minutos por defecto (Keycloak es corto)
  }
}
