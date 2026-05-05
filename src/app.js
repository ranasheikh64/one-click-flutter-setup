/**
 * Main App — এখানে সব deps available থাকবে
 * Bootstrap এর পরেই এটা load হয়
 */

import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { program } from 'commander';
import { mainMenu } from './menu.js';

// ─── Fancy banner (figlet + gradient) ────────────────────────────────────────
async function showBanner() {
  console.clear();

  const text = figlet.textSync('DevTool', { font: 'ANSI Shadow' });
  console.log(gradient.vice.multiline(text));

  console.log(
    boxen(
      chalk.bold.white('⚡ Advanced Node.js CLI Tool\n') +
      chalk.gray('   v1.0.0  •  Windows / Linux / macOS\n') +
      chalk.gray('   Type ') + chalk.cyan('Ctrl+C') + chalk.gray(' anytime to exit'),
      {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 2 },
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

// ─── Commander commands ───────────────────────────────────────────────────────
function setupCommands() {
  program
    .name('devtool')
    .description('Advanced CLI Tool')
    .version('1.0.0', '-v, --version');

  program
    .command('menu', { isDefault: true })
    .description('Interactive main menu')
    .action(async () => {
      await showBanner();
      await mainMenu();
    });

  program
    .command('flutter-setup')
    .description('One-click Flutter development environment setup (Windows/macOS/Linux)')
    .action(async () => {
      const { runFlutterSetup } = await import('./commands/flutter-setup/index.js');
      await runFlutterSetup();
    });

  program
    .command('build')
    .description('Build project')
    .option('-p, --project <name>', 'Project name', 'MyApp')
    .action(async (opts) => {
      const { runBuild } = await import('./commands/build.js');
      await runBuild(opts.project);
    });

  program
    .command('deploy')
    .description('Deploy to server')
    .action(async () => {
      const { runDeploy } = await import('./commands/deploy.js');
      await runDeploy();
    });

  program
    .command('scan')
    .description('Scan & audit project')
    .option('-d, --dir <path>', 'Directory', '.')
    .action(async (opts) => {
      const { runScan } = await import('./commands/scan.js');
      await runScan(opts.dir);
    });

  program
    .command('info')
    .description('System information')
    .action(async () => {
      const { showSystemInfo } = await import('./commands/info.js');
      await showSystemInfo();
    });
}

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function startApp() {
  setupCommands();

  // No args → show banner + menu
  if (process.argv.length === 2) {
    await showBanner();
    await mainMenu();
  } else {
    await program.parseAsync(process.argv);
  }
}
