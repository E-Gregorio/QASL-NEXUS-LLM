#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                              ║
 * ║     ██████╗  █████╗ ███████╗██╗         ███████╗██╗   ██╗██╗████████╗       ║
 * ║    ██╔═══██╗██╔══██╗██╔════╝██║         ██╔════╝██║   ██║██║╚══██╔══╝       ║
 * ║    ██║   ██║███████║███████╗██║         ███████╗██║   ██║██║   ██║          ║
 * ║    ██║▄▄ ██║██╔══██║╚════██║██║         ╚════██║██║   ██║██║   ██║          ║
 * ║    ╚██████╔╝██║  ██║███████║███████╗    ███████║╚██████╔╝██║   ██║          ║
 * ║     ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚══════╝ ╚═════╝ ╚═╝   ╚═╝          ║
 * ║                                                                              ║
 * ║                         🐝 API-SENTINEL                                      ║
 * ║              "El Centinela que Vigila tus APIs 24/7"                         ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * QASL-API-SENTINEL v1.0.0
 * Sistema de vigilancia, monitoreo y testing de APIs con IA
 *
 * @author QASL Team - Quality Assurance Software Lab
 * @license MIT
 */

import dotenv from 'dotenv';
import { Sentinel } from './core/sentinel.mjs';
import { displayBanner } from './core/banner.mjs';

// Cargar variables de entorno
dotenv.config();

/**
 * Punto de entrada principal
 */
async function main() {
  // Mostrar banner
  displayBanner();

  // Crear instancia del Sentinel
  const sentinel = new Sentinel();

  // Manejar señales de cierre
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Deteniendo QASL-API-SENTINEL...');
    await sentinel.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await sentinel.stop();
    process.exit(0);
  });

  // Iniciar el Sentinel
  try {
    await sentinel.start();
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

// Ejecutar
main();
