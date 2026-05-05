/**
 * android.js — Android Command-line Tools + SDK installer
 *
 * 1. Downloads Android command-line tools from Google
 * 2. Extracts to ANDROID_HOME/cmdline-tools/latest
 * 3. Runs sdkmanager to install: platform-tools, build-tools;34.0.0, platforms;android-34
 * 4. Auto-accepts all licenses
 */

import fs    from 'fs';
import path  from 'path';
import os    from 'os';
import chalk from 'chalk';
import { downloadFile, extractZip, runLive, runSilent, tempDir, Spinner, col, sleep } from './base.js';
import { brewAvailable } from '../detect.js';

// Official Android command-line tools URLs
const CMDTOOLS_URLS = {
  win32  : 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
  darwin : 'https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip',
  linux  : 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip',
};

// SDK packages to install
const SDK_PACKAGES = [
  'platform-tools',
  'build-tools;34.0.0',
  'platforms;android-34',
  'emulator',
];

export async function installAndroid(osInfo, androidHome) {
  const { isWindows, isMac, isLinux, platform } = osInfo;

  console.log(chalk.bold.white('\n  🤖 Installing Android SDK'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray(`  ANDROID_HOME: ${chalk.cyan(androidHome)}`));

  // ─── Download command-line tools ──────────────────────────────────────────
  const url      = CMDTOOLS_URLS[platform] || CMDTOOLS_URLS.linux;
  const fileName = url.split('/').pop();
  const dest     = path.join(tempDir(), fileName);

  if (fs.existsSync(dest)) {
    console.log(chalk.gray('\n  Cmdline-tools already cached, skipping download'));
  } else {
    console.log('');
    await downloadFile(url, dest, 'Android Tools');
  }

  // ─── Set up directory structure ───────────────────────────────────────────
  // Required structure: $ANDROID_HOME/cmdline-tools/latest/
  const cmdlineLatest = path.join(androidHome, 'cmdline-tools', 'latest');
  const cmdlineTemp   = path.join(androidHome, 'cmdline-tools', 'temp-extract');

  fs.mkdirSync(cmdlineLatest,  { recursive: true });
  fs.mkdirSync(cmdlineTemp,    { recursive: true });

  const extractSpin = new Spinner('Extracting Android command-line tools...');
  extractSpin.start();

  try {
    await extractZip(dest, cmdlineTemp);

    // The zip extracts a 'cmdline-tools' folder inside
    const extracted = path.join(cmdlineTemp, 'cmdline-tools');
    if (fs.existsSync(extracted)) {
      // Move contents to latest/
      const items = fs.readdirSync(extracted);
      for (const item of items) {
        const src  = path.join(extracted, item);
        const tgt  = path.join(cmdlineLatest, item);
        if (fs.existsSync(tgt)) fs.rmSync(tgt, { recursive: true });
        fs.renameSync(src, tgt);
      }
      fs.rmSync(cmdlineTemp, { recursive: true });
    }

    extractSpin.succeed('Android command-line tools extracted');
  } catch (e) {
    extractSpin.fail('Extraction failed');
    throw e;
  }

  // ─── Determine sdkmanager binary path ─────────────────────────────────────
  const sdkmanager = path.join(
    cmdlineLatest, 'bin',
    isWindows ? 'sdkmanager.bat' : 'sdkmanager'
  );

  if (!fs.existsSync(sdkmanager)) {
    throw new Error(`sdkmanager not found at ${sdkmanager}`);
  }

  // Make executable on Unix
  if (!isWindows) {
    try { fs.chmodSync(sdkmanager, 0o755); } catch {}
  }

  // ─── Set ANDROID_HOME for child processes ─────────────────────────────────
  process.env.ANDROID_HOME     = androidHome;
  process.env.ANDROID_SDK_ROOT = androidHome;

  // ─── Accept licenses ───────────────────────────────────────────────────────
  console.log(chalk.gray('\n  Accepting Android SDK licenses (auto)...'));
  try {
    const { spawn } = await import('child_process');
    await new Promise((resolve) => {
      const proc = spawn(
        sdkmanager,
        ['--licenses'],
        {
          cwd  : androidHome,
          env  : { ...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: isWindows,
        }
      );
      // Send 'y\n' repeatedly to accept all licenses
      const yesAll = 'y\n'.repeat(30);
      proc.stdin.write(yesAll);
      proc.stdin.end();

      proc.on('close', () => resolve());
      proc.on('error', () => resolve()); // non-fatal
    });
    console.log(chalk.green('  ✔ Licenses accepted'));
  } catch {
    console.log(chalk.yellow('  ⚠ Could not auto-accept licenses (you may need to do this manually)'));
  }

  // ─── Install SDK packages ─────────────────────────────────────────────────
  console.log(chalk.gray(`\n  Installing SDK packages: ${chalk.white(SDK_PACKAGES.join(', '))}`));
  console.log('');

  for (const pkg of SDK_PACKAGES) {
    const pkgSpin = new Spinner(`Installing ${pkg}...`);
    pkgSpin.start();
    try {
      await runLive(
        sdkmanager,
        ['--install', pkg, `--sdk_root=${androidHome}`],
        { env: { ...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome } }
      );
      pkgSpin.succeed(`Installed: ${pkg}`);
    } catch (e) {
      pkgSpin.warn(`Skipped (may need manual install): ${pkg}`);
    }
  }

  console.log(chalk.green(`\n  ✔ Android SDK ready at ${androidHome}`));

  return {
    success    : true,
    androidHome,
    sdkmanager,
    sdkBin     : path.join(cmdlineLatest, 'bin'),
    platformTools: path.join(androidHome, 'platform-tools'),
  };
}
