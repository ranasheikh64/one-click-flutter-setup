import chalk from 'chalk';
import ora from 'ora';
import { makeBar, makeMultiBar, divider, success, fail, warn, info, sleep } from '../utils.js';

export async function runDemo() {
  divider('UI DEMO');

  // Spinners
  console.log(chalk.cyan('  1️⃣  Spinners\n'));
  for (const name of ['dots','bouncingBar','arc','clock','star']) {
    const s = ora({ text: chalk.gray(`spinner: ${name}`), spinner: name, color: 'cyan' }).start();
    await sleep(500); s.stop();
  }

  // States
  console.log('\n' + chalk.cyan('  2️⃣  States\n'));
  const s1 = ora(chalk.gray('Loading...')).start(); await sleep(500); s1.succeed(chalk.green('Success'));
  const s2 = ora(chalk.gray('Risky...')).start();   await sleep(400); s2.fail(chalk.red('Failed (demo)'));
  const s3 = ora(chalk.gray('Checking...')).start();await sleep(400); s3.warn(chalk.yellow('Warning'));

  // Progress bar
  console.log('\n' + chalk.cyan('  3️⃣  Progress Bar\n'));
  const bar = makeBar('Uploading');
  bar.start(100, 0);
  for (let i = 0; i <= 100; i += 5) { await sleep(60); bar.update(i); }
  bar.stop(); success('Done!');

  // Multi bar
  console.log('\n' + chalk.cyan('  4️⃣  Multi Progress\n'));
  const multi = makeMultiBar();
  const b1 = multi.create(100, 0, { label: chalk.red('  Task A     ') });
  const b2 = multi.create(100, 0, { label: chalk.green('  Task B     ') });
  const b3 = multi.create(100, 0, { label: chalk.blue('  Task C     ') });
  const run = async (b, n, ms) => { for(let i=0;i<=n;i++){await sleep(ms);b.update(Math.round(i/n*100));} };
  await Promise.all([run(b1,20,100), run(b2,15,80), run(b3,25,85)]);
  multi.stop();

  // Log levels
  console.log('\n' + chalk.cyan('  5️⃣  Log Levels\n'));
  success('Success message'); fail('Error message'); warn('Warning message'); info('Info message');
  console.log(''); success('Demo শেষ! ✨'); console.log('');
}
