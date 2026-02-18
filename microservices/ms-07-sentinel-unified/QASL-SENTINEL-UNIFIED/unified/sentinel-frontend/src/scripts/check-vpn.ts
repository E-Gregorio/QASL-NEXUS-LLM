// ============================================
// QASL-GUARDIAN - VPN Check Script
// ============================================

import { loadConfig } from '../config.js';
import chalk from 'chalk';

async function checkVPN() {
  const config = loadConfig();

  console.log(chalk.cyan('🔐 QASL-GUARDIAN VPN Check\n'));

  if (!config.requireVpn) {
    console.log(chalk.yellow('⚠️  VPN check disabled in configuration'));
    return;
  }

  if (!config.vpnCheckUrl) {
    console.log(chalk.red('❌ VPN check enabled but no URL configured'));
    process.exit(1);
  }

  try {
    console.log(chalk.gray(`Checking: ${config.vpnCheckUrl}`));
    
    const start = Date.now();
    const response = await fetch(config.vpnCheckUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    const responseTime = Date.now() - start;

    if (response.ok) {
      console.log(chalk.green(`\n✅ VPN Connected`));
      console.log(chalk.gray(`   Status: ${response.status}`));
      console.log(chalk.gray(`   Response time: ${responseTime}ms`));
    } else {
      console.log(chalk.red(`\n❌ VPN Check Failed`));
      console.log(chalk.gray(`   Status: ${response.status}`));
      process.exit(1);
    }

  } catch (error: any) {
    console.log(chalk.red(`\n❌ VPN Not Connected`));
    console.log(chalk.gray(`   Error: ${error.message}`));
    process.exit(1);
  }
}

checkVPN();
