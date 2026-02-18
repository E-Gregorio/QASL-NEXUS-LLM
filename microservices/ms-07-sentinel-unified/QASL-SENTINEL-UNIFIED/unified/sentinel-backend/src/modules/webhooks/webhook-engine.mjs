/**
 * Webhook Engine - Motor de webhooks para integraciones
 *
 * Envía notificaciones a servicios externos cuando ocurren eventos:
 * - APIs caídas/recuperadas
 * - Alertas de seguridad
 * - Anomalías detectadas
 * - Predicciones de fallos
 * - Reportes generados
 */

export class WebhookEngine {
  constructor(config = {}) {
    this.config = {
      // Timeouts
      timeout: config.timeout || 30000,
      retryCount: config.retryCount || 3,
      retryDelay: config.retryDelay || 5000,

      // Rate limiting
      maxRequestsPerMinute: config.maxRequestsPerMinute || 60,

      // Headers por defecto
      defaultHeaders: {
        'Content-Type': 'application/json',
        'User-Agent': 'QASL-Webhook-Engine/1.0',
        ...config.defaultHeaders
      },

      // Secret para firmar payloads
      secret: config.secret || process.env.WEBHOOK_SECRET,

      ...config
    };

    // Webhooks registrados
    this.webhooks = new Map();

    // Cola de envío
    this.queue = [];
    this.processing = false;

    // Historial de envíos
    this.deliveryHistory = [];

    // Rate limiting
    this.requestCount = 0;
    this.lastReset = Date.now();

    // Iniciar procesamiento de cola
    this.startQueueProcessor();
  }

  /**
   * Registra un nuevo webhook
   */
  register(webhook) {
    const id = webhook.id || this.generateId();

    const registeredWebhook = {
      id,
      name: webhook.name || `Webhook ${id}`,
      url: webhook.url,
      events: webhook.events || ['*'],
      headers: webhook.headers || {},
      secret: webhook.secret,
      enabled: webhook.enabled !== false,
      format: webhook.format || 'json', // json, slack, discord, teams
      filters: webhook.filters || {},
      createdAt: new Date().toISOString(),
      stats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastDelivery: null
      }
    };

    this.webhooks.set(id, registeredWebhook);

    console.log(`✓ Webhook registrado: ${registeredWebhook.name} (${id})`);

