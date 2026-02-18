// ============================================
// QASL-GUARDIAN - Show Changes Script
// ============================================

import { loadConfig } from '../config.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

async function showChanges() {
  const config = loadConfig();

  console.log(chalk.cyan('📋 QASL-GUARDIAN - Last Changes\n'));

  try {
    const files = await fs.readdir(config.snapshotDir);
    
    if (files.length < 2) {
      console.log(chalk.yellow('⚠️  Not enough snapshots to compare (need at least 2)'));
      return;
    }

    // Group by URL
    const byUrl = new Map<string, string[]>();
    
    files.forEach(file => {
      const match = file.match(/\d{4}-\d{2}-\d{2}_(.+)\.json/);
      if (match) {
        const url = match[1];
        if (!byUrl.has(url)) byUrl.set(url, []);
        byUrl.get(url)!.push(file);
      }
    });

    // Show latest changes for each URL
    for (const [url, snapshots] of byUrl) {
      if (snapshots.length < 2) continue;

      const sorted = snapshots.sort().reverse();
      const latest = sorted[0];
      const previous = sorted[1];

      console.log(chalk.yellow(`\n📄 ${url.replace(/_/g, '/')}`));
      console.log(chalk.gray(`   Latest:   ${latest}`));
      console.log(chalk.gray(`   Previous: ${previous}`));

      // Load and compare
      const latestPath = path.join(config.snapshotDir, latest);
      const previousPath = path.join(config.snapshotDir, previous);

      const latestData = JSON.parse(await fs.readFile(latestPath, 'utf-8'));
      const previousData = JSON.parse(await fs.readFile(previousPath, 'utf-8'));

      const latestCount = latestData.dom?.length || 0;
      const previousCount = previousData.dom?.length || 0;
      const diff = latestCount - previousCount;

      if (diff > 0) {
        console.log(chalk.green(`   +${diff} new elements`));
      } else if (diff < 0) {
        console.log(chalk.red(`   ${diff} removed elements`));
      } else {
        console.log(chalk.gray(`   No element count change`));
      }
    }

    console.log(chalk.green('\n✅ Done'));

  } catch (error: any) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

showChanges();
