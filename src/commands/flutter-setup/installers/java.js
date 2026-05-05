/**
 * java.js — Java JDK 17 installer
 * Windows : winget → direct MSI download (Eclipse Temurin)
 * macOS   : brew install openjdk@17
 * Linux   : apt / dnf / pacman
 */

import { existsSync, mkdirSync } from 'fs';
import path  from 'path';
import chalk from 'chalk';
import { runLive, runSilent, downloadFile, tempDir, Spinner } from './base.js';
import { detectLinuxPkgManager, wingetAvailable, brewAvailable } from '../detect.js';

// Eclipse Temurin JDK 17 direct download URLs
const JAVA_URLS = {
  win32  : 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.msi',
  darwin : 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_mac_hotspot_17.0.10_7.pkg',
  linux  : 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz',
};

// macOS arm64
const JAVA_MAC_ARM = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.10_7.pkg';

export async function installJava(osInfo) {
  const { isWindows, isMac, isLinux, arch } = osInfo;
  const spin = new Spinner('Installing Java JDK 17...');

  console.log(chalk.bold.white('\n  ☕ Installing Java JDK 17 (Eclipse Temurin)'));
  console.log(chalk.gray('  ─────────────────────────────────────────────'));

  // ─── Windows ──────────────────────────────────────────────────────────────
  if (isWindows) {
    if (wingetAvailable()) {
      console.log(chalk.gray('  Using winget...'));
      try {
        await runLive('winget', [
          'install', '--id', 'EclipseAdoptium.Temurin.17.JDK',
          '-e', '--silent',
          '--accept-package-agreements',
          '--accept-source-agreements',
        ]);
        console.log(chalk.green('\n  ✔ Java JDK 17 installed via winget'));
        return { success: true, method: 'winget' };
      } catch {}
    }

    // Chocolatey fallback
    try {
      runSilent('choco --version');
      console.log(chalk.gray('  Using Chocolatey...'));
      await runLive('choco', ['install', 'temurin17', '-y', '--no-progress']);
      console.log(chalk.green('\n  ✔ Java JDK 17 installed via Chocolatey'));
      return { success: true, method: 'choco' };
    } catch {}

    // Direct MSI download
    console.log(chalk.gray('  Downloading Eclipse Temurin JDK 17 MSI...'));
    const dest = path.join(tempDir(), 'jdk17.msi');
    await downloadFile(JAVA_URLS.win32, dest, 'JDK 17');
    console.log(chalk.gray('\n  Running MSI installer (silent)...'));
    spin.start();
    try {
      await runLive('msiexec', ['/i', dest, '/qn', '/norestart', 'ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome']);
      spin.succeed('Java JDK 17 installed successfully');
      return { success: true, method: 'direct-msi' };
    } catch (e) {
      spin.fail('Java install failed');
      throw e;
    }
  }

  // ─── macOS ────────────────────────────────────────────────────────────────
  if (isMac) {
    if (brewAvailable()) {
      console.log(chalk.gray('  Using Homebrew...'));
      await runLive('brew', ['install', 'openjdk@17']);

      // Homebrew's openjdk needs symlinking for the system Java wrappers
      try {
        await runLive('sh', ['-c', 'sudo ln -sfn "$(brew --prefix)/opt/openjdk@17/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true']);
      } catch {}

      console.log(chalk.green('\n  ✔ Java JDK 17 installed via Homebrew'));
      return { success: true, method: 'brew' };
    }

    // Direct PKG download
    const url  = arch === 'arm64' ? JAVA_MAC_ARM : JAVA_URLS.darwin;
    const dest = path.join(tempDir(), 'jdk17.pkg');
    console.log(chalk.gray('  Downloading Eclipse Temurin JDK 17 PKG...'));
    await downloadFile(url, dest, 'JDK 17');
    console.log(chalk.gray('\n  Installing (requires sudo)...'));
    await runLive('sudo', ['installer', '-pkg', dest, '-target', '/']);
    console.log(chalk.green('\n  ✔ Java JDK 17 installed'));
    return { success: true, method: 'pkg' };
  }

  // ─── Linux ────────────────────────────────────────────────────────────────
  if (isLinux) {
    const mgr = detectLinuxPkgManager();
    if (!mgr) throw new Error('No supported package manager found');

    console.log(chalk.gray(`  Using ${mgr.bin}...`));

    const pkgNames = {
      'apt-get': 'openjdk-17-jdk',
      'dnf'    : 'java-17-openjdk-devel',
      'yum'    : 'java-17-openjdk-devel',
      'pacman' : 'jdk17-openjdk',
      'zypper' : 'java-17-openjdk-devel',
    };

    const pkg = pkgNames[mgr.bin] || 'openjdk-17-jdk';
    await runLive('sh', ['-c', `${mgr.update} && ${mgr.install} ${pkg}`]);
    console.log(chalk.green('\n  ✔ Java JDK 17 installed'));
    return { success: true, method: mgr.bin };
  }

  throw new Error('Unsupported OS');
}
