import chalk from 'chalk';
import ora from 'ora';
import os from 'os';
import { divider, sleep } from '../utils.js';

export async function showSystemInfo() {
  divider('SYSTEM INFO');
  const s = ora({ text: chalk.gray('Collecting...'), spinner: 'dots', color: 'cyan' }).start();
  await sleep(600); s.stop();

  const total = os.totalmem(), used = total - os.freemem();
  const pct   = ((used / total) * 100).toFixed(1);
  const fmt   = (b) => (b / 1024**3).toFixed(2) + ' GB';

  [
    ['OS',       chalk.cyan(os.type() + ' ' + os.release())],
    ['Platform', chalk.cyan(os.platform() + ' (' + os.arch() + ')')],
    ['Hostname', chalk.white(os.hostname())],
    ['CPU',      chalk.white(os.cpus()[0].model)],
    ['Cores',    chalk.yellow(String(os.cpus().length))],
    ['Total RAM',chalk.white(fmt(total))],
    ['Used RAM', parseFloat(pct)>80 ? chalk.red(`${fmt(used)} (${pct}%)`) : chalk.green(`${fmt(used)} (${pct}%)`)],
    ['Node.js',  chalk.green(process.version)],
  ].forEach(([k, v]) => console.log(`  ${chalk.gray(k.padEnd(12))}${v}`));

  const w=30, f=Math.round((used/total)*w);
  const col = parseFloat(pct)>80 ? chalk.red : chalk.green;
  console.log(`\n  ${chalk.gray('RAM')}          [${col('█'.repeat(f))}${chalk.gray('░'.repeat(w-f))}] ${col(pct+'%')}\n`);
}
