#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        ONE-CLICK FLUTTER SETUP — MAIN ENTRY          ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';

// ─── Banner ───────────────────────────────────────────────────────────────────
function showBanner() {
  const banner = figlet.textSync('FLUTTER SETUP', { font: 'ANSI Shadow' });
  console.log(gradient(['#00d2ff', '#3a7bd5', '#a855f7']).multiline(banner));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('  ⚡ One-Click Flutter Setup • v1.0.4 • Win/Mac/Linux'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────\n'));
}

// ─── Register Commands ────────────────────────────────────────────────────────
program
  .name('one-click-flutter-setup')
  .description('One-click Flutter development environment setup')
  .version('1.0.4');

// ─── Default Action (Straight to Flutter Setup) ──────────────────────────────
program
  .action(async () => {
    showBanner();
    const { runFlutterSetup } = await import('./commands/flutter-setup/index.js');
    await runFlutterSetup();
  });

// Handle errors
try {
  program.parse(process.argv);
} catch (err) {
  console.error(chalk.red('  ✖ Error:'), err.message);
}
