/**
 * index.js — Flutter Setup Orchestrator
 *
 * Full flow:
 *  1. Show banner
 *  2. Detect OS + current tool status
 *  3. Show table + ask install permissions (per tool)
 *  4. Install each selected tool in order
 *  5. Configure PATH
 *  6. Check IDEs
 *  7. Verify everything
 *  8. Show next steps
 */

import chalk    from 'chalk';
import boxen    from 'boxen';
import gradient from 'gradient-string';
import inquirer from 'inquirer';

import { detectOS, detectTools }             from './detect.js';
import { showToolsTable, askInstallPermissions, askInstallPath } from './prompts.js';
import { setupPaths }                        from './path-setup.js';
import { checkIDEs }                         from './ide-check.js';
import { verifyInstallation }                from './verify.js';

import { installGit }        from './installers/git.js';
import { installJava }       from './installers/java.js';
import { installNode }       from './installers/nodejs.js';
import { installFlutter }    from './installers/flutter.js';
import { installAndroid }    from './installers/android.js';
import { installFlutterFire } from './installers/flutterfire.js';

// ─── Banner ───────────────────────────────────────────────────────────────────
function showSetupBanner() {
  console.clear();
  const title = gradient(['#00d2ff', '#3a7bd5', '#a855f7']).multiline(
    '  ╔═══════════════════════════════════════════╗\n' +
    '  ║    🦋  Flutter One-Click Setup CLI         ║\n' +
    '  ╚═══════════════════════════════════════════╝'
  );
  console.log('\n' + title);

  console.log(
    boxen(
      chalk.bold.white('  Auto-installs everything you need for Flutter:\n') +
      chalk.gray('  Git  •  Java JDK 17  •  Node.js  •  Flutter SDK\n') +
      chalk.gray('  Android SDK  •  FlutterFire CLI\n\n') +
      chalk.gray('  Works on ') +
      chalk.cyan('Windows') + chalk.gray('  •  ') +
      chalk.cyan('macOS') + chalk.gray('  •  ') +
      chalk.cyan('Linux'),
      {
        padding    : 1,
        margin     : { top: 0, bottom: 1, left: 2 },
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

// ─── OS badge ─────────────────────────────────────────────────────────────────
function showOSBadge(osInfo) {
  const os = osInfo.isWindows ? '🪟 Windows' : osInfo.isMac ? '🍎 macOS' : '🐧 Linux';
  const arch = osInfo.arch === 'arm64' ? 'ARM64' : 'x64';
  console.log(chalk.gray(`  Detected OS: `) + chalk.cyan.bold(os) + chalk.gray(` (${arch})\n`));
}

// ─── Install order (dependency-aware) ────────────────────────────────────────
const INSTALL_ORDER = ['git', 'java', 'node', 'flutter', 'androidSdk', 'flutterfire'];

// ─── Run a single installer ───────────────────────────────────────────────────
async function runInstaller(key, osInfo, installPaths) {
  switch (key) {
    case 'git':
      return await installGit(osInfo);

    case 'java':
      return await installJava(osInfo);

    case 'node':
      return await installNode(osInfo);

    case 'flutter': {
      const result = await installFlutter(osInfo, installPaths.flutter);
      if (result.installDir) installPaths.flutter = result.installDir;
      return result;
    }

    case 'androidSdk': {
      const result = await installAndroid(osInfo, installPaths.android);
      if (result.androidHome) installPaths.android = result.androidHome;
      return result;
    }

    case 'flutterfire':
      return await installFlutterFire(osInfo, installPaths.flutter);

    default:
      throw new Error(`Unknown tool: ${key}`);
  }
}

// ─── Print section header ─────────────────────────────────────────────────────
function sectionHeader(step, total, title) {
  console.log('');
  console.log(
    chalk.gray(`  [${ step}/${total}] `) +
    chalk.bold.white(title)
  );
}

// ─── Next steps guide ─────────────────────────────────────────────────────────
function showNextSteps(osInfo) {
  console.log('');
  console.log(
    boxen(
      chalk.bold.cyan('  🚀 Next Steps\n\n') +
      chalk.white('  1. ') + chalk.yellow('Restart your terminal') + chalk.gray(' (for PATH changes to take effect)\n') +
      chalk.white('  2. ') + chalk.cyan('flutter doctor') + chalk.gray(' — verify your Flutter setup\n') +
      chalk.white('  3. ') + chalk.cyan('flutter create my_app') + chalk.gray(' — create your first app\n') +
      chalk.white('  4. ') + chalk.cyan('cd my_app && flutter run') + chalk.gray(' — run it!\n\n') +

      chalk.gray('  ─────────────────────────────────────────────────\n') +
      chalk.bold.white('  Useful Links\n\n') +
      chalk.gray('  📘 Flutter docs  →  ') + chalk.cyan('https://flutter.dev/docs\n') +
      chalk.gray('  🔥 Firebase      →  ') + chalk.cyan('https://firebase.google.com\n') +
      chalk.gray('  💬 Community     →  ') + chalk.cyan('https://discord.gg/flutter') +
      (osInfo.isWindows
        ? '\n\n' + chalk.yellow('  ⚠ Windows: Run ') + chalk.white('flutter doctor --android-licenses') +
          chalk.yellow('\n     if Android licenses warning appears.')
        : ''),
      {
        padding    : 1,
        margin     : { top: 0, bottom: 1, left: 2 },
        borderStyle: 'round',
        borderColor: 'green',
      }
    )
  );
}

// ─── MAIN ENTRY ───────────────────────────────────────────────────────────────
export async function runFlutterSetup() {
  showSetupBanner();

  // ── Step 1: Detect ─────────────────────────────────────────────────────────
  const osInfo = detectOS();
  showOSBadge(osInfo);

  console.log(chalk.gray('  Scanning installed tools...\n'));
  const toolStatus = detectTools();

  // ── Step 2: Show table + ask permissions ───────────────────────────────────
  showToolsTable(toolStatus);
  const toInstall = await askInstallPermissions(toolStatus);

  if (toInstall.length === 0) {
    // Nothing to install — still run IDE check + verify
    checkIDEs();
    await verifyInstallation();
    showNextSteps(osInfo);
    return;
  }

  // ── Step 3: Ask custom install paths (for Flutter + Android) ───────────────
  const installPaths = {
    flutter : osInfo.flutterDir,
    android : osInfo.androidDir,
    java    : null,
    node    : null,
    dartPubCache: true,
  };

  if (toInstall.includes('flutter')) {
    installPaths.flutter = await askInstallPath(osInfo.flutterDir, 'Flutter SDK');
  }
  if (toInstall.includes('androidSdk')) {
    installPaths.android = await askInstallPath(osInfo.androidDir, 'Android SDK');
  }

  // ── Step 4: Install tools in dependency order ──────────────────────────────
  const selected   = INSTALL_ORDER.filter((k) => toInstall.includes(k));
  const total      = selected.length;
  const results    = {};
  const failed     = [];

  for (let i = 0; i < selected.length; i++) {
    const key = selected[i];
    sectionHeader(i + 1, total, `Installing ${labelOf(key)}...`);

    try {
      results[key] = await runInstaller(key, osInfo, installPaths);
    } catch (err) {
      console.log('');
      console.log(chalk.red(`  ✖ Failed to install ${labelOf(key)}: ${err.message}`));
      console.log(chalk.gray('  Continuing with remaining tools...\n'));
      failed.push({ key, error: err.message });
      results[key] = { success: false, error: err.message };
    }
  }

  // ── Step 5: Configure PATH ──────────────────────────────────────────────────
  sectionHeader(total + 1, total + 3, 'Configuring PATH');
  try {
    const pathResults = setupPaths(osInfo, installPaths);
    if (pathResults.length > 0) {
      if (osInfo.isWindows) {
        console.log(chalk.green('  ✔ PATH updated via setx (user environment)'));
        console.log(chalk.gray('    Restart your terminal for changes to take effect'));
      } else {
        const updated = pathResults[0]?.updated || [];
        console.log(chalk.green(`  ✔ PATH updated in: ${updated.join(', ')}`));
      }
    }
  } catch (e) {
    console.log(chalk.yellow(`  ⚠ PATH configuration warning: ${e.message}`));
  }

  // ── Step 6: IDE Check ──────────────────────────────────────────────────────
  sectionHeader(total + 2, total + 3, 'Checking IDEs');
  checkIDEs();

  // ── Step 7: Verify ─────────────────────────────────────────────────────────
  sectionHeader(total + 3, total + 3, 'Verifying Installation');
  await verifyInstallation();

  // ── Step 8: Failed summary ─────────────────────────────────────────────────
  if (failed.length > 0) {
    console.log('');
    console.log(chalk.red.bold('  ✖ Some tools failed to install:'));
    for (const f of failed) {
      console.log(chalk.gray(`    • ${labelOf(f.key)}: `) + chalk.red(f.error));
    }
    console.log(chalk.gray('\n  Please install them manually and re-run this setup.\n'));
  }

  // ── Step 9: Next steps ─────────────────────────────────────────────────────
  showNextSteps(osInfo);
}

// ─── Label helper ─────────────────────────────────────────────────────────────
function labelOf(key) {
  const labels = {
    git        : 'Git',
    java       : 'Java JDK 17',
    node       : 'Node.js LTS',
    flutter    : 'Flutter SDK',
    androidSdk : 'Android SDK',
    flutterfire: 'FlutterFire CLI',
  };
  return labels[key] || key;
}
