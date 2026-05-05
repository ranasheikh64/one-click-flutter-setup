import inquirer from 'inquirer';
import chalk from 'chalk';
import { divider } from './utils.js';

export async function mainMenu() {
  divider('MAIN MENU');

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: chalk.cyan('কী করতে চাও?'),
    prefix: chalk.yellow('  ▶'),
    choices: [
      { name: `${chalk.green('⚙  Build')}        ${chalk.gray('compile & bundle করো')}`, value: 'build' },
      { name: `${chalk.blue('🚀 Deploy')}       ${chalk.gray('server-এ push করো')}`, value: 'deploy' },
      { name: `${chalk.magenta('🔍 Scan')}         ${chalk.gray('issues খুঁজে বের করো')}`, value: 'scan' },
      { name: `${chalk.yellow('💻 Info')}         ${chalk.gray('system তথ্য দেখো')}`, value: 'info' },
      { name: `${chalk.cyan('🎨 Demo')}         ${chalk.gray('UI features দেখো')}`, value: 'demo' },
      new inquirer.Separator(chalk.gray('  ─────────────────────────────────────')),
      { name: `${chalk.hex('#a855f7')('🦋 Flutter Setup')} ${chalk.gray('one-click Flutter dev environment')}`, value: 'flutter-setup' },
      new inquirer.Separator(chalk.gray('  ─────────────────────────────────────')),
      { name: chalk.red('✖  Exit'), value: 'exit' },
    ],
  }]);

  console.log('');

  switch (action) {
    case 'build': { const { runBuild } = await import('./commands/build.js'); await runBuild(); break; }
    case 'deploy': { const { runDeploy } = await import('./commands/deploy.js'); await runDeploy(); break; }
    case 'scan': { const { runScan } = await import('./commands/scan.js'); await runScan('.'); break; }
    case 'info': { const { showSystemInfo } = await import('./commands/info.js'); await showSystemInfo(); break; }
    case 'demo': { const { runDemo } = await import('./commands/demo.js'); await runDemo(); break; }
    case 'flutter-setup': { const { runFlutterSetup } = await import('./commands/flutter-setup/index.js'); await runFlutterSetup(); break; }
    case 'exit':
      console.log(chalk.cyan('  👋 আবার দেখা হবে!\n'));
      process.exit(0);
  }

  const { again } = await inquirer.prompt([{
    type: 'confirm',
    name: 'again',
    message: chalk.gray('Main menu-তে ফিরবে?'),
    default: true,
  }]);

  if (again) await mainMenu();
  else { console.log(chalk.cyan('\n  👋 আবার দেখা হবে!\n')); process.exit(0); }
}
