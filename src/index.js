#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        ONE-CLICK FLUTTER SETUP — MAIN ENTRY          ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { program } from 'commander';
import { mainMenu } from './menu.js';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';

// ─── Banner ───────────────────────────────────────────────────────────────────
function showBanner() {
  const banner = figlet.textSync('DEVTOOL', { font: 'ANSI Shadow' });
  console.log(gradient(['#00d2ff', '#3a7bd5', '#a855f7']).multiline(banner));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('  ⚡ Advanced CLI Tool • v1.0.2 • Windows/Linux/macOS'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────\n'));
}

// ─── Register Commands ────────────────────────────────────────────────────────
program
  .name('one-click-flutter-setup')
  .description('One-click Flutter development environment setup (Windows/macOS/Linux)')
  .version('1.0.2');

// command: flutter-setup
program
  .command('flutter-setup')
  .description('One-click Flutter setup')
  .action(async () => {
    showBanner();
    const { runFlutterSetup } = await import('./commands/flutter-setup/index.js');
    await runFlutterSetup();
  });

// ─── Default Action (Menu) ────────────────────────────────────────────────────
program
  .action(() => {
    showBanner();
    mainMenu();
  });

// Handle errors
try {
  program.parse(process.argv);
} catch (err) {
  console.error(chalk.red('  ✖ Error:'), err.message);
}
