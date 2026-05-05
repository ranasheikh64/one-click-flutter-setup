/**
 * java.js — Java JDK installer (version-aware)
 * Supports JDK 11 / 17 / 21 via Eclipse Temurin
 * Version info comes from version-picker.js catalogue
 */

import chalk from 'chalk';
import path  from 'path';
import { runLive, runSilent, downloadFile, tempDir, Spinner } from './base.js';
import { detectLinuxPkgManager, wingetAvailable, brewAvailable } from '../detect.js';
import { getWingetId, getBrewFormula, getLinuxPkg, getVersionUrl } from '../version-picker.js';

export async function installJava(osInfo, versionChoice = { value: '17' }) {
  const { isWindows, isMac, isLinux, arch } = osInfo;
  const ver  = versionChoice.value;
  const spin = new Spinner(`Installing Java JDK ${ver}...`);

  console.log(chalk.bold.white(`\n  ☕ Installing Java JDK ${ver} (Eclipse Temurin)`));
  console.log(chalk.gray('  ─────────────────────────────────────────────'));

  // ─── Windows ──────────────────────────────────────────────────────────────
  if (isWindows) {
    const wingetId = getWingetId('java', ver);

    if (wingetAvailable() && wingetId) {
      console.log(chalk.gray(`  Using winget (${wingetId})...`));
      try {
        await runLive('winget', [
          'install', '--id', wingetId,
          '-e', '--silent',
          '--accept-package-agreements',
          '--accept-source-agreements',
        ]);
        console.log(chalk.green(`\n  ✔ Java JDK ${ver} installed via winget`));
        return { success: true, method: 'winget', version: ver };
      } catch {}
    }

    // Chocolatey fallback
    try {
      runSilent('choco --version');
      const chocoMap = { '11': 'temurin11', '17': 'temurin17', '21': 'temurin21' };
      const chocoPkg = chocoMap[ver] || 'temurin17';
      console.log(chalk.gray(`  Using Chocolatey (${chocoPkg})...`));
      await runLive('choco', ['install', chocoPkg, '-y', '--no-progress']);
      console.log(chalk.green(`\n  ✔ Java JDK ${ver} installed via Chocolatey`));
      return { success: true, method: 'choco', version: ver };
    } catch {}

    // Direct MSI download
    const url = getVersionUrl('java', ver, 'win32', arch);
    if (!url) throw new Error(`No download URL found for Java JDK ${ver} on Windows`);

    console.log(chalk.gray(`  Downloading Eclipse Temurin JDK ${ver} MSI...`));
    const dest = path.join(tempDir(), `jdk${ver}.msi`);
    await downloadFile(url, dest, `JDK ${ver}`);
    console.log(chalk.gray('\n  Running MSI installer (silent)...'));
    spin.start();
    try {
      await runLive('msiexec', ['/i', dest, '/qn', '/norestart',
        'ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome']);
      spin.succeed(`Java JDK ${ver} installed successfully`);
      return { success: true, method: 'direct-msi', version: ver };
    } catch (e) {
      spin.fail(`Java JDK ${ver} install failed`);
      throw e;
    }
  }

  // ─── macOS ────────────────────────────────────────────────────────────────
  if (isMac) {
    const formula = getBrewFormula('java', ver);

    if (brewAvailable() && formula) {
      console.log(chalk.gray(`  Using Homebrew (${formula})...`));
      await runLive('brew', ['install', formula]);
      try {
        await runLive('sh', ['-c',
          `sudo ln -sfn "$(brew --prefix)/opt/${formula}/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-${ver}.jdk 2>/dev/null || true`
        ]);
      } catch {}
      console.log(chalk.green(`\n  ✔ Java JDK ${ver} installed via Homebrew`));
      return { success: true, method: 'brew', version: ver };
    }

    const url = getVersionUrl('java', ver, 'darwin', arch);
    if (!url) throw new Error(`No download URL for Java JDK ${ver} on macOS`);
    const dest = path.join(tempDir(), `jdk${ver}.pkg`);
    console.log(chalk.gray(`  Downloading Eclipse Temurin JDK ${ver} PKG...`));
    await downloadFile(url, dest, `JDK ${ver}`);
    console.log(chalk.gray('\n  Installing (requires sudo)...'));
    await runLive('sudo', ['installer', '-pkg', dest, '-target', '/']);
    console.log(chalk.green(`\n  ✔ Java JDK ${ver} installed`));
    return { success: true, method: 'pkg', version: ver };
  }

  // ─── Linux ────────────────────────────────────────────────────────────────
  if (isLinux) {
    const mgr = detectLinuxPkgManager();
    if (!mgr) throw new Error('No supported package manager found');
    const pkg = getLinuxPkg('java', ver, mgr.bin) || `openjdk-${ver}-jdk`;
    console.log(chalk.gray(`  Using ${mgr.bin} (${pkg})...`));
    await runLive('sh', ['-c', `${mgr.update} && ${mgr.install} ${pkg}`]);
    console.log(chalk.green(`\n  ✔ Java JDK ${ver} installed`));
    return { success: true, method: mgr.bin, version: ver };
  }

  throw new Error('Unsupported OS');
}
