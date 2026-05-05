/**
 * ide-check.js — Detect VS Code and Android Studio
 * If not found, print clear download instructions with links
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import os   from 'os';
import chalk from 'chalk';

// ─── Try running a command ────────────────────────────────────────────────────
function tryExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

// ─── Check common install directories ────────────────────────────────────────
function checkPaths(paths) {
  return paths.find((p) => existsSync(p)) || null;
}

// ─── VS Code detection ────────────────────────────────────────────────────────
function detectVSCode() {
  // 1. Check PATH
  const inPath = tryExec('code --version');
  if (inPath) {
    const version = inPath.split('\n')[0].trim();
    return { installed: true, version, location: 'PATH' };
  }

  // 2. Check common install directories
  const home = os.homedir();
  const common = {
    win32 : [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe'),
      path.join(process.env.ProgramFiles  || '', 'Microsoft VS Code', 'Code.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft VS Code', 'Code.exe'),
    ],
    darwin: [
      '/Applications/Visual Studio Code.app',
      path.join(home, 'Applications', 'Visual Studio Code.app'),
    ],
    linux : [
      '/usr/bin/code',
      '/usr/local/bin/code',
      '/snap/bin/code',
      path.join(home, '.local', 'share', 'code'),
    ],
  };

  const found = checkPaths(common[process.platform] || []);
  if (found) return { installed: true, version: 'installed', location: found };

  return { installed: false };
}

// ─── Android Studio detection ─────────────────────────────────────────────────
function detectAndroidStudio() {
  const home = os.homedir();

  // 1. Check PATH / studio command
  const inPath = tryExec('studio --version 2>&1') || tryExec('studio64 --version 2>&1');
  if (inPath) return { installed: true, version: inPath.split('\n')[0].trim() };

  // 2. Common install directories
  const common = {
    win32 : [
      path.join(process.env.ProgramFiles || '', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
    ],
    darwin: [
      '/Applications/Android Studio.app',
      path.join(home, 'Applications', 'Android Studio.app'),
    ],
    linux : [
      path.join(home, 'android-studio', 'bin', 'studio.sh'),
      '/opt/android-studio/bin/studio.sh',
      '/usr/local/android-studio/bin/studio.sh',
    ],
  };

  const found = checkPaths(common[process.platform] || []);
  if (found) return { installed: true, version: 'installed', location: found };

  return { installed: false };
}

// ─── Print IDE status + suggestions ──────────────────────────────────────────
export function checkIDEs() {
  const vscode  = detectVSCode();
  const studio  = detectAndroidStudio();

  console.log('');
  console.log(chalk.bold.cyan('  🖥️  IDE Check'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log('');

  // VS Code
  if (vscode.installed) {
    console.log(
      chalk.green('  ✔') +
      chalk.white('  VS Code') +
      chalk.gray(` — ${vscode.version || 'installed'}`)
    );
  } else {
    console.log(chalk.yellow('  ⚠') + chalk.white('  VS Code') + chalk.red('  — Not found'));
    console.log(chalk.gray('     📥 Download: ') + chalk.cyan('https://code.visualstudio.com'));
    console.log(chalk.gray('     💡 Recommended extensions after install:'));
    console.log(chalk.gray('        • Flutter (Dart Code)  →  ext install Dart-Code.flutter'));
    console.log(chalk.gray('        • Dart                 →  ext install Dart-Code.dart-code'));
  }

  console.log('');

  // Android Studio
  if (studio.installed) {
    console.log(
      chalk.green('  ✔') +
      chalk.white('  Android Studio') +
      chalk.gray(` — ${studio.version || 'installed'}`)
    );
  } else {
    console.log(chalk.yellow('  ⚠') + chalk.white('  Android Studio') + chalk.red('  — Not found'));
    console.log(chalk.gray('     📥 Download: ') + chalk.cyan('https://developer.android.com/studio'));
    console.log(chalk.gray('     💡 After install, open Android Studio and:'));
    console.log(chalk.gray('        1. SDK Manager → Install Android SDK 34'));
    console.log(chalk.gray('        2. AVD Manager → Create a virtual device'));
  }

  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));

  return { vscode, androidStudio: studio };
}
