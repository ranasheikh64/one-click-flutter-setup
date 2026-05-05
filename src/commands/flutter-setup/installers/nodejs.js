/**
 * nodejs.js — Node.js installer (version-aware)
 * Supports Node 18 LTS / 20 LTS / 22 Latest
 * Version info comes from version-picker.js catalogue
 */

import path  from 'path';
import os    from 'os';
import chalk from 'chalk';
import { runLive, runSilent, downloadFile, tempDir, Spinner } from './base.js';
import { detectLinuxPkgManager, wingetAvailable, brewAvailable } from '../detect.js';
import { VERSION_CATALOGUE } from '../version-picker.js';

const NVM_INSTALL_SCRIPT = 'https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh';

export async function installNode(osInfo, versionChoice = { value: '20' }) {
  const { isWindows, isMac, isLinux } = osInfo;
  const ver  = versionChoice.value;
  const spin = new Spinner(`Installing Node.js ${ver}...`);

  console.log(chalk.bold.white(`\n  🟢 Installing Node.js ${ver}`));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  // Look up metadata for chosen version
  const catalogue = VERSION_CATALOGUE.node;
  const chosen    = catalogue.choices.find((c) => c.value === ver) || catalogue.choices[1];
  const msiUrl    = chosen.msiUrl;
  const wingetId  = chosen.wingetId;

  // ─── Windows ──────────────────────────────────────────────────────────────
  if (isWindows) {
    if (wingetAvailable() && wingetId) {
      console.log(chalk.gray(`  Using winget (${wingetId})...`));
      try {
        await runLive('winget', [
          'install', '--id', wingetId,
          '-e', '--silent',
          '--accept-package-agreements',
          '--accept-source-agreements',
        ]);
        console.log(chalk.green(`\n  ✔ Node.js ${ver} installed via winget`));
        return { success: true, method: 'winget', version: ver };
      } catch {}
    }

    // nvm-windows fallback
    try {
      runSilent('nvm --version');
      console.log(chalk.gray(`  Using nvm-windows (node ${ver})...`));
      await runLive('nvm', ['install', ver]);
      await runLive('nvm', ['use', ver]);
      console.log(chalk.green(`\n  ✔ Node.js ${ver} installed via nvm`));
      return { success: true, method: 'nvm', version: ver };
    } catch {}

    // Direct MSI download
    if (!msiUrl) throw new Error(`No MSI URL for Node.js ${ver}`);
    console.log(chalk.gray(`  Downloading Node.js ${ver} MSI...`));
    const dest = path.join(tempDir(), `node-${ver}.msi`);
    await downloadFile(msiUrl, dest, `Node.js ${ver}`);
    console.log(chalk.gray('\n  Running installer (silent)...'));
    spin.start();
    try {
      await runLive('msiexec', ['/i', dest, '/qn', '/norestart']);
      spin.succeed(`Node.js ${ver} installed successfully`);
      return { success: true, method: 'direct-msi', version: ver };
    } catch (e) {
      spin.fail(`Node.js ${ver} install failed`);
      throw e;
    }
  }

  // ─── macOS ────────────────────────────────────────────────────────────────
  if (isMac) {
    if (brewAvailable()) {
      // brew doesn't always have specific minor versions, use nvm for precision
      if (ver === '20' || ver === '18') {
        console.log(chalk.gray(`  Using Homebrew...`));
        await runLive('brew', ['install', `node@${ver}`]);
        console.log(chalk.green(`\n  ✔ Node.js ${ver} installed via Homebrew`));
        return { success: true, method: 'brew', version: ver };
      }
      console.log(chalk.gray(`  Using Homebrew (node)...`));
      await runLive('brew', ['install', 'node']);
      console.log(chalk.green(`\n  ✔ Node.js installed via Homebrew`));
      return { success: true, method: 'brew', version: ver };
    }
    return await installViaNVM(ver);
  }

  // ─── Linux ────────────────────────────────────────────────────────────────
  if (isLinux) {
    console.log(chalk.gray(`  Installing via NVM (node ${ver})...`));
    try {
      return await installViaNVM(ver);
    } catch {}

    const mgr = detectLinuxPkgManager();
    if (!mgr) throw new Error('No supported package manager found');

    console.log(chalk.gray(`  Falling back to ${mgr.bin} + NodeSource...`));
    if (mgr.bin === 'apt-get') {
      await runLive('sh', ['-c',
        `curl -fsSL https://deb.nodesource.com/setup_${ver}.x | sudo -E bash - && sudo apt-get install -y nodejs`
      ]);
    } else {
      await runLive('sh', ['-c', `${mgr.update} && ${mgr.install} nodejs npm`]);
    }
    console.log(chalk.green(`\n  ✔ Node.js installed`));
    return { success: true, method: mgr.bin, version: ver };
  }

  throw new Error('Unsupported OS');
}

// ─── NVM install helper ───────────────────────────────────────────────────────
async function installViaNVM(ver) {
  const home   = os.homedir();
  const nvmDir = path.join(home, '.nvm');
  const dest   = path.join(tempDir(), 'nvm-install.sh');

  await downloadFile(NVM_INSTALL_SCRIPT, dest, 'NVM script');
  await runLive('bash', [dest]);

  const nvmCmd = `export NVM_DIR="${nvmDir}" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install ${ver} && nvm use ${ver} && nvm alias default ${ver}`;
  await runLive('bash', ['-c', nvmCmd]);
  console.log(chalk.green(`\n  ✔ Node.js ${ver} installed via NVM`));
  return { success: true, method: 'nvm', version: ver };
}
