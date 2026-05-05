/**
 * android.js — Android SDK installer (version-aware)
 * Supports API 33 / 34 / 35 target selection
 * Version info comes from version-picker.js catalogue
 */

import fs    from 'fs';
import path  from 'path';
import chalk from 'chalk';
import { downloadFile, extractZip, runLive, tempDir, Spinner } from './base.js';
import { getAndroidPackages } from '../version-picker.js';

const CMDTOOLS_URLS = {
  win32  : 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
  darwin : 'https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip',
  linux  : 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip',
};

export async function installAndroid(osInfo, androidHome, versionChoice = { value: '34' }) {
  const { isWindows, platform } = osInfo;
  const apiLevel = versionChoice.value;

  console.log(chalk.bold.white(`\n  🤖 Installing Android SDK (API ${apiLevel})`));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray(`  ANDROID_HOME: ${chalk.cyan(androidHome)}`));
  console.log(chalk.gray(`  Target API:   ${chalk.white('Android ' + apiLevel)}`));

  // ─── Download command-line tools ──────────────────────────────────────────
  const url      = CMDTOOLS_URLS[platform] || CMDTOOLS_URLS.linux;
  const fileName = url.split('/').pop();
  const dest     = path.join(tempDir(), fileName);

  if (fs.existsSync(dest)) {
    console.log(chalk.gray('\n  Cmdline-tools cached, skipping download'));
  } else {
    console.log('');
    await downloadFile(url, dest, 'Android Tools');
  }

  // ─── Set up directory structure ───────────────────────────────────────────
  const cmdlineLatest = path.join(androidHome, 'cmdline-tools', 'latest');
  const cmdlineTemp   = path.join(androidHome, 'cmdline-tools', 'temp-extract');
  fs.mkdirSync(cmdlineLatest, { recursive: true });
  fs.mkdirSync(cmdlineTemp,   { recursive: true });

  const extractSpin = new Spinner('Extracting Android command-line tools...');
  extractSpin.start();
  try {
    await extractZip(dest, cmdlineTemp);
    const extracted = path.join(cmdlineTemp, 'cmdline-tools');
    if (fs.existsSync(extracted)) {
      for (const item of fs.readdirSync(extracted)) {
        const src = path.join(extracted, item);
        const tgt = path.join(cmdlineLatest, item);
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

  // ─── sdkmanager binary ────────────────────────────────────────────────────
  const sdkmanager = path.join(
    cmdlineLatest, 'bin',
    isWindows ? 'sdkmanager.bat' : 'sdkmanager'
  );
  if (!fs.existsSync(sdkmanager)) throw new Error(`sdkmanager not found at ${sdkmanager}`);
  if (!isWindows) { try { fs.chmodSync(sdkmanager, 0o755); } catch {} }

  process.env.ANDROID_HOME     = androidHome;
  process.env.ANDROID_SDK_ROOT = androidHome;

  // ─── Accept licenses ───────────────────────────────────────────────────────
  console.log(chalk.gray('\n  Accepting Android SDK licenses (auto)...'));
  try {
    const { spawn } = await import('child_process');
    await new Promise((resolve) => {
      const proc = spawn(sdkmanager, ['--licenses'], {
        cwd  : androidHome,
        env  : { ...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows,
      });
      proc.stdin.write('y\n'.repeat(30));
      proc.stdin.end();
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
    console.log(chalk.green('  ✔ Licenses accepted'));
  } catch {
    console.log(chalk.yellow('  ⚠ Auto-accept failed (may need to run manually)'));
  }

  // ─── Install SDK packages for chosen API level ────────────────────────────
  const packages = getAndroidPackages(apiLevel);
  console.log(chalk.gray(`\n  Installing: ${chalk.white(packages.join(', '))}`));
  console.log('');

  for (const pkg of packages) {
    const pkgSpin = new Spinner(`Installing ${pkg}...`);
    pkgSpin.start();
    try {
      await runLive(
        sdkmanager,
        ['--install', pkg, `--sdk_root=${androidHome}`],
        { env: { ...process.env, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome } }
      );
      pkgSpin.succeed(`Installed: ${pkg}`);
    } catch {
      pkgSpin.warn(`Skipped (may need manual install): ${pkg}`);
    }
  }

  console.log(chalk.green(`\n  ✔ Android SDK (API ${apiLevel}) ready at ${androidHome}`));
  return {
    success      : true,
    androidHome,
    apiLevel,
    sdkmanager,
    sdkBin       : path.join(cmdlineLatest, 'bin'),
    platformTools: path.join(androidHome, 'platform-tools'),
  };
}
