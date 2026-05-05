/**
 * version-picker.js — Per-tool version selection
 * Shows curated version lists with Recommended / Latest badges
 * Called after tool selection, before installation begins
 */

import inquirer from 'inquirer';
import chalk    from 'chalk';

// ─── Version badges ───────────────────────────────────────────────────────────
const REC    = chalk.green.bold(' ⭐ Recommended');
const NEW    = chalk.cyan.bold(' 🆕 Latest');
const OLD    = chalk.gray(' (older LTS)');
const COMPAT = chalk.yellow(' ⚠ Check compatibility');

// ─── Version catalogue ────────────────────────────────────────────────────────
export const VERSION_CATALOGUE = {
  java: {
    label: 'Java JDK',
    defaultValue: '17',
    choices: [
      {
        name : `JDK 21  ${NEW}  ${chalk.gray('Latest LTS — Spring Boot 3, Kotlin')}`,
        value: '21',
        short: 'JDK 21',
        urls : {
          win32 : 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_x64_windows_hotspot_21.0.3_9.msi',
          darwin: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_x64_mac_hotspot_21.0.3_9.pkg',
          darwinArm: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.3_9.pkg',
          linux : 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_x64_linux_hotspot_21.0.3_9.tar.gz',
          winget: 'EclipseAdoptium.Temurin.21.JDK',
          brew  : 'openjdk@21',
          apt   : 'openjdk-21-jdk',
          dnf   : 'java-21-openjdk-devel',
          pacman: 'jdk21-openjdk',
        },
      },
      {
        name : `JDK 17${REC}  ${chalk.gray('Perfect for Flutter Android builds')}`,
        value: '17',
        short: 'JDK 17',
        urls : {
          win32 : 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.msi',
          darwin: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_mac_hotspot_17.0.10_7.pkg',
          darwinArm: 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.10_7.pkg',
          linux : 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz',
          winget: 'EclipseAdoptium.Temurin.17.JDK',
          brew  : 'openjdk@17',
          apt   : 'openjdk-17-jdk',
          dnf   : 'java-17-openjdk-devel',
          pacman: 'jdk17-openjdk',
        },
      },
      {
        name : `JDK 11${OLD}  ${chalk.gray('Minimum for older Android projects')}`,
        value: '11',
        short: 'JDK 11',
        urls : {
          win32 : 'https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.22%2B7/OpenJDK11U-jdk_x64_windows_hotspot_11.0.22_7.msi',
          darwin: 'https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.22%2B7/OpenJDK11U-jdk_x64_mac_hotspot_11.0.22_7.pkg',
          darwinArm: 'https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.22%2B7/OpenJDK11U-jdk_aarch64_mac_hotspot_11.0.22_7.pkg',
          linux : 'https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.22%2B7/OpenJDK11U-jdk_x64_linux_hotspot_11.0.22_7.tar.gz',
          winget: 'EclipseAdoptium.Temurin.11.JDK',
          brew  : 'openjdk@11',
          apt   : 'openjdk-11-jdk',
          dnf   : 'java-11-openjdk-devel',
          pacman: 'jdk11-openjdk',
        },
      },
    ],
  },

  node: {
    label: 'Node.js',
    defaultValue: '20',
    choices: [
      {
        name : `Node.js 22${NEW}  ${chalk.gray('Fastest, latest features')}`,
        value: '22',
        short: 'Node 22',
        msiUrl: 'https://nodejs.org/dist/v22.4.0/node-v22.4.0-x64.msi',
        wingetId: 'OpenJS.NodeJS',
      },
      {
        name : `Node.js 20 LTS${REC}  ${chalk.gray('Most stable for FlutterFire')}`,
        value: '20',
        short: 'Node 20 LTS',
        msiUrl: 'https://nodejs.org/dist/v20.12.0/node-v20.12.0-x64.msi',
        wingetId: 'OpenJS.NodeJS.LTS',
      },
      {
        name : `Node.js 18 LTS${OLD}  ${chalk.gray('Minimum required version')}`,
        value: '18',
        short: 'Node 18 LTS',
        msiUrl: 'https://nodejs.org/dist/v18.20.2/node-v18.20.2-x64.msi',
        wingetId: 'OpenJS.NodeJS',
      },
    ],
  },

  flutter: {
    label: 'Flutter SDK',
    defaultValue: 'latest',
    choices: [
      {
        name : `Latest Stable${REC}  ${chalk.gray('Auto-fetched from flutter.dev')}`,
        value: 'latest',
        short: 'Flutter Latest Stable',
      },
      {
        name : `Flutter 3.22.x  ${chalk.gray('Recent stable, Dart 3.4')}`,
        value: '3.22.3',
        short: 'Flutter 3.22.3',
        urls : {
          win32 : 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.22.3-stable.zip',
          darwin: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.22.3-stable.tar.xz',
          darwinArm: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.22.3-stable.tar.xz',
          linux : 'https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.22.3-stable.tar.xz',
        },
      },
      {
        name : `Flutter 3.19.x  ${chalk.gray('Widely tested, very stable')}`,
        value: '3.19.5',
        short: 'Flutter 3.19.5',
        urls : {
          win32 : 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.19.5-stable.zip',
          darwin: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.19.5-stable.tar.xz',
          darwinArm: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.19.5-stable.tar.xz',
          linux : 'https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.19.5-stable.tar.xz',
        },
      },
      {
        name : `Flutter 3.16.x${OLD}  ${chalk.gray('Older stable')}${COMPAT}`,
        value: '3.16.9',
        short: 'Flutter 3.16.9',
        urls : {
          win32 : 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.16.9-stable.zip',
          darwin: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.16.9-stable.tar.xz',
          darwinArm: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.16.9-stable.tar.xz',
          linux : 'https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.16.9-stable.tar.xz',
        },
      },
    ],
  },

  androidSdk: {
    label: 'Android SDK Target API',
    defaultValue: '34',
    choices: [
      {
        name : `API 35  Android 15${NEW}  ${chalk.gray('Very latest, fewer apps support it')}`,
        value: '35',
        short: 'API 35',
        buildTools: '35.0.0',
        platform  : 'platforms;android-35',
      },
      {
        name : `API 34  Android 14${REC}  ${chalk.gray('Required for Play Store submissions')}`,
        value: '34',
        short: 'API 34',
        buildTools: '34.0.0',
        platform  : 'platforms;android-34',
      },
      {
        name : `API 33  Android 13${OLD}  ${chalk.gray('Widely compatible')}`,
        value: '33',
        short: 'API 33',
        buildTools: '33.0.2',
        platform  : 'platforms;android-33',
      },
    ],
  },
};

