/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      COOKIE/SESSION STRATEGY                                 ║
 * ║              Para sistemas con autenticación basada en cookies               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export class CookieStrategy {
  constructor(config = {}) {
    this.config = {
      loginUrl: config.loginUrl,
      logoutUrl: config.logoutUrl,
      username: config.username || process.env.SESSION_USERNAME,
      password: config.password || process.env.SESSION_PASSWORD,
      usernameField: config.usernameField || 'username',
      passwordField: config.passwordField || 'password',
      cookieName: config.cookieName, // Si no se especifica, usa todas
      ...config
    };

    this.cookies = new Map();
    this.sessionExpiry = null;
  }

  /**
   * Configura la estrategia
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this.cookies.clear();
    this.sessionExpiry = null;
  }

  /**
   * Obtiene los headers de auth (Cookie header)
   */
  async getHeaders(api) {
    // Si no hay cookies, hacer login
    if (this.cookies.size === 0 || this.isExpired()) {
      await this.login(api);
    }

    if (this.cookies.size === 0) {
      return {};
    }

    // Construir Cookie header
    const cookieString = Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');

    return {
      'Cookie': cookieString
    };
  }

  /**
   * Hace login para obtener cookies de sesión
   */
  async login(api) {
    const loginUrl = api.auth?.cookie?.loginUrl || this.config.loginUrl;
    const username = api.auth?.cookie?.username || this.config.username;
    const password = api.auth?.cookie?.password || this.config.password;

    if (!loginUrl) {
      throw new Error('Cookie auth: No se configuró loginUrl');
    }

    if (!username || !password) {
      throw new Error('Cookie auth: Faltan credenciales (username, password)');
    }

    // Construir body de login
    const body = new URLSearchParams({
      [this.config.usernameField]: username,
      [this.config.passwordField]: password
    });

    // Agregar campos extra si existen
    if (this.config.extraFields) {
      for (const [key, value] of Object.entries(this.config.extraFields)) {
        body.append(key, value);
      }
    }

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
      redirect: 'manual' // No seguir redirects para capturar cookies
    });

    // Extraer cookies del response
    const setCookies = response.headers.getSetCookie?.() ||
      response.headers.raw?.()['set-cookie'] || [];

    for (const cookieHeader of setCookies) {
      this.parseCookie(cookieHeader);
    }

    // Si no obtuvimos cookies, puede ser que el login falló
    if (this.cookies.size === 0) {
      // Verificar si es redirect exitoso
      if (response.status >= 300 && response.status < 400) {
        // Login exitoso pero sin cookies en esta response
        // Intentar seguir el redirect
        const location = response.headers.get('location');
        if (location) {
          const followResponse = await fetch(location, {
            redirect: 'manual'
          });
          const moreCookies = followResponse.headers.getSetCookie?.() || [];
          for (const cookieHeader of moreCookies) {
            this.parseCookie(cookieHeader);
          }
        }
      } else if (!response.ok) {
        throw new Error(`Cookie auth: Login falló con status ${response.status}`);
      }
    }

    // Establecer expiración (1 hora por defecto)
    this.sessionExpiry = Date.now() + (this.config.sessionLifetime || 3600000);
  }

  /**
   * Parsea un header Set-Cookie
   */
  parseCookie(cookieHeader) {
    if (!cookieHeader) return;

    // Formato: name=value; Path=/; HttpOnly; etc
    const parts = cookieHeader.split(';');
    const [nameValue] = parts;

    if (!nameValue) return;

    const [name, ...valueParts] = nameValue.split('=');
    const value = valueParts.join('='); // El valor puede contener =

    if (name && value) {
      // Si se especificó un cookie específico, solo guardar ese
      if (this.config.cookieName) {
        if (name.trim() === this.config.cookieName) {
          this.cookies.set(name.trim(), value.trim());
        }
      } else {
        // Guardar todas las cookies (excepto las de tracking)
        const skipCookies = ['_ga', '_gid', 'fbp', '_fbp'];
        if (!skipCookies.includes(name.trim().toLowerCase())) {
          this.cookies.set(name.trim(), value.trim());
        }
      }
    }
  }

  /**
   * Cierra la sesión
   */
  async logout() {
    if (this.config.logoutUrl && this.cookies.size > 0) {
      try {
        await fetch(this.config.logoutUrl, {
          method: 'POST',
          headers: await this.getHeaders({})
        });
      } catch {
        // Ignorar errores de logout
      }
    }

    this.cookies.clear();
    this.sessionExpiry = null;
  }

  /**
   * Refresca la sesión (hace login de nuevo)
   */
  async refresh(api) {
    this.cookies.clear();
    return this.login(api);
  }

  /**
   * Verifica si la sesión expiró
   */
  isExpired() {
    if (!this.sessionExpiry) return true;
    return Date.now() > this.sessionExpiry;
  }

  /**
   * Valida la sesión
   */
  async validate(api) {
    try {
      await this.login(api);

      return {
        valid: true,
        message: 'Session cookie obtenida correctamente',
        cookies: Array.from(this.cookies.keys()),
        expiresAt: this.sessionExpiry ? new Date(this.sessionExpiry).toISOString() : null
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }

  /**
   * Obtiene tiempo de vida de la sesión
   */
  getTokenLifetime() {
    if (this.sessionExpiry) {
      return this.sessionExpiry - Date.now();
    }
    return this.config.sessionLifetime || 3600000;
  }
}
