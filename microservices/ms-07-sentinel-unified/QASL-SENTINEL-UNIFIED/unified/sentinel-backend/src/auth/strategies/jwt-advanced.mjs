/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       JWT ADVANCED STRATEGY                                  ║
 * ║          JWT con verificación de firma (RS256, HS256, ES256)                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  QASL NEXUS LLM - Elyer Gregorio Maldonado                                   ║
 * ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import crypto from 'crypto';

export class JwtAdvancedStrategy {
  constructor(config = {}) {
    this.config = {
      // Token directo o variable de entorno
      token: config.token || process.env.JWT_TOKEN,
      tokenEnvVar: config.tokenEnvVar || 'JWT_TOKEN',

      // Verificación de firma
      verifySignature: config.verifySignature !== false,
      algorithm: config.algorithm || 'HS256', // HS256, RS256, ES256
      secret: config.secret || process.env.JWT_SECRET,
      publicKey: config.publicKey || process.env.JWT_PUBLIC_KEY,
      jwksUri: config.jwksUri || process.env.JWT_JWKS_URI,

      // Validaciones
      validateExpiry: config.validateExpiry !== false,
      validateIssuer: config.validateIssuer || process.env.JWT_ISSUER,
      validateAudience: config.validateAudience || process.env.JWT_AUDIENCE,
      clockTolerance: config.clockTolerance || 60, // segundos

      // Header config
      headerName: config.headerName || 'Authorization',
      prefix: config.prefix || 'Bearer',

      ...config
    };

    // Cache de claves públicas (JWKS)
    this.jwksCache = new Map();
    this.jwksCacheExpiry = null;
  }

  /**
   * Configura la estrategia
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    this.jwksCache.clear();
  }

  /**
   * Obtiene los headers de auth
   */
  async getHeaders(api) {
    let token = api.auth?.jwt?.token ||
                api.auth?.token ||
                this.config.token ||
                process.env[this.config.tokenEnvVar];

    if (!token) {
      return {};
    }

    // Validar el token antes de usarlo
    if (this.config.verifySignature || this.config.validateExpiry) {
      const validation = await this.validateToken(token, api);
      if (!validation.valid) {
        console.warn(`[JWT] Token inválido: ${validation.message}`);
        // Si el token expiró, podríamos intentar refresh
        if (validation.expired && api.auth?.jwt?.refreshToken) {
          const newToken = await this.refreshToken(api);
          if (newToken) {
            token = newToken;
          }
        }
      }
    }

    return {
      [this.config.headerName]: `${this.config.prefix} ${token}`
    };
  }

  /**
   * Valida un token JWT completo
   */
  async validateToken(token, api = {}) {
    try {
      // Decodificar header y payload
      const decoded = this.decode(token);
      if (!decoded) {
        return { valid: false, message: 'Token mal formado' };
      }

      const { header, payload } = decoded;
      const now = Math.floor(Date.now() / 1000);

      // 1. Validar expiración
      if (this.config.validateExpiry && payload.exp) {
        if (payload.exp < (now - this.config.clockTolerance)) {
          return {
            valid: false,
            message: 'Token expirado',
            expired: true,
            expiredAt: new Date(payload.exp * 1000).toISOString()
          };
        }
      }

      // 2. Validar "not before"
      if (payload.nbf && payload.nbf > (now + this.config.clockTolerance)) {
        return {
          valid: false,
          message: 'Token aún no es válido (nbf)',
          notBefore: new Date(payload.nbf * 1000).toISOString()
        };
      }

      // 3. Validar issuer
      const expectedIssuer = api.auth?.jwt?.issuer || this.config.validateIssuer;
      if (expectedIssuer && payload.iss !== expectedIssuer) {
        return {
          valid: false,
          message: `Issuer inválido: ${payload.iss}`
        };
      }

      // 4. Validar audience
      const expectedAudience = api.auth?.jwt?.audience || this.config.validateAudience;
      if (expectedAudience) {
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!audiences.includes(expectedAudience)) {
          return {
            valid: false,
            message: `Audience inválido: ${payload.aud}`
          };
        }
      }

      // 5. Verificar firma (si está configurado)
      if (this.config.verifySignature) {
        const signatureValid = await this.verifySignature(token, header, api);
        if (!signatureValid) {
          return { valid: false, message: 'Firma inválida' };
        }
      }

      return {
        valid: true,
        message: 'Token válido',
        payload: {
          sub: payload.sub,
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
          iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
          roles: payload.roles || payload.realm_access?.roles || [],
          scope: payload.scope || payload.scp
        },
        expiresIn: payload.exp ? (payload.exp - now) : null
      };

    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * Decodifica un JWT (header + payload)
   */
  decode(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      const signature = parts[2];

      return { header, payload, signature };
    } catch {
      return null;
    }
  }

