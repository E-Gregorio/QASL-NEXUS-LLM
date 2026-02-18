// ═══════════════════════════════════════════════════════════════
// AI-TESTING-FRAMEWORK - CHATBOT CLIENT
// Conecta con cualquier chatbot via Playwright
// ═══════════════════════════════════════════════════════════════

import { Page } from '@playwright/test';
import { CONFIG } from '../config';
import { ChatbotResponse } from './types';

export class ChatbotClient {
  private page: Page;
  private config = CONFIG.chatbot;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navega a la URL del chatbot
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.config.url);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Envía un mensaje al chatbot y captura la respuesta
   */
  async sendMessage(prompt: string): Promise<ChatbotResponse> {
    const startTime = Date.now();
    
    try {
      // Contar mensajes existentes para detectar el nuevo
      const initialCount = await this.page.locator(this.config.responseSelector).count();

      // Escribir el prompt
      await this.page.fill(this.config.inputSelector, prompt);
      
      // Enviar mensaje
      await this.page.click(this.config.sendSelector);

      // Esperar nueva respuesta del bot
      await this.page.waitForFunction(
        ({ selector, count }) => {
          const elements = document.querySelectorAll(selector);
          return elements.length > count;
        },
        { selector: this.config.responseSelector, count: initialCount },
        { timeout: this.config.waitForResponse }
      );

      // Pequeña espera para que termine de escribir
      await this.page.waitForTimeout(500);

      // Capturar la última respuesta
      const responses = await this.page.locator(this.config.responseSelector).all();
      const lastResponse = responses[responses.length - 1];
      const responseText = await lastResponse.textContent() || '';

      const endTime = Date.now();

      return {
        prompt,
        response: responseText.trim(),
        responseTime: endTime - startTime,
        timestamp: new Date(),
        success: true,
      };

    } catch (error) {
      const endTime = Date.now();
      return {
        prompt,
        response: '',
        responseTime: endTime - startTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envía múltiples mensajes en secuencia (conversación)
   */
  async sendConversation(prompts: string[]): Promise<ChatbotResponse[]> {
    const responses: ChatbotResponse[] = [];
    
    for (const prompt of prompts) {
      const response = await this.sendMessage(prompt);
      responses.push(response);
      
      if (!response.success) {
        break; // Detener si hay error
      }
    }
    
    return responses;
  }

  /**
   * Limpia el chat (si el chatbot lo soporta)
   */
  async clearChat(): Promise<void> {
    // Intenta encontrar botón de limpiar/nuevo chat
    const clearButton = this.page.locator('button:has-text("Clear"), button:has-text("New"), button:has-text("Reset")');
    
    if (await clearButton.count() > 0) {
      await clearButton.first().click();
      await this.page.waitForTimeout(500);
    } else {
      // Si no hay botón, recargar página
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Toma screenshot del estado actual
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ 
      path: `reports/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Obtiene el texto visible del chat completo
   */
  async getChatHistory(): Promise<string[]> {
    const messages = await this.page.locator(`${this.config.responseSelector}, .user-message, .message`).all();
    const history: string[] = [];
    
    for (const msg of messages) {
      const text = await msg.textContent();
      if (text) history.push(text.trim());
    }
    
    return history;
  }
}

export default ChatbotClient;
