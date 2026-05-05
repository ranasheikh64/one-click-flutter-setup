/**
 * flutter.js — Flutter SDK installer
 * Downloads the latest stable Flutter SDK from the official release API,
 * extracts it to the install directory, and returns the path.
 *
 * Windows : ZIP → extract to C:\flutter
 * macOS   : tar.xz → extract to ~/development/flutter
 * Linux   : tar.xz → extract to ~/development/flutter
 */

import https   from 'https';
import fs      from 'fs';
import path    from 'path';
import os      from 'os';
import chalk   from 'chalk';
import { downloadFile, extractZip, extractTar, runLive, tempDir, Spinner } from './base.js';
import { brewAvailable } from '../detect.js';

// Fallback pinned versions (used if API is unreachable)
const PINNED = {
  win32  : { version: '3.19.5', url: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.19.5-stable.zip' },
  darwin : { version: '3.19.5', url: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.19.5-stable.tar.xz' },
  linux  : { version: '3.19.5', url: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.19.5-stable.tar.xz' },
};

// ─── Fetch latest stable release info ────────────────────────────────────────
async function getLatestRelease(platform) {
  const apiPlatform = { win32: 'windows', darwin: 'macos', linux: 'linux' }[platform];
  if (!apiPlatform) throw new Error(`Unknown platform: ${platform}`);

  return new Promise((resolve) => {
    const url = `https://storage.googleapis.com/flutter_infra_release/releases/releases_${apiPlatform}.json`;

    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json    = JSON.parse(data);
          const channel = json.releases.find((r) => r.channel === 'stable');
          if (!channel) return resolve(PINNED[platform]);

          const baseUrl = json.base_url;
          resolve({
            version : channel.version,
            url     : `${baseUrl}/${channel.archive}`,
          });
        } catch {
          resolve(PINNED[platform]);
        }
      });
    });

    req.on('error',   () => resolve(PINNED[platform]));
    req.on('timeout', () => { req.destroy(); resolve(PINNED[platform]); });
  });
}

// ─── Install Flutter SDK ──────────────────────────────────────────────────────
export async function installFlutter(osInfo, installDir) {
  const { isWindows, isMac, isLinux, platform } = osInfo;
  const spin = new Spinner('Fetching Flutter release info...');

  console.log(chalk.bold.white('\n  🦋 Installing Flutter SDK'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray(`  Install path: ${chalk.cyan(installDir)}`));

  // ─── macOS: try Homebrew first ────────────────────────────────────────────
  if (isMac && brewAvailable()) {
    try {
      console.log(chalk.gray('  Using Homebrew...'));
      await runLive('brew', ['install', '--cask', 'flutter']);
      console.log(chalk.green('\n  ✔ Flutter installed via Homebrew'));
      // Homebrew installs to /opt/homebrew/bin/flutter
      return { success: true, method: 'brew', installDir: '/opt/homebrew' };
    } catch {
      console.log(chalk.yellow('\n  ⚠ Homebrew install failed, falling back to manual...'));
    }
  }

  // ─── Fetch latest release info ─────────────────────────────────────────────
  spin.start();
  spin.update('Fetching latest Flutter stable release info...');
  let releaseInfo;
  try {
    releaseInfo = await getLatestRelease(platform);
    spin.succeed(`Flutter ${releaseInfo.version} found`);
  } catch {
    spin.warn('Using pinned version');
    releaseInfo = PINNED[platform] || PINNED.linux;
  }

  console.log(chalk.gray(`  Version: ${chalk.white(releaseInfo.version)}`));
  console.log(chalk.gray(`  URL: ${chalk.cyan(releaseInfo.url.split('/').pop())}\n`));

  // ─── Download ──────────────────────────────────────────────────────────────
  const fileName = releaseInfo.url.split('/').pop();
  const dest     = path.join(tempDir(), fileName);

  if (fs.existsSync(dest)) {
    console.log(chalk.gray('  Archive already cached, skipping download'));
  } else {
    await downloadFile(releaseInfo.url, dest, 'Flutter SDK');
  }

  // ─── Extract ──────────────────────────────────────────────────────────────
  const parentDir = path.dirname(installDir);
  fs.mkdirSync(parentDir, { recursive: true });

  const extractSpin = new Spinner('Extracting Flutter SDK (this may take a minute)...');
  extractSpin.start();

  try {
    if (fileName.endsWith('.zip')) {
      // ZIP extraction — flutter/ folder is inside the zip
      await extractZip(dest, parentDir);
    } else {
      // TAR extraction (.tar.xz, .tar.gz)
      await extractTar(dest, parentDir);
    }

    // The zip/tar extracts a 'flutter' subdirectory
    const extractedPath = path.join(parentDir, 'flutter');
    if (extractedPath !== installDir && fs.existsSync(extractedPath)) {
      fs.renameSync(extractedPath, installDir);
    }

    extractSpin.succeed('Flutter SDK extracted successfully');
  } catch (e) {
    extractSpin.fail('Extraction failed');
    throw e;
  }

  // ─── Verify flutter binary exists ──────────────────────────────────────────
  const flutterBin = path.join(installDir, 'bin', isWindows ? 'flutter.bat' : 'flutter');
  if (!fs.existsSync(flutterBin)) {
    throw new Error(`Flutter binary not found at ${flutterBin}`);
  }

  // ─── Run flutter precache to download Dart SDK ─────────────────────────────
  console.log(chalk.gray('\n  Running flutter precache (downloads Dart SDK)...'));
  try {
    await runLive(flutterBin, ['precache', '--no-android', '--no-ios', '--no-web', '--no-fuchsia']);
  } catch {
    // Non-fatal — flutter can still run without precache
  }

  console.log(chalk.green(`\n  ✔ Flutter ${releaseInfo.version} installed at ${installDir}`));

  return {
    success    : true,
    method     : 'direct',
    installDir,
    version    : releaseInfo.version,
    flutterBin : path.join(installDir, 'bin'),
  };
}
