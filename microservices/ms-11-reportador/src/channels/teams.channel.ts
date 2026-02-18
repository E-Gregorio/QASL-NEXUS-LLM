// ============================================================
// MS-11: Canal Microsoft Teams (Webhooks)
// ============================================================

import axios from 'axios';

export class TeamsChannel {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.TEAMS_WEBHOOK_URL || '';
  }

  async send(message: {
    title: string;
    text: string;
    color?: string;
    facts?: { name: string; value: string }[];
  }): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('[Teams] Webhook no configurado');
      return;
    }

    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: message.color || '0076D7',
      summary: message.title,
      sections: [{
        activityTitle: message.title,
        activitySubtitle: 'QASL NEXUS LLM',
        facts: message.facts || [],
        markdown: true,
        text: message.text,
      }],
    };

    await axios.post(this.webhookUrl, payload);
    console.log(`[Teams] Mensaje enviado: ${message.title}`);
  }

  async sendPipelineResult(data: {
    pipelineId: string;
    status: string;
    passRate: number;
    totalTests: number;
    failed: number;
    bugs: number;
  }): Promise<void> {
    const color = data.status === 'Success' ? '36a64f' : 'dc3545';

    await this.send({
      title: `Pipeline ${data.pipelineId} - ${data.status}`,
      text: `Ejecucion completada con pass rate de ${data.passRate}%`,
      color,
      facts: [
        { name: 'Total Tests', value: `${data.totalTests}` },
        { name: 'Failed', value: `${data.failed}` },
        { name: 'Bugs Creados', value: `${data.bugs}` },
        { name: 'Pass Rate', value: `${data.passRate}%` },
      ],
    });
  }
}
