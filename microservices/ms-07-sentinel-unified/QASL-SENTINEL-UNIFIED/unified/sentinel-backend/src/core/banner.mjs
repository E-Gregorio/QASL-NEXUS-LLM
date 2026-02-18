/**
 * Banner y utilidades de display para QASL-API-SENTINEL
 */

import chalk from 'chalk';

/**
 * Muestra el banner principal del sistema
 */
export function displayBanner() {
  const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow('██████╗  █████╗ ███████╗██╗')}         ${chalk.green('███████╗██╗   ██╗██╗████████╗')}       ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow('██╔═══██╗██╔══██╗██╔════╝██║')}         ${chalk.green('██╔════╝██║   ██║██║╚══██╔══╝')}       ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow('██║   ██║███████║███████╗██║')}         ${chalk.green('███████╗██║   ██║██║   ██║')}          ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow('██║▄▄ ██║██╔══██║╚════██║██║')}         ${chalk.green('╚════██║██║   ██║██║   ██║')}          ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow('╚██████╔╝██║  ██║███████║███████╗')}    ${chalk.green('███████║╚██████╔╝██║   ██║')}          ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.yellow(' ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝')}    ${chalk.green('╚══════╝ ╚═════╝ ╚═╝   ╚═╝')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}                         ${chalk.white.bold('🐝 API-SENTINEL')}                                      ${chalk.cyan('║')}
${chalk.cyan('║')}              ${chalk.gray('"El Centinela que Vigila tus APIs 24/7"')}                         ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                              ${chalk.cyan('║')}
${chalk.cyan('╠══════════════════════════════════════════════════════════════════════════════╣')}
${chalk.cyan('║')}  ${chalk.white('Version:')} ${chalk.green('1.0.0')}    ${chalk.white('|')}    ${chalk.white('AI:')} ${chalk.magenta('Claude')}    ${chalk.white('|')}    ${chalk.white('Status:')} ${chalk.green('●')} ${chalk.green('Active')}              ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════════════════════╝')}
`;

  console.log(banner);
}

/**
 * Muestra el estado de los módulos
 */
export function displayModuleStatus(modules) {
  console.log(chalk.cyan('\n┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan('│') + chalk.white.bold('                    MÓDULOS DEL SISTEMA                      ') + chalk.cyan('│'));
  console.log(chalk.cyan('├─────────────────────────────────────────────────────────────┤'));

  for (const [name, status] of Object.entries(modules)) {
    const statusIcon = status.active ? chalk.green('●') : chalk.red('○');
    const statusText = status.active ? chalk.green('Activo') : chalk.red('Inactivo');
    console.log(chalk.cyan('│') + ` ${statusIcon} ${chalk.white(name.padEnd(20))} ${statusText.padEnd(20)} ` + chalk.cyan('│'));
  }

  console.log(chalk.cyan('└─────────────────────────────────────────────────────────────┘'));
}

/**
 * Muestra un mensaje de log con timestamp
 */
export function log(message, type = 'info') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const icons = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✗'),
    watch: chalk.cyan('👁'),
    ai: chalk.magenta('🧠'),
    security: chalk.red('🛡'),
    api: chalk.green('🔗')
  };

  const icon = icons[type] || icons.info;
  console.log(`${chalk.gray(timestamp)} ${icon} ${message}`);
}

/**
 * Muestra una tabla de APIs monitoreadas
 */
export function displayApiTable(apis) {
  console.log(chalk.cyan('\n┌──────────────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan('│') + chalk.white.bold('                         APIs MONITOREADAS                               ') + chalk.cyan('│'));
  console.log(chalk.cyan('├────────────────────────┬──────────┬──────────┬────────────┬──────────────┤'));
  console.log(chalk.cyan('│') + chalk.gray(' Endpoint               │ Método   │ Status   │ Latencia   │ Última vez   ') + chalk.cyan('│'));
  console.log(chalk.cyan('├────────────────────────┼──────────┼──────────┼────────────┼──────────────┤'));

  for (const api of apis) {
    const statusColor = api.status === 200 ? chalk.green : api.status >= 500 ? chalk.red : chalk.yellow;
    const endpoint = api.endpoint.substring(0, 22).padEnd(22);
    const method = api.method.padEnd(8);
    const status = statusColor(String(api.status).padEnd(8));
    const latency = `${api.latency}ms`.padEnd(10);
    const lastCheck = api.lastCheck.padEnd(12);

    console.log(chalk.cyan('│') + ` ${endpoint} │ ${method} │ ${status} │ ${latency} │ ${lastCheck} ` + chalk.cyan('│'));
  }

  console.log(chalk.cyan('└────────────────────────┴──────────┴──────────┴────────────┴──────────────┘'));
}
