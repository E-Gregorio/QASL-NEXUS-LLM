/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                           OAUTH2 STRATEGY v2.0                               ║
 * ║              OAuth2 con soporte PKCE (Proof Key for Code Exchange)           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  QASL NEXUS LLM - Elyer Gregorio Maldonado                                   ║
 * ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Flujos soportados:
 * - client_credentials (M2M)
 * - authorization_code (con PKCE)
 * - password (legacy)
 * - refresh_token
 */

import crypto from 'crypto';

export class OAuth2Strategy {
  constructor(config = {}) {
    this.config = {
      // URLs
      tokenUrl: config.tokenUrl || process.env.OAUTH2_TOKEN_URL,
      authorizationUrl: config.authorizationUrl || process.env.OAUTH2_AUTH_URL,

      // Credenciales
      clientId: config.clientId || process.env.OAUTH2_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.OAUTH2_CLIENT_SECRET,

      // Configuración de flujo
      grantType: config.grantType || 'client_credentials',
      scope: config.scope || '',
      redirectUri: config.redirectUri || process.env.OAUTH2_REDIRECT_URI,

      // PKCE
      usePkce: config.usePkce !== false, // Habilitado por defecto
      pkceMethod: config.pkceMethod || 'S256', // S256 o plain

      // Opciones adicionales
      audience: config.audience || process.env.OAUTH2_AUDIENCE,
      resource: config.resource,

      ...config
    };

    this.currentToken = null;
    this.tokenExpiry = null;
    this.refreshToken = null;

    // PKCE state
    this.pkceVerifier = null;
    this.pkceChallenge = null;
  }

  /**
   * Configura la estrategia
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this.currentToken = null;
    this.tokenExpiry = null;
    this.refreshToken = null;
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
   * Genera PKCE code_verifier y code_challenge
   */
  generatePkce() {
    // Generar code_verifier (43-128 caracteres, base64url)
    const verifier = crypto.randomBytes(32).toString('base64url');
    this.pkceVerifier = verifier;

    if (this.config.pkceMethod === 'plain') {
      this.pkceChallenge = verifier;
    } else {
      // S256: SHA256 hash del verifier en base64url
      const hash = crypto.createHash('sha256').update(verifier).digest();
      this.pkceChallenge = hash.toString('base64url');
    }

    return {
      verifier: this.pkceVerifier,
      challenge: this.pkceChallenge,
      method: this.config.pkceMethod
    };
  }

