// ============================================
// QASL-GUARDIAN - Snapshot Script
// ============================================

import { loadConfig } from '../config.js';
import { DOMWatcher } from '../watchers/dom-watcher.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

async function captureSnapshot() {
  const config = loadConfig();
  const watcher = new DOMWatcher(config);

  console.log(chalk.cyan('📸 QASL-GUARDIAN Snapshot Capture\n'));

  try {
    await watcher.initialize();

    for (const url of config.watchUrls) {
      console.log(chalk.yellow(`\nCapturing: ${url}`));
      
      const snapshot = await watcher.captureSnapshot(url);
      
      // Save snapshot
      const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${timestamp}_${sanitizedUrl}.json`;
      const filepath = path.join(config.snapshotDir, filename);

      await fs.mkdir(config.snapshotDir, { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));

      console.log(chalk.green(`✅ Saved: ${filepath}`));
      console.log(chalk.gray(`   DOM elements: ${snapshot.dom.length}`));
      console.log(chalk.gray(`   Interactive: ${snapshot.interactive.length}`));
    }

    await watcher.close();
    console.log(chalk.green('\n✅ Snapshot capture complete'));

  } catch (error: any) {
    console.error(chalk.red('\n❌ Snapshot failed:'), error.message);
    process.exit(1);
  }
}

captureSnapshot();
