#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        ONE-CLICK FLUTTER SETUP — MAIN ENTRY          ║
 * ╚══════════════════════════════════════════════════════╝
 */

import { program } from 'commander';
import chalk       from 'chalk';
import figlet      from 'figlet';
import gradient    from 'gradient-string';
import inquirer    from 'inquirer';

// ─── Banner ───────────────────────────────────────────────────────────────────
function showBanner() {
  const banner = figlet.textSync('FLUTTER SETUP', { font: 'ANSI Shadow' });
  console.log(gradient(['#00d2ff', '#3a7bd5', '#a855f7']).multiline(banner));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('  ⚡ One-Click Flutter Setup • v1.0.5 • Win/Mac/Linux'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────\n'));
}

// ─── Register Commands ────────────────────────────────────────────────────────
program
  .name('one-click-flutter-setup')
  .description('One-click Flutter development environment setup')
  .version('1.0.5');

// Main logic
async function runMain() {
  showBanner();
  
  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: chalk.cyan('What would you like to do?'),
    choices: [
      { name: `${chalk.green('🚀  Setup')}     Install Flutter environment`, value: 'setup' },
      { name: `${chalk.red('🗑️   Uninstall')}  Remove Flutter environment`, value: 'uninstall' },
      { name: `${chalk.gray('✖   Exit')}`, value: 'exit' },
    ],
  }]);

  if (choice === 'exit') {
    process.exit(0);
  }

  if (choice === 'setup') {
    const { runFlutterSetup } = await import('./commands/flutter-setup/index.js');
    await runFlutterSetup();
  } else if (choice === 'uninstall') {
    const { runUninstall } = await import('./commands/flutter-setup/uninstall.js');
    await runUninstall();
  }
}

// ─── Default Action ──────────────────────────────────────────────────────────
program.action(runMain);

// Handle errors
try {
  program.parse(process.argv);
} catch (err) {
  console.error(chalk.red('  ✖ Error:'), err.message);
}
