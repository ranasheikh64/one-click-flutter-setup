/**
 * prompts.js — Interactive prompts for Flutter setup
 * Shows tool detection table and asks for per-tool install permission
 */

import inquirer from 'inquirer';
import chalk    from 'chalk';
import Table    from 'cli-table3';

const TOOLS = [
  { key: 'git',         label: 'Git',                  desc: 'Version control (required by Flutter)' },
  { key: 'java',        label: 'Java JDK 17',           desc: 'Android build toolchain' },
  { key: 'node',        label: 'Node.js LTS',           desc: 'Required for FlutterFire CLI' },
  { key: 'flutter',     label: 'Flutter SDK',           desc: 'Core Flutter framework' },
  { key: 'androidSdk',  label: 'Android SDK',           desc: 'Android Command-line Tools + SDK' },
  { key: 'flutterfire', label: 'FlutterFire CLI',       desc: 'Firebase for Flutter' },
];

// ─── Status icon ─────────────────────────────────────────────────────────────
function statusIcon(tool) {
  if (tool.installed) return chalk.green('✔  Installed') + chalk.gray(` (${tool.version || 'unknown'})`);
  return chalk.red('✖  Missing');
}

// ─── Show detected tools table ───────────────────────────────────────────────
export function showToolsTable(toolStatus) {
  console.log('');
  console.log(chalk.bold.cyan('  📋 Current System Status'));
  console.log('');

  const table = new Table({
    head: [
      chalk.bold.white('  Tool'),
      chalk.bold.white('Status'),
      chalk.bold.white('Description'),
    ],
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '  ┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '  └', 'bottom-right': '┘',
      left: '  │', right: '│', mid: '─', 'mid-mid': '┼',
      middle: '│',
    },
    style: { head: [], border: ['gray'] },
    colWidths: [22, 32, 38],
  });

  for (const t of TOOLS) {
    const s = toolStatus[t.key];
    table.push([
      chalk.white(t.label),
      statusIcon(s),
      chalk.gray(t.desc),
    ]);
  }

  console.log(table.toString());
  console.log('');
}

// ─── Ask per-tool install/skip ────────────────────────────────────────────────
export async function askInstallPermissions(toolStatus) {
  const missing = TOOLS.filter((t) => !toolStatus[t.key]?.installed);
  const already = TOOLS.filter((t) =>  toolStatus[t.key]?.installed);

  if (already.length > 0) {
    console.log(
      chalk.green('  ✔') +
      chalk.gray(` ${already.length} tool(s) already installed — will be skipped automatically`)
    );
    console.log('');
  }

  if (missing.length === 0) {
    console.log(chalk.green.bold('  🎉 All tools are already installed!'));
    console.log('');
    return [];
  }

  console.log(chalk.yellow.bold(`  ⚡ ${missing.length} tool(s) need to be installed`));
  console.log(chalk.gray('  Select which ones to install (Space = toggle, Enter = confirm):\n'));

  const { selected } = await inquirer.prompt([{
    type    : 'checkbox',
    name    : 'selected',
    message : chalk.cyan('Choose tools to install:'),
    prefix  : chalk.yellow('  ▶'),
    choices : missing.map((t) => ({
      name    : `${chalk.white(t.label.padEnd(20))} ${chalk.gray(t.desc)}`,
      value   : t.key,
      checked : true,   // default: all selected
    })),
    pageSize: 10,
  }]);

  console.log('');

  if (selected.length === 0) {
    console.log(chalk.yellow('  ⚠  No tools selected. Nothing to install.'));
    return [];
  }

  // Final confirmation
  const toolNames = selected.map((k) => TOOLS.find((t) => t.key === k)?.label).join(', ');
  console.log(chalk.gray(`  Will install: ${chalk.white(toolNames)}`));
  console.log('');

  const { confirm } = await inquirer.prompt([{
    type    : 'confirm',
    name    : 'confirm',
    message : chalk.cyan('Proceed with installation?'),
    prefix  : chalk.yellow('  ▶'),
    default : true,
  }]);

  console.log('');

  if (!confirm) {
    console.log(chalk.yellow('  ⚠  Installation cancelled.\n'));
    return [];
  }

  return selected;
}

// ─── Ask custom install path ──────────────────────────────────────────────────
export async function askInstallPath(defaultPath, toolName) {
  const { customPath } = await inquirer.prompt([{
    type    : 'input',
    name    : 'customPath',
    message : chalk.cyan(`Install ${toolName} to:`),
    prefix  : chalk.yellow('  ▶'),
    default : defaultPath,
  }]);
  return customPath.trim() || defaultPath;
}
