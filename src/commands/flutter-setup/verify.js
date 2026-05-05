/**
 * verify.js — Post-install verification (flutter doctor style)
 * Checks every tool and prints a beautiful summary table
 */

import fs    from 'fs';
import path  from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { execSync } from 'child_process';
import { detectOS } from './detect.js';

function tryExec(cmd) {
  try {
    return execSync(cmd, {
      encoding : 'utf8',
      stdio    : ['pipe', 'pipe', 'pipe'],
      timeout  : 10000,
    }).trim();
  } catch {
    return null;
  }
}

// Helper to check if a file exists in common fallback locations
function existsInFallback(toolKey) {
  const os = detectOS();
  const home = process.env.USERPROFILE || process.env.HOME;

  if (toolKey === 'flutterfire') {
    const windowsPath = path.join(home, 'AppData', 'Local', 'Pub', 'Cache', 'bin', 'flutterfire.bat');
    const unixPath    = path.join(home, '.pub-cache', 'bin', 'flutterfire');
    return fs.existsSync(windowsPath) || fs.existsSync(unixPath);
  }

  if (toolKey === 'flutter') {
    const flutterExec = path.join(os.flutterDir, 'bin', os.isWindows ? 'flutter.bat' : 'flutter');
    return fs.existsSync(flutterExec);
  }

  return false;
}

const CHECKS = [
  {
    key     : 'git',
    label   : 'Git',
    cmd     : 'git --version',
    parse   : (r) => r?.replace('git version ', '').split(' ')[0],
    fix     : 'https://git-scm.com/downloads',
  },
  {
    key     : 'java',
    label   : 'Java JDK',
    cmd     : 'java -version 2>&1',
    parse   : (r) => r?.match(/version "?([^"]+)"?/)?.[1] || r?.split('\n')[0],
    fix     : 'https://adoptium.net',
  },
  {
    key     : 'node',
    label   : 'Node.js',
    cmd     : 'node --version',
    parse   : (r) => r?.replace('v', ''),
    fix     : 'https://nodejs.org',
  },
  {
    key     : 'dart',
    label   : 'Dart SDK',
    cmd     : 'dart --version 2>&1',
    parse   : (r) => r?.match(/Dart SDK version:\s+([^\s]+)/)?.[1] || r?.split('\n')[0],
    fix     : 'Bundled with Flutter SDK',
  },
  {
    key     : 'flutter',
    label   : 'Flutter SDK',
    cmd     : 'flutter --version',
    parse   : (r) => r?.match(/Flutter\s+([0-9]+\.[0-9]+\.[0-9]+)/)?.[1],
    fix     : 'https://flutter.dev/docs/get-started/install',
  },
  {
    key     : 'sdkmanager',
    label   : 'Android SDK',
    cmd     : 'sdkmanager --version 2>&1',
    parse   : (r) => r?.split('\n')[0].trim() || 'installed',
    fix     : 'https://developer.android.com/studio#command-tools',
  },
  {
    key     : 'adb',
    label   : 'ADB (platform-tools)',
    cmd     : 'adb --version',
    parse   : (r) => r?.match(/Android Debug Bridge version ([^\s]+)/)?.[1] || 'installed',
    fix     : 'Installed via Android SDK platform-tools',
  },
  {
    key     : 'flutterfire',
    label   : 'FlutterFire CLI',
    cmd     : 'flutterfire --version',
    parse   : (r) => r?.trim(),
    fix     : 'Run: dart pub global activate flutterfire_cli',
  },
];

export async function verifyInstallation() {
  console.log('');
  console.log(chalk.bold.cyan('  🔍 Installation Verification'));
  console.log(chalk.gray('  Running checks on all tools...\n'));

  const results = [];

  for (const check of CHECKS) {
    const raw     = tryExec(check.cmd);
    let ok        = !!raw;
    let version   = raw ? check.parse(raw) : null;
    let pending   = false;

    // Fallback: If not in PATH, check if file actually exists on disk
    if (!ok && existsInFallback(check.key)) {
      ok = true;
      version = 'installed (pending restart)';
      pending = true;
    }

    results.push({
      ...check,
      ok,
      pending,
      version: version || (raw ? 'installed' : null),
    });
  }

  // ─── Print results table ────────────────────────────────────────────────
  const table = new Table({
    head: [
      chalk.bold.white('  Tool'),
      chalk.bold.white('Status'),
      chalk.bold.white('Version / Action'),
    ],
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '  ┌', 'top-right': '┐',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '  └', 'bottom-right': '┘',
      left: '  │', right: '│', mid: '─', 'mid-mid': '┼',
      middle: '│',
    },
    style: { head: [], border: ['gray'] },
    colWidths: [24, 16, 46],
  });

  for (const r of results) {
    let statusText = r.ok ? chalk.green('✔  OK') : chalk.red('✖  Missing');
    if (r.pending) statusText = chalk.yellow('⚠  Restart Req');

    table.push([
      chalk.white(r.label),
      statusText,
      r.ok
        ? chalk.gray(r.version || 'installed')
        : chalk.yellow(r.fix),
    ]);
  }

  console.log(table.toString());
  console.log('');

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  if (failed === 0) {
    console.log(chalk.green.bold('  🎉 All checks passed! Your Flutter environment is ready.'));
  } else {
    console.log(
      chalk.yellow('  ⚠ ') +
      chalk.white(`${passed} passed, ${failed} not detected.`) +
      chalk.gray(' Some tools may need a terminal restart to reflect in PATH.')
    );
  }

  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(chalk.cyan('  💡 Tip: ') + chalk.gray('Open a NEW terminal window for PATH changes to take effect.'));
  console.log(chalk.cyan('  💡 Run: ') + chalk.white('flutter doctor') + chalk.gray(' for the official Flutter health check.'));
  console.log('');

  return { passed, failed, results };
}