  /**
   * Verifica la firma del JWT
   */
  async verifySignature(token, header, api = {}) {
    const algorithm = header.alg || this.config.algorithm;
    const parts = token.split('.');
    const signedContent = `${parts[0]}.${parts[1]}`;
    const signature = this.base64UrlToBuffer(parts[2]);

    try {
      switch (algorithm) {
        case 'HS256':
        case 'HS384':
        case 'HS512':
          return this.verifyHMAC(signedContent, signature, algorithm, api);

        case 'RS256':
        case 'RS384':
        case 'RS512':
          return await this.verifyRSA(signedContent, signature, algorithm, header, api);

        case 'ES256':
        case 'ES384':
        case 'ES512':
          return await this.verifyECDSA(signedContent, signature, algorithm, header, api);

        default:
          console.warn(`[JWT] Algoritmo no soportado: ${algorithm}`);
          return false;
      }
    } catch (error) {
      console.error(`[JWT] Error verificando firma: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica firma HMAC (HS256, HS384, HS512)
   */
  verifyHMAC(content, signature, algorithm, api) {
    const secret = api.auth?.jwt?.secret || this.config.secret;
    if (!secret) {
      console.warn('[JWT] No hay secret configurado para HMAC');
      return false;
    }

    const hashAlgo = algorithm.replace('HS', 'sha');
    const expectedSignature = crypto
      .createHmac(hashAlgo, secret)
      .update(content)
      .digest();

    return crypto.timingSafeEqual(signature, expectedSignature);
  }

  /**
   * Verifica firma RSA (RS256, RS384, RS512)
   */
  async verifyRSA(content, signature, algorithm, header, api) {
    const publicKey = await this.getPublicKey(header, api);
    if (!publicKey) {
      console.warn('[JWT] No se pudo obtener clave pública para RSA');
      return false;
    }

    const hashAlgo = algorithm.replace('RS', 'sha');
    const verifier = crypto.createVerify(hashAlgo);
    verifier.update(content);

    return verifier.verify(publicKey, signature);
  }

  /**
   * Verifica firma ECDSA (ES256, ES384, ES512)
   */
  async verifyECDSA(content, signature, algorithm, header, api) {
    const publicKey = await this.getPublicKey(header, api);
    if (!publicKey) {
      console.warn('[JWT] No se pudo obtener clave pública para ECDSA');
      return false;
    }

    const hashAlgo = algorithm.replace('ES', 'sha');
    const verifier = crypto.createVerify(hashAlgo);
    verifier.update(content);

    // ECDSA signature format conversion
    return verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  }

  /**
   * Obtiene la clave pública (de config o JWKS)
   */
  async getPublicKey(header, api) {
    // 1. Clave pública directa
    const directKey = api.auth?.jwt?.publicKey || this.config.publicKey;
    if (directKey) {
      return directKey;
    }

    // 2. JWKS (JSON Web Key Set)
    const jwksUri = api.auth?.jwt?.jwksUri || this.config.jwksUri;
    if (jwksUri && header.kid) {
      return await this.getKeyFromJWKS(jwksUri, header.kid);
    }

    return null;
  }

  /**
   * Obtiene clave de JWKS
   */
  async getKeyFromJWKS(jwksUri, kid) {
    // Verificar cache
    const cached = this.jwksCache.get(kid);
    if (cached && this.jwksCacheExpiry && Date.now() < this.jwksCacheExpiry) {
      return cached;
    }

    try {
      const response = await fetch(jwksUri);
      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`);
      }

      const jwks = await response.json();

      // Buscar la clave correcta
      const key = jwks.keys?.find(k => k.kid === kid);
      if (!key) {
        throw new Error(`Key with kid "${kid}" not found in JWKS`);
      }

      // Convertir JWK a PEM
      const pem = this.jwkToPem(key);

      // Cachear por 1 hora
      this.jwksCache.set(kid, pem);
      this.jwksCacheExpiry = Date.now() + 3600000;

      return pem;

    } catch (error) {
      console.error(`[JWT] Error obteniendo JWKS: ${error.message}`);
      return null;
    }
  }

  /**
   * Convierte JWK a PEM (simplificado para RSA)
   */
  jwkToPem(jwk) {
    if (jwk.kty !== 'RSA') {
      throw new Error(`Tipo de clave no soportado: ${jwk.kty}`);
    }

    // Para RSA, construir PEM desde n y e
    const key = crypto.createPublicKey({
      key: {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e
      },
      format: 'jwk'
    });

    return key.export({ type: 'spki', format: 'pem' });
  }

  /**
   * Refresca el token (si hay refresh_token)
   */
  async refreshToken(api) {
    const refreshToken = api.auth?.jwt?.refreshToken;
    const refreshUrl = api.auth?.jwt?.refreshUrl;

    if (!refreshToken || !refreshUrl) {
      return null;
    }

    try {
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.access_token || data.token;

    } catch {
      return null;
    }
  }

  /**
   * Genera un JWT (para testing)
   */
  generateToken(payload, options = {}) {
    const header = {
      alg: options.algorithm || 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const completePayload = {
      iat: now,
      exp: now + (options.expiresIn || 3600),
      ...payload
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(completePayload));
    const content = `${encodedHeader}.${encodedPayload}`;

    // Firmar
    const secret = options.secret || this.config.secret;
    if (!secret) {
      throw new Error('Se requiere secret para generar JWT');
    }

    const signature = crypto
      .createHmac('sha256', secret)
      .update(content)
      .digest('base64url');

    return `${content}.${signature}`;
  }

  /**
   * Utilidades de encoding
   */
  base64UrlEncode(str) {
    return Buffer.from(str).toString('base64url');
  }

  base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf-8');
  }

  base64UrlToBuffer(str) {
    return Buffer.from(str, 'base64url');
  }

  /**
   * Valida la configuración
   */
  async validate(api) {
    const token = api.auth?.jwt?.token ||
                  api.auth?.token ||
                  this.config.token ||
                  process.env[this.config.tokenEnvVar];

    if (!token) {
      return { valid: false, message: 'No hay token JWT configurado' };
    }

    return await this.validateToken(token, api);
  }

  /**
   * Obtiene tiempo de vida del token
   */
  getTokenLifetime() {
    return this.config.tokenLifetime || 3600000;
  }
}
