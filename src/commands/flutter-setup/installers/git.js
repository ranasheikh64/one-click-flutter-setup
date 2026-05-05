/**
 * git.js — Git installer
 * Windows : winget → choco fallback → manual .exe download
 * macOS   : brew install git
 * Linux   : apt / dnf / pacman / zypper
 */

import { existsSync, mkdirSync } from 'fs';
import path   from 'path';
import os     from 'os';
import chalk  from 'chalk';
import { runLive, runSilent, downloadFile, tempDir, Spinner } from './base.js';
import { detectLinuxPkgManager, wingetAvailable, brewAvailable } from '../detect.js';

// Windows: latest Git for Windows installer URL (64-bit)
const GIT_WIN_URL = 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe';

export async function installGit(osInfo) {
  const { isWindows, isMac, isLinux } = osInfo;
  const spin = new Spinner('Installing Git...');

  console.log(chalk.bold.white('\n  📦 Installing Git'));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  // ─── Windows ──────────────────────────────────────────────────────────────
  if (isWindows) {
    if (wingetAvailable()) {
      console.log(chalk.gray('  Using winget...'));
      try {
        await runLive('winget', ['install', '--id', 'Git.Git', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements']);
        console.log(chalk.green('\n  ✔ Git installed via winget'));
        return { success: true, method: 'winget' };
      } catch {}
    }

    // Fallback: try chocolatey
    try {
      runSilent('choco --version');
      console.log(chalk.gray('  Using Chocolatey...'));
      await runLive('choco', ['install', 'git', '-y', '--no-progress']);
      console.log(chalk.green('\n  ✔ Git installed via Chocolatey'));
      return { success: true, method: 'choco' };
    } catch {}

    // Fallback: direct download
    console.log(chalk.gray('  Downloading Git installer...'));
    const dest = path.join(tempDir(), 'git-installer.exe');
    await downloadFile(GIT_WIN_URL, dest, 'Git');
    console.log(chalk.gray('\n  Running installer (silent)...'));
    spin.start();
    try {
      await runLive(dest, ['/VERYSILENT', '/NORESTART', '/NOCANCEL', '/SP-', '/CLOSEAPPLICATIONS', '/RESTARTAPPLICATIONS', '/COMPONENTS=icons,ext\\reg\\shellhere,assoc,assoc_sh']);
      spin.succeed('Git installed successfully');
      return { success: true, method: 'direct' };
    } catch (e) {
      spin.fail('Git install failed');
      throw e;
    }
  }

  // ─── macOS ────────────────────────────────────────────────────────────────
  if (isMac) {
    if (brewAvailable()) {
      console.log(chalk.gray('  Using Homebrew...'));
      await runLive('brew', ['install', 'git']);
      console.log(chalk.green('\n  ✔ Git installed via Homebrew'));
      return { success: true, method: 'brew' };
    }
    // macOS fallback: Xcode CLT includes git
    console.log(chalk.gray('  Installing Xcode Command Line Tools (includes git)...'));
    await runLive('xcode-select', ['--install']);
    console.log(chalk.green('\n  ✔ Git installed via Xcode CLT'));
    return { success: true, method: 'xcode-clt' };
  }

  // ─── Linux ────────────────────────────────────────────────────────────────
  if (isLinux) {
    const mgr = detectLinuxPkgManager();
    if (!mgr) throw new Error('No supported package manager found (apt/dnf/pacman/zypper)');

    console.log(chalk.gray(`  Using ${mgr.bin}...`));
    await runLive('sh', ['-c', `${mgr.update} && ${mgr.install} git`]);
    console.log(chalk.green('\n  ✔ Git installed'));
    return { success: true, method: mgr.bin };
  }

  throw new Error('Unsupported OS');
}
