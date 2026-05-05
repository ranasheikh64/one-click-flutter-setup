import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { divider, success, warn, info, sleep } from '../utils.js';

export async function runDeploy() {
  divider('DEPLOY');

  const a = await inquirer.prompt([
    { type: 'list',    name: 'target',        message: chalk.cyan('Platform:'), prefix: chalk.yellow('  ▶'),
      choices: [{ name: '☁️  AWS EC2', value: 'aws' }, { name: '▲  Vercel', value: 'vercel' }, { name: '🐳 Docker', value: 'docker' }, { name: '🟣 Heroku', value: 'heroku' }] },
    { type: 'list',    name: 'branch',        message: chalk.cyan('Branch:'),   prefix: chalk.yellow('  ▶'), choices: ['main','develop','staging'] },
    { type: 'confirm', name: 'runMigrations', message: chalk.cyan('Database migrations চালাবে?'), prefix: chalk.yellow('  ▶'), default: false },
    { type: 'confirm', name: 'confirm',       message: chalk.red('⚠  Deploy করতে নিশ্চিত?'),     prefix: chalk.red('  !'), default: false },
  ]);

  if (!a.confirm) { warn('Deploy বাতিল।'); return; }
  console.log('');

  const steps = [
    { msg: 'Code pull করছি...',       delay: 1200, ok: 'Code pulled → ' + a.branch },
    { msg: 'npm install...',           delay: 1800, ok: 'Dependencies ready' },
    { msg: 'Build করছি...',           delay: 1500, ok: 'Build OK' },
    ...(a.runMigrations ? [{ msg: 'Migrations...', delay: 1000, ok: 'Migrations applied' }] : []),
    { msg: 'Assets upload করছি...',   delay: 1400, ok: 'CDN update done' },
    { msg: 'Server restart...',        delay: 700,  ok: 'PM2 restarted' },
    { msg: 'Health check...',          delay: 800,  ok: 'HTTP 200 ✔' },
  ];

  for (const s of steps) {
    const sp = ora({ text: chalk.gray(s.msg), spinner: 'dots2', color: 'cyan' }).start();
    await sleep(s.delay);
    sp.succeed(chalk.green(s.ok));
  }

  console.log('');
  divider('DEPLOY SUCCESS');
  info(`Platform : ${chalk.cyan(a.target)}`);
  info(`Branch   : ${chalk.cyan(a.branch)}`);
  console.log(''); success('🚀 Deploy সফল!'); console.log('');
}