  /**
   * Genera URL de autorización (para authorization_code flow)
   */
  getAuthorizationUrl(options = {}) {
    const authUrl = options.authorizationUrl || this.config.authorizationUrl;
    if (!authUrl) {
      throw new Error('OAuth2: authorizationUrl no configurada');
    }

    const clientId = options.clientId || this.config.clientId;
    const redirectUri = options.redirectUri || this.config.redirectUri;
    const scope = options.scope || this.config.scope;
    const state = options.state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state
    });

    if (scope) {
      params.append('scope', scope);
    }

    if (this.config.audience) {
      params.append('audience', this.config.audience);
    }

    // PKCE
    if (this.config.usePkce) {
      this.generatePkce();
      params.append('code_challenge', this.pkceChallenge);
      params.append('code_challenge_method', this.config.pkceMethod);
    }

    return {
      url: `${authUrl}?${params.toString()}`,
      state,
      pkce: this.config.usePkce ? {
        verifier: this.pkceVerifier,
        challenge: this.pkceChallenge
      } : null
    };
  }

  /**
   * Intercambia authorization code por token (con PKCE)
   */
  async exchangeCode(code, options = {}) {
    const tokenUrl = options.tokenUrl || this.config.tokenUrl;
    const clientId = options.clientId || this.config.clientId;
    const clientSecret = options.clientSecret || this.config.clientSecret;
    const redirectUri = options.redirectUri || this.config.redirectUri;
    const codeVerifier = options.codeVerifier || this.pkceVerifier;

    if (!tokenUrl) {
      throw new Error('OAuth2: tokenUrl no configurada');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri
    });

    // PKCE: agregar code_verifier
    if (this.config.usePkce && codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    // Algunos servidores requieren client_secret incluso con PKCE
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
      const error = await response.text();
      throw new Error(`OAuth2: Error intercambiando code: ${error}`);
    }

    const data = await response.json();
    this.setTokenData(data);

    return {
      accessToken: this.currentToken,
      refreshToken: this.refreshToken,
      expiresAt: this.tokenExpiry
    };
  }

  /**
   * Obtiene un nuevo token (client_credentials o password)
   */
  async fetchToken(api) {
    const tokenUrl = api.auth?.oauth2?.tokenUrl || this.config.tokenUrl;
    const clientId = api.auth?.oauth2?.clientId || this.config.clientId;
    const clientSecret = api.auth?.oauth2?.clientSecret || this.config.clientSecret;
    const grantType = api.auth?.oauth2?.grantType || this.config.grantType;

    if (!tokenUrl || !clientId) {
      throw new Error('OAuth2: Faltan credenciales (tokenUrl, clientId)');
    }

    const body = new URLSearchParams({
      grant_type: grantType,
      client_id: clientId
    });

    // Client credentials requiere client_secret
    if (grantType === 'client_credentials') {
      if (!clientSecret) {
        throw new Error('OAuth2: client_credentials requiere client_secret');
      }
      body.append('client_secret', clientSecret);
    }

    // Password grant
    if (grantType === 'password') {
      const username = api.auth?.oauth2?.username || this.config.username;
      const password = api.auth?.oauth2?.password || this.config.password;

      if (!username || !password) {
        throw new Error('OAuth2: password grant requiere username y password');
      }

      body.append('username', username);
      body.append('password', password);

      if (clientSecret) {
        body.append('client_secret', clientSecret);
      }
    }

    // Scope
    const scope = api.auth?.oauth2?.scope || this.config.scope;
    if (scope) {
      body.append('scope', scope);
    }

    // Audience (Auth0, etc.)
    if (this.config.audience) {
      body.append('audience', this.config.audience);
    }

    // Resource (Azure AD, etc.)
    if (this.config.resource) {
      body.append('resource', this.config.resource);
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
      throw new Error(`OAuth2: Error obteniendo token: ${error}`);
    }

    const data = await response.json();
    this.setTokenData(data);

    return this.currentToken;
  }

  /**
   * Guarda los datos del token
   */
  setTokenData(data) {
    this.currentToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000);

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    // ID token (OIDC)
    if (data.id_token) {
      this.idToken = data.id_token;
    }
  }

  /**
   * Refresca el token
   */
  async refresh(api) {
    if (!this.refreshToken) {
      return this.fetchToken(api);
    }

    const tokenUrl = api.auth?.oauth2?.tokenUrl || this.config.tokenUrl;
    const clientId = api.auth?.oauth2?.clientId || this.config.clientId;
    const clientSecret = api.auth?.oauth2?.clientSecret || this.config.clientSecret;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: clientId
    });

    if (clientSecret) {
      body.append('client_secret', clientSecret);
    }

    try {
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
      this.setTokenData(data);

      return this.currentToken;

    } catch (error) {
      // Fallback a nuevo token
      this.refreshToken = null;
      return this.fetchToken(api);
    }
  }

  /**
   * Revoca el token
   */
  async revokeToken(options = {}) {
    const revokeUrl = options.revokeUrl || this.config.revokeUrl;
    if (!revokeUrl) {
      // Simplemente limpiar localmente
      this.currentToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      return { revoked: true, method: 'local' };
    }

    try {
      const body = new URLSearchParams({
        token: this.currentToken || this.refreshToken,
        client_id: this.config.clientId
      });

      if (this.config.clientSecret) {
        body.append('client_secret', this.config.clientSecret);
      }

      await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      this.currentToken = null;
      this.refreshToken = null;
      this.tokenExpiry = null;

      return { revoked: true, method: 'server' };

    } catch (error) {
      return { revoked: false, error: error.message };
    }
  }

  /**
   * Verifica si el token expiró
   */
  isExpired() {
    if (!this.tokenExpiry) return true;
    // Refrescar 5 minutos antes
    return Date.now() > (this.tokenExpiry - 300000);
  }

  /**
   * Valida la configuración OAuth2
   */
  async validate(api) {
    try {
      await this.fetchToken(api);
      return {
        valid: true,
        message: 'OAuth2 token obtenido correctamente',
        expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
        hasRefreshToken: !!this.refreshToken,
        pkceEnabled: this.config.usePkce
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  /**
   * Obtiene información del token actual
   */
  getTokenInfo() {
    return {
      hasToken: !!this.currentToken,
      hasRefreshToken: !!this.refreshToken,
      isExpired: this.isExpired(),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      expiresIn: this.tokenExpiry ? Math.round((this.tokenExpiry - Date.now()) / 1000) : null,
      pkce: {
        enabled: this.config.usePkce,
        method: this.config.pkceMethod,
        hasVerifier: !!this.pkceVerifier
      }
    };
  }

  /**
   * Obtiene tiempo de vida del token
   */
  getTokenLifetime() {
    if (this.tokenExpiry) {
      return Math.max(0, this.tokenExpiry - Date.now());
    }
    return 3600000; // 1 hora por defecto
  }
}
