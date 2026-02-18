/**
 * ============================================================================
 *                         WEBHOOK MANAGER
 *                   Notificaciones en Tiempo Real
 * ============================================================================
 * Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata
 * Lider Tecnico QA: Elyer Gregorio Maldonado
 * ============================================================================
 */

import { log } from '../../core/banner.mjs';

export class WebhookManager {
  constructor(options = {}) {
    this.webhooks = options.webhooks || [];
    this.config = options.config;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;

    // Cargar webhooks de config si existe
    this.loadWebhooks();
  }

  /**
   * Carga webhooks desde configuracion
   */
  loadWebhooks() {
    if (this.config) {
      const savedWebhooks = this.config.get('webhooks') || [];
      this.webhooks = [...this.webhooks, ...savedWebhooks];
    }

    // Agregar webhook de env si existe
    if (process.env.WEBHOOK_URL) {
      this.webhooks.push({
        id: 'env-webhook',
        url: process.env.WEBHOOK_URL,
        events: ['all'],
        active: true
      });
    }
  }

  /**
   * Registra un nuevo webhook
   */
  register(webhook) {
    const newWebhook = {
      id: webhook.id || `webhook-${Date.now()}`,
      url: webhook.url,
      events: webhook.events || ['all'],
      headers: webhook.headers || {},
      active: webhook.active !== false,
      createdAt: new Date().toISOString()
    };

    this.webhooks.push(newWebhook);

    // Guardar en config
    if (this.config) {
      this.config.set('webhooks', this.webhooks);
    }

    log(`Webhook registrado: ${newWebhook.id}`, 'success');
    return newWebhook;
  }

  /**
   * Elimina un webhook
   */
  unregister(webhookId) {
    const index = this.webhooks.findIndex(w => w.id === webhookId);
    if (index !== -1) {
      this.webhooks.splice(index, 1);

      if (this.config) {
        this.config.set('webhooks', this.webhooks);
      }

      log(`Webhook eliminado: ${webhookId}`, 'info');
      return true;
    }
    return false;
  }

  /**
   * Envia notificacion a todos los webhooks suscritos al evento
   */
  async notify(event, data) {
    const eligibleWebhooks = this.webhooks.filter(w =>
      w.active && (w.events.includes('all') || w.events.includes(event))
    );

    if (eligibleWebhooks.length === 0) {
      return;
    }

    const payload = this.buildPayload(event, data);
    const results = [];

    for (const webhook of eligibleWebhooks) {
      try {
        const result = await this.send(webhook, payload);
        results.push({ webhook: webhook.id, success: true, result });
      } catch (error) {
        results.push({ webhook: webhook.id, success: false, error: error.message });
        log(`Error enviando webhook ${webhook.id}: ${error.message}`, 'error');
      }
    }

    return results;
  }

  /**
   * Construye el payload del webhook
   */
  buildPayload(event, data) {
    return {
      event,
      timestamp: new Date().toISOString(),
      source: 'QASL-API-SENTINEL',
      project: 'SIGMA',
      client: 'AGIP',
      data
    };
  }

  /**
   * Envia webhook con reintentos
   */
  async send(webhook, payload) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'QASL-API-SENTINEL/1.0',
            'X-Webhook-Event': payload.event,
            ...webhook.headers
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return { status: response.status, attempt };
      } catch (error) {
        lastError = error;

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =========================================================================
  // EVENTOS ESPECIFICOS
  // =========================================================================

  /**
   * Notifica cuando una API cae
   */
  async notifyApiDown(api, result) {
    return this.notify('api.down', {
      api: {
        id: api.id,
        name: api.name,
        url: api.url,
        method: api.method
      },
      status: result.status,
      error: result.error,
      latency: result.latency,
      message: `API CAIDA: ${api.name} - Status ${result.status}`
    });
  }

  /**
   * Notifica cuando una API se recupera
   */
  async notifyApiUp(api, result, downtime) {
    return this.notify('api.up', {
      api: {
        id: api.id,
        name: api.name,
        url: api.url,
        method: api.method
      },
      status: result.status,
      latency: result.latency,
      downtime,
      message: `API RECUPERADA: ${api.name} - Tiempo caida: ${this.formatDuration(downtime)}`
    });
  }

  /**
   * Notifica cuando hay alta latencia
   */
  async notifyHighLatency(api, result, threshold) {
    return this.notify('api.slow', {
      api: {
        id: api.id,
        name: api.name,
        url: api.url,
        method: api.method
      },
      latency: result.latency,
      threshold,
      message: `LATENCIA ALTA: ${api.name} - ${result.latency}ms (umbral: ${threshold}ms)`
    });
  }

  /**
   * Notifica cuando hay multiples fallos consecutivos
   */
  async notifyConsecutiveFailures(api, count, threshold) {
    return this.notify('api.consecutive_failures', {
      api: {
        id: api.id,
        name: api.name,
        url: api.url
      },
      failureCount: count,
      threshold,
      message: `ALERTA: ${api.name} - ${count} fallos consecutivos`
    });
  }

  /**
   * Notifica resumen diario
   */
  async notifyDailySummary(summary) {
    return this.notify('report.daily', {
      summary,
      message: `Resumen diario: ${summary.healthy}/${summary.total} APIs saludables`
    });
  }

  /**
   * Formatea duracion en formato legible
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
  }

  /**
   * Lista webhooks registrados
   */
  list() {
    return this.webhooks.map(w => ({
      id: w.id,
      url: w.url.substring(0, 50) + '...',
      events: w.events,
      active: w.active
    }));
  }
}
