/**
 * nodejs.js — Node.js LTS installer
 * Windows : winget → nvm-windows → direct MSI
 * macOS   : brew install node
 * Linux   : nvm → apt/dnf/pacman fallback
 */

import path  from 'path';
import os    from 'os';
import chalk from 'chalk';
import { runLive, runSilent, downloadFile, tempDir, Spinner } from './base.js';
import { detectLinuxPkgManager, wingetAvailable, brewAvailable } from '../detect.js';

const NODE_WIN_MSI = 'https://nodejs.org/dist/v20.12.0/node-v20.12.0-x64.msi';
const NVM_INSTALL_SCRIPT = 'https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh';

export async function installNode(osInfo) {
  const { isWindows, isMac, isLinux } = osInfo;
  const spin = new Spinner('Installing Node.js LTS...');

  console.log(chalk.bold.white('\n  🟢 Installing Node.js LTS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  // ─── Windows ──────────────────────────────────────────────────────────────
  if (isWindows) {
    if (wingetAvailable()) {
      console.log(chalk.gray('  Using winget...'));
      try {
        await runLive('winget', [
          'install', '--id', 'OpenJS.NodeJS.LTS',
          '-e', '--silent',
          '--accept-package-agreements',
          '--accept-source-agreements',
        ]);
        console.log(chalk.green('\n  ✔ Node.js LTS installed via winget'));
        return { success: true, method: 'winget' };
      } catch {}
    }

    // Try nvm-windows
    try {
      runSilent('nvm --version');
      console.log(chalk.gray('  Using nvm-windows...'));
      await runLive('nvm', ['install', 'lts']);
      await runLive('nvm', ['use', 'lts']);
      console.log(chalk.green('\n  ✔ Node.js LTS installed via nvm'));
      return { success: true, method: 'nvm' };
    } catch {}

    // Direct MSI download
    console.log(chalk.gray('  Downloading Node.js MSI...'));
    const dest = path.join(tempDir(), 'node-lts.msi');
    await downloadFile(NODE_WIN_MSI, dest, 'Node.js');
    console.log(chalk.gray('\n  Running installer (silent)...'));
    spin.start();
    try {
      await runLive('msiexec', ['/i', dest, '/qn', '/norestart']);
      spin.succeed('Node.js LTS installed successfully');
      return { success: true, method: 'direct-msi' };
    } catch (e) {
      spin.fail('Node.js install failed');
      throw e;
    }
  }

  // ─── macOS ────────────────────────────────────────────────────────────────
  if (isMac) {
    if (brewAvailable()) {
      console.log(chalk.gray('  Using Homebrew...'));
      await runLive('brew', ['install', 'node']);
      console.log(chalk.green('\n  ✔ Node.js installed via Homebrew'));
      return { success: true, method: 'brew' };
    }

    // NVM fallback
    console.log(chalk.gray('  Installing via NVM...'));
    return await installViaLVM(isWindows);
  }

  // ─── Linux ────────────────────────────────────────────────────────────────
  if (isLinux) {
    // Prefer NVM for better version management
    console.log(chalk.gray('  Installing via NVM (recommended for Linux)...'));
    try {
      return await installViaLVM(false);
    } catch {}

    // Fallback to system package manager
    const mgr = detectLinuxPkgManager();
    if (!mgr) throw new Error('No supported package manager found');

    console.log(chalk.gray(`  Falling back to ${mgr.bin}...`));

    // NodeSource repo setup for apt
    if (mgr.bin === 'apt-get') {
      await runLive('sh', ['-c',
        'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs'
      ]);
    } else {
      await runLive('sh', ['-c', `${mgr.update} && ${mgr.install} nodejs npm`]);
    }

    console.log(chalk.green('\n  ✔ Node.js installed'));
    return { success: true, method: mgr.bin };
  }

  throw new Error('Unsupported OS');
}

// ─── Install via NVM (shared Mac/Linux) ──────────────────────────────────────
async function installViaLVM(isWindows) {
  const home   = os.homedir();
  const nvmDir = path.join(home, '.nvm');
  const dest   = path.join(tempDir(), 'nvm-install.sh');

  await downloadFile(NVM_INSTALL_SCRIPT, dest, 'NVM install');
  await runLive('bash', [dest]);

  // Source NVM and install LTS
  const nvmCmd = `export NVM_DIR="${nvmDir}" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install --lts && nvm use --lts`;
  await runLive('bash', ['-c', nvmCmd]);

  console.log(chalk.green('\n  ✔ Node.js LTS installed via NVM'));
  return { success: true, method: 'nvm' };
}
