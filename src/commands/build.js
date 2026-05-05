import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { makeBar, divider, success, sleep } from '../utils.js';

export async function runBuild(projectName) {
  if (!projectName) {
    const a = await inquirer.prompt([
      { type: 'input',    name: 'project', message: chalk.cyan('Project name:'), prefix: chalk.yellow('  ▶'), default: 'MyApp' },
      { type: 'list',     name: 'env',     message: chalk.cyan('Environment:'),  prefix: chalk.yellow('  ▶'),
        choices: [{ name: chalk.green('production'), value: 'production' }, { name: chalk.yellow('staging'), value: 'staging' }, { name: chalk.blue('development'), value: 'development' }] },
      { type: 'checkbox', name: 'steps',   message: chalk.cyan('Steps:'),        prefix: chalk.yellow('  ▶'),
        choices: [
          { name: 'TypeScript compile', value: 'tsc',    checked: true },
          { name: 'Bundle',             value: 'bundle', checked: true },
          { name: 'Minify',             value: 'minify', checked: true },
          { name: 'Run tests',          value: 'test',   checked: false },
        ]},
    ]);
    projectName = a.project;
  }

  divider(`BUILD: ${projectName}`);

  const s1 = ora({ text: chalk.gray('Dependencies check...'), spinner: 'dots', color: 'cyan' }).start();
  await sleep(1000); s1.succeed(chalk.green('Dependencies OK'));

  const files = ['index.ts','utils.ts','router.ts','Header.tsx','Footer.tsx','Home.tsx','About.tsx','api.ts','auth.ts'];
  console.log(chalk.cyan('\n  📦 Compiling...\n'));
  const bar = makeBar('Compile');
  bar.start(files.length, 0);
  for (let i = 0; i < files.length; i++) { await sleep(280); bar.update(i + 1); }
  bar.stop();
  success(`${files.length} files compiled`);

  const s2 = ora({ text: chalk.gray('Bundling...'), spinner: 'bouncingBar', color: 'magenta' }).start();
  await sleep(1500); s2.succeed(chalk.green('dist/bundle.js ready (124 KB)'));

  const s3 = ora({ text: chalk.gray('Minifying...'), spinner: 'arc', color: 'yellow' }).start();
  await sleep(800); s3.succeed(chalk.green('dist/bundle.min.js (38 KB) ↓ 69%'));

  console.log('');
  divider('SUMMARY');
  [['Project', chalk.cyan(projectName)], ['Status', chalk.green('✔ SUCCESS')], ['Files', chalk.white(String(files.length))], ['Size', chalk.yellow('38 KB')]].forEach(([k, v]) => {
    console.log(`  ${chalk.gray(k.padEnd(10))}${v}`);
  });
  console.log(''); success('Build সম্পন্ন! 🎉'); console.log('');
}