    return registeredWebhook;
  }

  /**
   * Actualiza un webhook
   */
  update(id, updates) {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Webhook ${id} no encontrado`);
    }

    const updated = {
      ...webhook,
      ...updates,
      id, // No permitir cambiar ID
      updatedAt: new Date().toISOString()
    };

    this.webhooks.set(id, updated);
    return updated;
  }

  /**
   * Elimina un webhook
   */
  delete(id) {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      console.log(`✓ Webhook eliminado: ${id}`);
    }
    return deleted;
  }

  /**
   * Dispara un evento a todos los webhooks relevantes
   */
  async trigger(eventType, payload) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      payload
    };

    // Encontrar webhooks suscritos a este evento
    const targetWebhooks = [];

    for (const webhook of this.webhooks.values()) {
      if (!webhook.enabled) continue;

      // Verificar si está suscrito al evento
      if (this.isSubscribed(webhook, eventType)) {
        // Aplicar filtros
        if (this.passesFilters(webhook, event)) {
          targetWebhooks.push(webhook);
        }
      }
    }

    // Encolar envíos
    for (const webhook of targetWebhooks) {
      this.queue.push({
        webhook,
        event,
        attempts: 0,
        queuedAt: new Date().toISOString()
      });
    }

    return {
      eventId: event.id,
      eventType,
      webhooksTriggered: targetWebhooks.length
    };
  }

  /**
   * Verifica si webhook está suscrito a evento
   */
  isSubscribed(webhook, eventType) {
    if (webhook.events.includes('*')) return true;

    // Verificar match exacto
    if (webhook.events.includes(eventType)) return true;

    // Verificar wildcards parciales
    for (const pattern of webhook.events) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (eventType.startsWith(prefix)) return true;
      }
    }

    return false;
  }

  /**
   * Verifica si evento pasa los filtros
   */
  passesFilters(webhook, event) {
    const filters = webhook.filters;

    // Filtro por severity
    if (filters.minSeverity && event.payload.severity) {
      const severityOrder = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
      if (severityOrder[event.payload.severity] < severityOrder[filters.minSeverity]) {
        return false;
      }
    }

    // Filtro por API
    if (filters.apis && filters.apis.length > 0) {
      if (event.payload.apiId && !filters.apis.includes(event.payload.apiId)) {
        return false;
      }
    }

    // Filtro por tags
    if (filters.tags && filters.tags.length > 0) {
      if (!event.payload.tags || !filters.tags.some(t => event.payload.tags.includes(t))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Inicia procesador de cola
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  /**
   * Procesa cola de webhooks
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    // Rate limiting
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (this.requestCount >= this.config.maxRequestsPerMinute) {
      return;
    }

    this.processing = true;

    try {
      const item = this.queue.shift();
      if (!item) return;

      await this.deliver(item);

    } finally {
      this.processing = false;
    }
  }

  /**
   * Entrega un webhook
   */
  async deliver(item) {
    const { webhook, event, attempts } = item;

    this.requestCount++;

    const delivery = {
      id: this.generateId(),
      webhookId: webhook.id,
      eventId: event.id,
      eventType: event.type,
      url: webhook.url,
      startedAt: new Date().toISOString(),
      attempt: attempts + 1
    };

    try {
      // Formatear payload según el formato del webhook
      const body = this.formatPayload(webhook.format, event);

      // Preparar headers
      const headers = {
        ...this.config.defaultHeaders,
        ...webhook.headers
      };

      // Agregar firma si hay secret
      if (webhook.secret || this.config.secret) {
        const signature = await this.signPayload(body, webhook.secret || this.config.secret);
        headers['X-Webhook-Signature'] = signature;
        headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
      }

      headers['X-Webhook-Event'] = event.type;
      headers['X-Webhook-Delivery'] = delivery.id;

      // Enviar
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      delivery.statusCode = response.status;
      delivery.success = response.status >= 200 && response.status < 300;
      delivery.completedAt = new Date().toISOString();
      delivery.duration = Date.now() - new Date(delivery.startedAt).getTime();

      // Actualizar stats del webhook
      webhook.stats.totalDeliveries++;
      if (delivery.success) {
        webhook.stats.successfulDeliveries++;
      } else {
        webhook.stats.failedDeliveries++;

        // Reintentar si falló
        if (attempts < this.config.retryCount) {
          setTimeout(() => {
            this.queue.push({
              ...item,
              attempts: attempts + 1
            });
          }, this.config.retryDelay * (attempts + 1));
        }
      }
      webhook.stats.lastDelivery = delivery.completedAt;

    } catch (error) {
      delivery.success = false;
      delivery.error = error.message;
      delivery.completedAt = new Date().toISOString();
      delivery.duration = Date.now() - new Date(delivery.startedAt).getTime();

      webhook.stats.totalDeliveries++;
      webhook.stats.failedDeliveries++;

      // Reintentar
      if (attempts < this.config.retryCount) {
        setTimeout(() => {
          this.queue.push({
            ...item,
            attempts: attempts + 1
          });
        }, this.config.retryDelay * (attempts + 1));
      }
    }

    // Guardar en historial
    this.deliveryHistory.push(delivery);

    // Mantener solo últimas 1000 entregas
    if (this.deliveryHistory.length > 1000) {
      this.deliveryHistory = this.deliveryHistory.slice(-1000);
    }

    return delivery;
  }

  /**
   * Formatea payload según el tipo de destino
   */
  formatPayload(format, event) {
    switch (format) {
      case 'slack':
        return this.formatSlack(event);
      case 'discord':
        return this.formatDiscord(event);
      case 'teams':
        return this.formatTeams(event);
      case 'pagerduty':
        return this.formatPagerDuty(event);
      default:
        return this.formatJson(event);
    }
  }

  /**
   * Formato JSON estándar
   */
  formatJson(event) {
    return {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      data: event.payload
    };
  }

  /**
   * Formato Slack
   */
  formatSlack(event) {
    const emoji = this.getEmoji(event.type);
    const color = this.getColor(event.payload.severity || 'info');

    return {
      attachments: [{
        color,
        pretext: `${emoji} *${this.formatEventType(event.type)}*`,
        title: event.payload.title || event.payload.apiId || 'Evento',
        text: event.payload.message || event.payload.description || '',
        fields: this.formatSlackFields(event.payload),
        footer: 'QASL-API-SENTINEL',
        ts: new Date(event.timestamp).getTime() / 1000
      }]
    };
  }

  /**
   * Formato Discord
   */
  formatDiscord(event) {
    const color = this.getColorInt(event.payload.severity || 'info');

    return {
      embeds: [{
        title: `${this.getEmoji(event.type)} ${this.formatEventType(event.type)}`,
        description: event.payload.message || event.payload.description || '',
        color,
        fields: this.formatDiscordFields(event.payload),
        footer: {
          text: 'QASL-API-SENTINEL'
        },
        timestamp: event.timestamp
      }]
    };
  }

  /**
   * Formato Microsoft Teams
   */
  formatTeams(event) {
    const color = this.getColor(event.payload.severity || 'info');

    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: color.replace('#', ''),
      summary: this.formatEventType(event.type),
      sections: [{
        activityTitle: `${this.getEmoji(event.type)} ${this.formatEventType(event.type)}`,
        activitySubtitle: event.payload.apiId || '',
        facts: this.formatTeamsFacts(event.payload),
        markdown: true
      }]
    };
  }

  /**
   * Formato PagerDuty
   */
  formatPagerDuty(event) {
    const severity = this.mapToPagerDutySeverity(event.payload.severity);

    return {
      routing_key: event.payload.routingKey,
      event_action: event.type.includes('recovery') ? 'resolve' : 'trigger',
      dedup_key: event.payload.dedupKey || `${event.payload.apiId}-${event.type}`,
      payload: {
        summary: event.payload.title || event.payload.message || this.formatEventType(event.type),
        severity,
        source: 'QASL-API-SENTINEL',
        timestamp: event.timestamp,
        custom_details: event.payload
      }
    };
  }

  /**
   * Formatea campos para Slack
   */
  formatSlackFields(payload) {
    const fields = [];

    if (payload.apiId) {
      fields.push({ title: 'API', value: payload.apiId, short: true });
    }
    if (payload.severity) {
      fields.push({ title: 'Severidad', value: payload.severity.toUpperCase(), short: true });
    }
    if (payload.status) {
      fields.push({ title: 'Estado', value: payload.status, short: true });
    }
    if (payload.latency) {
      fields.push({ title: 'Latencia', value: `${payload.latency}ms`, short: true });
    }

    return fields;
  }

  /**
   * Formatea campos para Discord
   */
  formatDiscordFields(payload) {
    const fields = [];

    if (payload.apiId) {
      fields.push({ name: 'API', value: payload.apiId, inline: true });
    }
    if (payload.severity) {
      fields.push({ name: 'Severidad', value: payload.severity.toUpperCase(), inline: true });
    }
    if (payload.status) {
      fields.push({ name: 'Estado', value: payload.status, inline: true });
    }

    return fields;
  }

  /**
   * Formatea facts para Teams
   */
  formatTeamsFacts(payload) {
    const facts = [];

    if (payload.apiId) {
      facts.push({ name: 'API', value: payload.apiId });
    }
    if (payload.severity) {
      facts.push({ name: 'Severidad', value: payload.severity.toUpperCase() });
    }
    if (payload.status) {
      facts.push({ name: 'Estado', value: payload.status });
    }
    if (payload.message) {
      facts.push({ name: 'Mensaje', value: payload.message });
    }

    return facts;
  }

  /**
   * Firma payload con HMAC
   */
  async signPayload(payload, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const keyData = encoder.encode(secret);

    // En Node.js usar crypto
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, data);
      return Buffer.from(signature).toString('hex');
    } else {
      // Fallback para Node.js sin Web Crypto
      const { createHmac } = await import('crypto');
      return createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    }
  }

  /**
   * Obtiene emoji según tipo de evento
   */
  getEmoji(eventType) {
    const emojis = {
      'api.down': '🔴',
      'api.up': '🟢',
      'api.slow': '🟡',
      'api.recovered': '✅',
      'alert.created': '⚠️',
      'alert.resolved': '✅',
      'anomaly.detected': '🔍',
      'prediction.high_risk': '⚠️',
      'security.vulnerability': '🛡️',
      'report.generated': '📊'
    };

    return emojis[eventType] || '📌';
  }

  /**
   * Obtiene color según severidad
   */
  getColor(severity) {
    const colors = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFCC00',
      low: '#00CC00',
      info: '#0066FF'
    };

    return colors[severity] || colors.info;
  }

  /**
   * Obtiene color como entero (para Discord)
   */
  getColorInt(severity) {
    const colors = {
      critical: 16711680,
      high: 16744192,
      medium: 16763904,
      low: 52224,
      info: 26367
    };

    return colors[severity] || colors.info;
  }

  /**
   * Mapea severidad a PagerDuty
   */
  mapToPagerDutySeverity(severity) {
    const mapping = {
      critical: 'critical',
      high: 'error',
      medium: 'warning',
      low: 'info',
      info: 'info'
    };

    return mapping[severity] || 'info';
  }

  /**
   * Formatea tipo de evento legiblemente
   */
  formatEventType(eventType) {
    const labels = {
      'api.down': 'API Caída',
      'api.up': 'API Activa',
      'api.slow': 'API Lenta',
      'api.recovered': 'API Recuperada',
      'alert.created': 'Alerta Creada',
      'alert.resolved': 'Alerta Resuelta',
      'anomaly.detected': 'Anomalía Detectada',
      'prediction.high_risk': 'Predicción de Alto Riesgo',
      'security.vulnerability': 'Vulnerabilidad Detectada',
      'report.generated': 'Reporte Generado'
    };

    return labels[eventType] || eventType;
  }

  /**
   * Genera ID único
   */
  generateId() {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera ID de evento
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene webhook por ID
   */
  get(id) {
    return this.webhooks.get(id);
  }

  /**
   * Lista todos los webhooks
   */
  list(options = {}) {
    let webhooks = Array.from(this.webhooks.values());

    if (options.enabled !== undefined) {
      webhooks = webhooks.filter(w => w.enabled === options.enabled);
    }

    if (options.event) {
      webhooks = webhooks.filter(w => this.isSubscribed(w, options.event));
    }

    return webhooks;
  }

  /**
   * Obtiene historial de entregas
   */
  getDeliveryHistory(options = {}) {
    let history = [...this.deliveryHistory];

    if (options.webhookId) {
      history = history.filter(d => d.webhookId === options.webhookId);
    }

    if (options.eventType) {
      history = history.filter(d => d.eventType === options.eventType);
    }

    if (options.success !== undefined) {
      history = history.filter(d => d.success === options.success);
    }

    if (options.since) {
      const since = new Date(options.since);
      history = history.filter(d => new Date(d.startedAt) >= since);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Reenvía una entrega fallida
   */
  async redeliver(deliveryId) {
    const delivery = this.deliveryHistory.find(d => d.id === deliveryId);
    if (!delivery) {
      throw new Error(`Entrega ${deliveryId} no encontrada`);
    }

    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${delivery.webhookId} no encontrado`);
    }

    // Buscar evento original (simplificado)
    const event = {
      id: delivery.eventId,
      type: delivery.eventType,
      timestamp: new Date().toISOString(),
      payload: { redelivery: true, originalDeliveryId: deliveryId }
    };

    this.queue.push({
      webhook,
      event,
      attempts: 0,
      queuedAt: new Date().toISOString()
    });

    return { queued: true, deliveryId };
  }

  /**
   * Prueba un webhook
   */
  async test(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} no encontrado`);
    }

    const testEvent = {
      id: this.generateEventId(),
      type: 'webhook.test',
      timestamp: new Date().toISOString(),
      payload: {
        message: 'Este es un mensaje de prueba de QASL-API-SENTINEL',
        severity: 'info'
      }
    };

    const item = {
      webhook,
      event: testEvent,
      attempts: 0
    };

    return await this.deliver(item);
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    const webhooks = Array.from(this.webhooks.values());

    return {
      totalWebhooks: webhooks.length,
      enabledWebhooks: webhooks.filter(w => w.enabled).length,
      queueSize: this.queue.length,
      recentDeliveries: {
        total: this.deliveryHistory.length,
        successful: this.deliveryHistory.filter(d => d.success).length,
        failed: this.deliveryHistory.filter(d => !d.success).length
      },
      rateLimit: {
        current: this.requestCount,
        max: this.config.maxRequestsPerMinute
      }
    };
  }

  /**
   * Obtiene estado del engine
   */
  getStatus() {
    return {
      webhooksCount: this.webhooks.size,
      queueSize: this.queue.length,
      processing: this.processing,
      deliveryHistorySize: this.deliveryHistory.length,
      config: {
        timeout: this.config.timeout,
        retryCount: this.config.retryCount,
        maxRequestsPerMinute: this.config.maxRequestsPerMinute
      }
    };
  }
}

export default WebhookEngine;
