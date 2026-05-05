/**
 * index.js — Flutter Setup Orchestrator
 *
 * Full flow:
 *  1. Show banner
 *  2. Detect OS + current tool status
 *  3. Show table + ask install permissions (per tool, checkbox)
 *  4. Pick versions for each selected tool (with Recommended defaults)
 *  5. Ask install paths for Flutter + Android
 *  6. Install each tool in dependency order
 *  7. Configure PATH
 *  8. Check IDEs
 *  9. Verify everything
 * 10. Show next steps
 */

import chalk    from 'chalk';
import boxen    from 'boxen';
import gradient from 'gradient-string';

import { detectOS, detectTools }                          from './detect.js';
import { showToolsTable, askInstallPermissions, askInstallPath } from './prompts.js';
import { pickVersions }                                   from './version-picker.js';
import { setupPaths }                                     from './path-setup.js';
import { checkIDEs }                                      from './ide-check.js';
import { verifyInstallation }                             from './verify.js';

import { installGit }         from './installers/git.js';
import { installJava }        from './installers/java.js';
import { installNode }        from './installers/nodejs.js';
import { installFlutter }     from './installers/flutter.js';
import { installAndroid }     from './installers/android.js';
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
      chalk.gray('  Git  •  Java JDK  •  Node.js  •  Flutter SDK\n') +
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
  const os   = osInfo.isWindows ? '🪟 Windows' : osInfo.isMac ? '🍎 macOS' : '🐧 Linux';
  const arch = osInfo.arch === 'arm64' ? 'ARM64' : 'x64';
  console.log(chalk.gray(`  Detected OS: `) + chalk.cyan.bold(os) + chalk.gray(` (${arch})\n`));
}

// ─── Install order (dependency-aware) ────────────────────────────────────────
const INSTALL_ORDER = ['git', 'java', 'node', 'flutter', 'androidSdk', 'flutterfire'];

// ─── Label map ────────────────────────────────────────────────────────────────
function labelOf(key) {
  return {
    git        : 'Git',
    java       : 'Java JDK',
    node       : 'Node.js',
    flutter    : 'Flutter SDK',
    androidSdk : 'Android SDK',
    flutterfire: 'FlutterFire CLI',
  }[key] || key;
}

// ─── Run a single installer ───────────────────────────────────────────────────
async function runInstaller(key, osInfo, installPaths, versions) {
  const vc = versions[key] || null;   // { value, meta } from version-picker

  switch (key) {
    case 'git':
      return await installGit(osInfo);

    case 'java':
      return await installJava(osInfo, vc);

    case 'node':
      return await installNode(osInfo, vc);

    case 'flutter': {
      const result = await installFlutter(osInfo, installPaths.flutter, vc);
      if (result.installDir) installPaths.flutter = result.installDir;
      return result;
    }

    case 'androidSdk': {
      const result = await installAndroid(osInfo, installPaths.android, vc);
      if (result.androidHome) installPaths.android = result.androidHome;
      return result;
    }

    case 'flutterfire':
      return await installFlutterFire(osInfo, installPaths.flutter);

    default:
      throw new Error(`Unknown tool: ${key}`);
  }
}

// ─── Section header ───────────────────────────────────────────────────────────
function sectionHeader(step, total, title) {
  console.log('');
  console.log(chalk.gray(`  [${step}/${total}] `) + chalk.bold.white(title));
}

// ─── Next steps ───────────────────────────────────────────────────────────────
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
        ? '\n\n' + chalk.yellow('  ⚠  Run ') + chalk.white('flutter doctor --android-licenses') +
          chalk.yellow('\n     if Android license warning appears.')
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

  // ── Step 2: Show table + select tools to install ───────────────────────────
  showToolsTable(toolStatus);
  const toInstall = await askInstallPermissions(toolStatus);

  if (toInstall.length === 0) {
    checkIDEs();
    await verifyInstallation();
    showNextSteps(osInfo);
    return;
  }

  // ── Step 3: Version selection ──────────────────────────────────────────────
  const versions = await pickVersions(toInstall);

  // ── Step 4: Install paths ──────────────────────────────────────────────────
  const installPaths = {
    flutter     : osInfo.flutterDir,
    android     : osInfo.androidDir,
    java        : null,
    node        : null,
    dartPubCache: true,
  };

  if (toInstall.includes('flutter')) {
    installPaths.flutter = await askInstallPath(osInfo.flutterDir, 'Flutter SDK');
  }
  if (toInstall.includes('androidSdk')) {
    installPaths.android = await askInstallPath(osInfo.androidDir, 'Android SDK');
  }

  // ── Step 5: Install tools in dependency order ──────────────────────────────
  const selected = INSTALL_ORDER.filter((k) => toInstall.includes(k));
  const total    = selected.length;
  const results  = {};
  const failed   = [];

  for (let i = 0; i < selected.length; i++) {
    const key = selected[i];
    const vc  = versions[key];
    const verLabel = vc ? chalk.gray(` (${vc.meta?.short || vc.value})`) : '';
    sectionHeader(i + 1, total, `Installing ${labelOf(key)}${verLabel}`);

    try {
      results[key] = await runInstaller(key, osInfo, installPaths, versions);
    } catch (err) {
      console.log('');
      console.log(chalk.red(`  ✖ Failed to install ${labelOf(key)}: ${err.message}`));
      console.log(chalk.gray('  Continuing with remaining tools...\n'));
      failed.push({ key, error: err.message });
      results[key] = { success: false, error: err.message };
    }
  }

  // ── Step 6: Configure PATH ──────────────────────────────────────────────────
  sectionHeader(total + 1, total + 3, 'Configuring PATH');
  try {
    const pathResults = setupPaths(osInfo, installPaths);
    if (pathResults.length > 0) {
      if (osInfo.isWindows) {
        console.log(chalk.green('  ✔ PATH updated via setx (user environment)'));
        console.log(chalk.gray('    Restart terminal for changes to take effect'));
      } else {
        const updated = pathResults[0]?.updated || [];
        console.log(chalk.green(`  ✔ PATH updated in: ${updated.join(', ')}`));
      }
    }
  } catch (e) {
    console.log(chalk.yellow(`  ⚠ PATH configuration warning: ${e.message}`));
  }

  // ── Step 7: IDE Check ──────────────────────────────────────────────────────
  sectionHeader(total + 2, total + 3, 'Checking IDEs');
  checkIDEs();

  // ── Step 8: Verify ─────────────────────────────────────────────────────────
  sectionHeader(total + 3, total + 3, 'Verifying Installation');
  await verifyInstallation();

  // ── Failed summary ─────────────────────────────────────────────────────────
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