// ─── Prompt for a single tool version ────────────────────────────────────────
async function pickVersion(toolKey) {
  const catalogue = VERSION_CATALOGUE[toolKey];
  if (!catalogue) return null;

  console.log('');
  console.log(
    chalk.gray('  ┌─ ') +
    chalk.bold.white(`Select ${catalogue.label} version`) +
    chalk.gray(' ──────────────────────────────────')
  );

  const defaultIdx = catalogue.choices.findIndex((c) => c.value === catalogue.defaultValue);

  const { version } = await inquirer.prompt([{
    type    : 'list',
    name    : 'version',
    message : chalk.cyan(`  ${catalogue.label} version:`),
    prefix  : chalk.yellow('  ▶'),
    choices : catalogue.choices,
    default : defaultIdx >= 0 ? defaultIdx : 0,
    pageSize: catalogue.choices.length + 1,
  }]);

  const chosen = catalogue.choices.find((c) => c.value === version);
  console.log(
    chalk.gray('  └─ ') +
    chalk.green('Selected: ') +
    chalk.white(chosen?.short || version)
  );

  return { value: version, meta: chosen };
}

// ─── Pick versions for all selected tools (only those that have options) ──────
export async function pickVersions(selectedTools) {
  // Only tools that have version choices
  const versionable = ['java', 'node', 'flutter', 'androidSdk'];
  const applicable  = selectedTools.filter((k) => versionable.includes(k));

  if (applicable.length === 0) return {};

  console.log('');
  console.log(
    chalk.bold.white('  🎯 Version Selection') +
    chalk.gray(' — press Enter to accept the Recommended version')
  );
  console.log(chalk.gray('  ─────────────────────────────────────────────────────\n'));

  const versions = {};

  for (const key of applicable) {
    const result = await pickVersion(key);
    if (result) versions[key] = result;
  }

  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('  📋 Your selection summary:\n'));

  for (const [key, val] of Object.entries(versions)) {
    const cat = VERSION_CATALOGUE[key];
    const isRec = val.value === cat.defaultValue;
    console.log(
      chalk.gray('     •') +
      chalk.white(` ${cat.label.padEnd(22)}`) +
      chalk.cyan(val.meta?.short || val.value) +
      (isRec ? chalk.green(' ⭐') : '')
    );
  }
  console.log('');

  return versions;
}

// ─── Get the download URL for a specific version + platform ──────────────────
export function getVersionUrl(toolKey, versionValue, platform, arch) {
  const catalogue = VERSION_CATALOGUE[toolKey];
  if (!catalogue) return null;

  const chosen = catalogue.choices.find((c) => c.value === versionValue);
  if (!chosen) return null;

  if (toolKey === 'flutter' && chosen.urls) {
    if (platform === 'darwin' && arch === 'arm64') return chosen.urls.darwinArm || chosen.urls.darwin;
    return chosen.urls[platform] || null;
  }

  if (toolKey === 'java' && chosen.urls) {
    if (platform === 'darwin' && arch === 'arm64') return chosen.urls.darwinArm || chosen.urls.darwin;
    return chosen.urls[platform] || null;
  }

  return null;
}

// ─── Get winget ID for a tool+version ────────────────────────────────────────
export function getWingetId(toolKey, versionValue) {
  const catalogue = VERSION_CATALOGUE[toolKey];
  const chosen    = catalogue?.choices.find((c) => c.value === versionValue);
  return chosen?.urls?.winget || chosen?.wingetId || null;
}

// ─── Get brew formula for a tool+version ─────────────────────────────────────
export function getBrewFormula(toolKey, versionValue) {
  const catalogue = VERSION_CATALOGUE[toolKey];
  const chosen    = catalogue?.choices.find((c) => c.value === versionValue);
  return chosen?.urls?.brew || null;
}

// ─── Get apt/dnf/pacman package name ─────────────────────────────────────────
export function getLinuxPkg(toolKey, versionValue, pkgManager) {
  const catalogue = VERSION_CATALOGUE[toolKey];
  const chosen    = catalogue?.choices.find((c) => c.value === versionValue);
  if (!chosen?.urls) return null;
  const map = { 'apt-get': chosen.urls.apt, 'dnf': chosen.urls.dnf, 'yum': chosen.urls.dnf, 'pacman': chosen.urls.pacman };
  return map[pkgManager] || chosen.urls.apt || null;
}

// ─── Get Android SDK package names for a given API level ─────────────────────
export function getAndroidPackages(versionValue) {
  const catalogue = VERSION_CATALOGUE.androidSdk;
  const chosen    = catalogue?.choices.find((c) => c.value === versionValue);
  if (!chosen) return ['platform-tools', 'build-tools;34.0.0', 'platforms;android-34', 'emulator'];
  return [
    'platform-tools',
    `build-tools;${chosen.buildTools}`,
    chosen.platform,
    'emulator',
  ];
}
