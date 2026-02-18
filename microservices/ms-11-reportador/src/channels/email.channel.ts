// ============================================================
// MS-11: Canal Email (SMTP / Nodemailer)
// ============================================================

import nodemailer from 'nodemailer';

export class EmailChannel {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });
  }

  async send(options: {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: { filename: string; path: string }[];
  }): Promise<void> {
    if (!process.env.SMTP_USER) {
      console.warn('[Email] SMTP no configurado');
      return;
    }

    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    await this.transporter.sendMail({
      from: `"QASL NEXUS LLM" <${process.env.SMTP_USER}>`,
      to: recipients,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log(`[Email] Enviado a ${recipients}: ${options.subject}`);
  }

  async sendWeeklyReport(recipients: string[], pdfPath: string): Promise<void> {
    const today = new Date().toLocaleDateString();

    await this.send({
      to: recipients,
      subject: `[QASL NEXUS] Reporte Semanal QA - ${today}`,
      html: `
        <h2>Reporte Semanal de QA</h2>
        <p>Adjunto encontrara el reporte ejecutivo generado automaticamente por QASL NEXUS LLM.</p>
        <p>Fecha: ${today}</p>
        <br>
        <p><i>Este reporte fue generado automaticamente. No responder a este correo.</i></p>
        <p><b>QASL NEXUS LLM Platform</b></p>
      `,
      attachments: [{ filename: `Reporte_QA_${today}.pdf`, path: pdfPath }],
    });
  }
}
