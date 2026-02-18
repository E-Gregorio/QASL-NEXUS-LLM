// ============================================================
// MS-11: Canal Slack (Webhooks)
// ============================================================

import axios from 'axios';

export class SlackChannel {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  }

  async send(message: {
    channel?: string;
    title: string;
    text: string;
    color?: string;
    fields?: { title: string; value: string; short?: boolean }[];
  }): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('[Slack] Webhook no configurado');
      return;
    }

    const payload = {
      channel: message.channel || process.env.SLACK_CHANNEL || '#qa-reports',
      attachments: [{
        color: message.color || '#36a64f',
        title: message.title,
        text: message.text,
        fields: message.fields || [],
        footer: 'QASL NEXUS LLM',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    await axios.post(this.webhookUrl, payload);
    console.log(`[Slack] Mensaje enviado: ${message.title}`);
  }

  async sendPipelineResult(data: {
    pipelineId: string;
    status: string;
    passRate: number;
    totalTests: number;
    failed: number;
    bugs: number;
  }): Promise<void> {
    const color = data.status === 'Success' ? '#36a64f' : '#dc3545';
    const emoji = data.status === 'Success' ? 'white_check_mark' : 'x';

    await this.send({
      title: `:${emoji}: Pipeline ${data.pipelineId} - ${data.status}`,
      text: `Pass Rate: ${data.passRate}%`,
      color,
      fields: [
        { title: 'Total Tests', value: `${data.totalTests}`, short: true },
        { title: 'Failed', value: `${data.failed}`, short: true },
        { title: 'Bugs Creados', value: `${data.bugs}`, short: true },
        { title: 'Pass Rate', value: `${data.passRate}%`, short: true },
      ],
    });
  }

  async sendAlert(severity: string, message: string): Promise<void> {
    const color = severity === 'critical' ? '#dc3545' : '#ffc107';
    await this.send({
      title: `ALERTA ${severity.toUpperCase()}`,
      text: message,
      color,
    });
  }
}
