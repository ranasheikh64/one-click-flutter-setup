/**
 * detect.js — OS & installed-tool detection
 * Works without any npm packages (uses built-in modules only)
 */

import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import { existsSync } from 'fs';

// ─── OS Info ─────────────────────────────────────────────────────────────────
export function detectOS() {
  const platform = process.platform;
  const arch     = process.arch;
  const home     = os.homedir();

  return {
    platform,
    arch,
    isWindows : platform === 'win32',
    isMac     : platform === 'darwin',
    isLinux   : platform === 'linux',
    home,
    // Suggested default install directories
    flutterDir : platform === 'win32'
      ? 'C:\\flutter'
      : path.join(home, 'development', 'flutter'),
    androidDir : platform === 'win32'
      ? path.join(home, 'AppData', 'Local', 'Android', 'Sdk')
      : path.join(home, 'Android', 'Sdk'),
  };
}

// ─── Safe exec (returns null on failure) ─────────────────────────────────────
function tryExec(cmd) {
  try {
    return execSync(cmd, {
      encoding : 'utf8',
      stdio    : ['pipe', 'pipe', 'pipe'],
      timeout  : 8000,
    }).trim();
  } catch {
    return null;
  }
}

// ─── Linux package-manager detection ─────────────────────────────────────────
export function detectLinuxPkgManager() {
  const managers = [
    { bin: 'apt-get', install: 'sudo apt-get install -y', update: 'sudo apt-get update -y' },
    { bin: 'dnf',     install: 'sudo dnf install -y',     update: 'sudo dnf check-update; true' },
    { bin: 'yum',     install: 'sudo yum install -y',     update: 'sudo yum check-update; true' },
    { bin: 'pacman',  install: 'sudo pacman -S --noconfirm', update: 'sudo pacman -Sy' },
    { bin: 'zypper',  install: 'sudo zypper install -y',  update: 'sudo zypper refresh' },
  ];
  for (const mgr of managers) {
    if (tryExec(`which ${mgr.bin}`)) return mgr;
  }
  return null;
}

// ─── Winget availability ──────────────────────────────────────────────────────
export function wingetAvailable() {
  return !!tryExec('winget --version');
}

// ─── Homebrew availability (macOS) ───────────────────────────────────────────
export function brewAvailable() {
  return !!tryExec('brew --version');
}

// ─── Individual tool checks ──────────────────────────────────────────────────
function checkGit() {
  const raw = tryExec('git --version');
  if (!raw) return { installed: false, version: null };
  return { installed: true, version: raw.replace('git version ', '').split(' ')[0] };
}

function checkJava() {
  // java -version prints to stderr on many JDKs
  const raw = tryExec('java -version 2>&1') || tryExec('java --version 2>&1');
  if (!raw) return { installed: false, version: null };
  const m = raw.match(/version "?([0-9]+[._][0-9]+[._][0-9]+)"?/);
  return { installed: true, version: m ? m[1] : raw.split('\n')[0].trim() };
}

function checkNode() {
  const raw = tryExec('node --version');
  if (!raw) return { installed: false, version: null };
  return { installed: true, version: raw.replace('v', '') };
}

function checkFlutter() {
  const raw = tryExec('flutter --version');
  if (!raw) return { installed: false, version: null };
  const m = raw.match(/Flutter\s+([0-9]+\.[0-9]+\.[0-9]+)/);
  return { installed: true, version: m ? m[1] : 'unknown' };
}

function checkAndroidSdk() {
  // Check sdkmanager or ANDROID_HOME env
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const { androidDir } = detectOS();

  const hasEnv = !!androidHome && existsSync(androidHome);
  const hasDefault = existsSync(androidDir);
  const hasCmd = !!tryExec('sdkmanager --version 2>&1');

  const installed = hasEnv || hasDefault || hasCmd;
  let version = null;
  if (installed) {
    const raw = tryExec('sdkmanager --version 2>&1');
    version = raw ? raw.split('\n')[0].trim() : 'installed';
  }
  return { installed, version };
}

function checkFlutterFire() {
  const raw = tryExec('flutterfire --version');
  if (!raw) return { installed: false, version: null };
  return { installed: true, version: raw.trim() };
}

function checkDart() {
  const raw = tryExec('dart --version 2>&1');
  if (!raw) return { installed: false, version: null };
  const m = raw.match(/Dart SDK version:\s+([0-9]+\.[0-9]+\.[0-9]+)/);
  return { installed: true, version: m ? m[1] : raw.trim() };
}

// ─── Main detection export ───────────────────────────────────────────────────
export function detectTools() {
  return {
    git        : checkGit(),
    java       : checkJava(),
    node       : checkNode(),
    flutter    : checkFlutter(),
    dart       : checkDart(),
    androidSdk : checkAndroidSdk(),
    flutterfire: checkFlutterFire(),
  };
}
