/**
 * flutterfire.js — FlutterFire CLI installer
 * Uses: dart pub global activate flutterfire_cli
 * Dart must be available (comes with Flutter SDK)
 */

import chalk from 'chalk';
import path  from 'path';
import fs    from 'fs';
import { runLive, runSilent, Spinner } from './base.js';

export async function installFlutterFire(osInfo, flutterDir) {
  const { isWindows } = osInfo;

  console.log(chalk.bold.white('\n  🔥 Installing FlutterFire CLI'));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  // ─── Find dart binary ─────────────────────────────────────────────────────
  let dartBin = 'dart';

  // If flutter was just installed, use the bundled dart
  if (flutterDir && fs.existsSync(flutterDir)) {
    const bundledDart = path.join(flutterDir, 'bin', isWindows ? 'dart.bat' : 'dart');
    if (fs.existsSync(bundledDart)) {
      dartBin = bundledDart;
    }
  }

  // ─── Check dart is available ──────────────────────────────────────────────
  try {
    const version = runSilent(`"${dartBin}" --version 2>&1`);
    console.log(chalk.gray(`  Using Dart: ${chalk.white(version.split('\n')[0])}`));
  } catch {
    // Try system dart
    try {
      const version = runSilent('dart --version 2>&1');
      dartBin = 'dart';
      console.log(chalk.gray(`  Using system Dart: ${chalk.white(version.split('\n')[0])}`));
    } catch {
      throw new Error(
        'Dart not found. Flutter SDK must be installed first.\n' +
        'Install Flutter SDK, then re-run FlutterFire installation.'
      );
    }
  }

  // ─── Install FlutterFire CLI ──────────────────────────────────────────────
  console.log(chalk.gray('\n  Running: dart pub global activate flutterfire_cli'));
  const spin = new Spinner('Installing FlutterFire CLI...');
  spin.start();

  try {
    await runLive(dartBin, ['pub', 'global', 'activate', 'flutterfire_cli']);
    spin.succeed('FlutterFire CLI installed via dart pub global');
  } catch (e) {
    spin.fail('FlutterFire CLI installation failed');
    throw e;
  }

  // ─── Verify ───────────────────────────────────────────────────────────────
  let version = null;
  try {
    version = runSilent('flutterfire --version');
  } catch {
    // May not be in PATH yet until shell restart
    version = 'installed (restart terminal to use)';
  }

  console.log(chalk.green(`\n  ✔ FlutterFire CLI installed — ${version}`));
  console.log('');
  console.log(chalk.gray('  💡 Usage after project setup:'));
  console.log(chalk.gray('     1. ') + chalk.white('flutterfire configure') + chalk.gray(' — link Firebase to your Flutter project'));
  console.log(chalk.gray('     2. ') + chalk.white('flutterfire login') + chalk.gray(' — authenticate with Firebase'));

  return { success: true, version };
}
