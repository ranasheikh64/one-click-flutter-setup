/**
 * flutter.js — Flutter SDK installer (version-aware)
 * Supports: Latest Stable (auto-fetched) or pinned versions
 * Version info comes from version-picker.js catalogue
 */

import https   from 'https';
import fs      from 'fs';
import path    from 'path';
import chalk   from 'chalk';
import { downloadFile, extractZip, extractTar, runLive, tempDir, Spinner } from './base.js';
import { brewAvailable } from '../detect.js';
import { VERSION_CATALOGUE, getVersionUrl } from '../version-picker.js';

// ─── Fetch latest stable release from Flutter API ─────────────────────────────
async function fetchLatestRelease(platform) {
  const apiPlatform = { win32: 'windows', darwin: 'macos', linux: 'linux' }[platform];

  return new Promise((resolve) => {
    const url = `https://storage.googleapis.com/flutter_infra_release/releases/releases_${apiPlatform}.json`;
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json    = JSON.parse(data);
          const channel = json.releases.find((r) => r.channel === 'stable');
          if (!channel) return resolve(null);
          resolve({ version: channel.version, url: `${json.base_url}/${channel.archive}` });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ─── Install Flutter SDK ──────────────────────────────────────────────────────
export async function installFlutter(osInfo, installDir, versionChoice = { value: 'latest' }) {
  const { isWindows, isMac, isLinux, platform, arch } = osInfo;
  const ver = versionChoice.value;

  console.log(chalk.bold.white(`\n  🦋 Installing Flutter SDK ${ver === 'latest' ? '(latest stable)' : ver}`));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log(chalk.gray(`  Install path: ${chalk.cyan(installDir)}`));

  // ─── macOS: try Homebrew first (only for 'latest') ────────────────────────
  if (isMac && ver === 'latest' && brewAvailable()) {
    try {
      console.log(chalk.gray('  Using Homebrew...'));
      await runLive('brew', ['install', '--cask', 'flutter']);
      console.log(chalk.green('\n  ✔ Flutter installed via Homebrew'));
      return { success: true, method: 'brew', installDir: '/opt/homebrew' };
    } catch {
      console.log(chalk.yellow('\n  ⚠ Homebrew install failed, falling back to manual...'));
    }
  }

  // ─── Resolve download URL ─────────────────────────────────────────────────
  let downloadUrl = null;
  let resolvedVer = ver;

  if (ver === 'latest') {
    const spin = new Spinner('Fetching latest Flutter stable release...');
    spin.start();
    const info = await fetchLatestRelease(platform);
    if (info) {
      downloadUrl  = info.url;
      resolvedVer  = info.version;
      spin.succeed(`Latest stable: Flutter ${resolvedVer}`);
    } else {
      spin.warn('Could not fetch release info — using Flutter 3.19.5');
      downloadUrl  = getVersionUrl('flutter', '3.19.5', platform, arch);
      resolvedVer  = '3.19.5';
    }
  } else {
    downloadUrl = getVersionUrl('flutter', ver, platform, arch);
    if (!downloadUrl) throw new Error(`No download URL for Flutter ${ver} on ${platform}`);
    console.log(chalk.gray(`  Version: ${chalk.white(resolvedVer)}`));
  }

  const fileName = downloadUrl.split('/').pop();
  console.log(chalk.gray(`  Archive: ${chalk.cyan(fileName)}\n`));

  // ─── Download ──────────────────────────────────────────────────────────────
  const dest = path.join(tempDir(), fileName);
  if (fs.existsSync(dest)) {
    console.log(chalk.gray('  Archive cached, skipping download'));
  } else {
    await downloadFile(downloadUrl, dest, `Flutter ${resolvedVer}`);
  }

  // ─── Extract ──────────────────────────────────────────────────────────────
  const parentDir = path.dirname(installDir);
  fs.mkdirSync(parentDir, { recursive: true });

  const spin = new Spinner('Extracting Flutter SDK (may take a minute)...');
  spin.start();
  try {
    if (fileName.endsWith('.zip')) {
      await extractZip(dest, parentDir);
    } else {
      await extractTar(dest, parentDir);
    }

    const extractedPath = path.join(parentDir, 'flutter');
    if (extractedPath !== installDir && fs.existsSync(extractedPath)) {
      if (fs.existsSync(installDir)) fs.rmSync(installDir, { recursive: true });
      fs.renameSync(extractedPath, installDir);
    }
    spin.succeed('Flutter SDK extracted successfully');
  } catch (e) {
    spin.fail('Extraction failed');
    throw e;
  }

  // ─── Verify binary ────────────────────────────────────────────────────────
  const flutterBin = path.join(installDir, 'bin', isWindows ? 'flutter.bat' : 'flutter');
  if (!fs.existsSync(flutterBin)) {
    throw new Error(`Flutter binary not found at ${flutterBin}`);
  }

  // ─── Precache ─────────────────────────────────────────────────────────────
  console.log(chalk.gray('\n  Running flutter precache (downloads Dart SDK)...'));
  try {
    await runLive(flutterBin, ['precache', '--no-android', '--no-ios', '--no-web', '--no-fuchsia']);
  } catch {}

  console.log(chalk.green(`\n  ✔ Flutter ${resolvedVer} installed at ${installDir}`));
  return {
    success    : true,
    method     : 'direct',
    installDir,
    version    : resolvedVer,
    flutterBin : path.join(installDir, 'bin'),
  };
}
