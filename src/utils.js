import chalk from 'chalk';
import cliProgress from 'cli-progress';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function divider(label = '') {
  const width = Math.min(process.stdout.columns || 60, 70);
  if (label) {
    const side = Math.floor((width - label.length - 2) / 2);
    const line = '─'.repeat(Math.max(side, 2));
    console.log(chalk.gray(`\n${line} ${chalk.cyan.bold(label)} ${line}\n`));
  } else {
    console.log(chalk.gray('─'.repeat(width)));
  }
}

export const success = (m) => console.log(chalk.green('  ✔ ') + chalk.white(m));
export const fail    = (m) => console.log(chalk.red('  ✖ ')   + chalk.white(m));
export const warn    = (m) => console.log(chalk.yellow('  ⚠ ') + chalk.white(m));
export const info    = (m) => console.log(chalk.cyan('  ℹ ')   + chalk.white(m));

export function makeBar(label = 'Progress') {
  return new cliProgress.SingleBar({
    format:
      chalk.gray('  ') + chalk.cyan(label.padEnd(14)) +
      chalk.gray('[') + chalk.cyan('{bar}') + chalk.gray('] ') +
      chalk.yellow('{percentage}%') +
      chalk.gray(' {value}/{total}'),
    barCompleteChar:   '█',
    barIncompleteChar: '░',
    hideCursor: true,
  }, cliProgress.Presets.shades_classic);
}

export function makeMultiBar() {
  return new cliProgress.MultiBar({
    format:
      chalk.gray('{label}') +
      chalk.gray('[') + chalk.cyan('{bar}') + chalk.gray('] ') +
      chalk.yellow('{percentage}%'),
    barCompleteChar:   '█',
    barIncompleteChar: '░',
    hideCursor: true,
  }, cliProgress.Presets.shades_classic);
}
