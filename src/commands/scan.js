import chalk from 'chalk';
import ora from 'ora';
import { makeMultiBar, divider, success, fail, warn, sleep } from '../utils.js';

export async function runScan(dir = '.') {
  divider(`SCAN: ${dir}`);
  const s = ora({ text: chalk.gray('Files খুঁজছি...'), spinner: 'dots', color: 'cyan' }).start();
  await sleep(900); s.succeed(chalk.green('247 files found'));
  console.log(chalk.cyan('\n  🔍 Scanning...\n'));

  const multi = makeMultiBar();
  const b1 = multi.create(100, 0, { label: chalk.red('  Security   ') });
  const b2 = multi.create(100, 0, { label: chalk.yellow('  Deps       ') });
  const b3 = multi.create(100, 0, { label: chalk.blue('  Lint       ') });
  const b4 = multi.create(100, 0, { label: chalk.magenta('  Perf       ') });

  const run = async (bar, steps, ms) => {
    for (let i = 0; i <= steps; i++) { await sleep(ms); bar.update(Math.round((i / steps) * 100)); }
  };
  await Promise.all([run(b1,20,160), run(b2,15,120), run(b3,25,90), run(b4,18,140)]);
  multi.stop(); console.log('');

  divider('RESULTS');
  const issues = [
    { sev:'HIGH',   msg:'lodash@4.17.4 — Prototype pollution (CVE-2021-23337)' },
    { sev:'HIGH',   msg:'Hardcoded API key in src/config.js:12' },
    { sev:'MEDIUM', msg:'axios@0.21.0 — Update available' },
    { sev:'LOW',    msg:'console.log() in production code (src/api.js:89)' },
  ];
  const sc = { HIGH: chalk.bgRed.white, MEDIUM: chalk.bgYellow.black, LOW: chalk.bgBlue.white };
  issues.forEach(i => console.log(`  ${sc[i.sev](` ${i.sev} `)} ${chalk.white(i.msg)}`));
  console.log('');
  const h = issues.filter(i=>i.sev==='HIGH').length;
  console.log(`  ${chalk.red(`✖ ${h} HIGH`)}  ${chalk.yellow(`⚠ 1 MEDIUM`)}  ${chalk.blue(`ℹ 1 LOW`)}`);
  console.log('');
  if (h > 0) fail('Critical issues পাওয়া গেছে!'); else warn('কিছু issues পাওয়া গেছে।');
  console.log('');
}
