/**
 * path-setup.js — Automatic PATH configuration for all installed tools
 * Windows: uses `setx` (persistent user PATH via registry)
 * macOS/Linux: appends export lines to shell RC files
 */

import { execSync } from 'child_process';
import fs   from 'fs';
import path from 'path';
import os   from 'os';

const MARKER_START = '# >>> DevTool Flutter Setup >>>';
const MARKER_END   = '# <<< DevTool Flutter Setup <<<';

// ─── Detect which shell RC files to update ───────────────────────────────────
function getRcFiles() {
  const home  = os.homedir();
  const files = [];

  const candidates = [
    path.join(home, '.zshrc'),
    path.join(home, '.bashrc'),
    path.join(home, '.bash_profile'),
    path.join(home, '.profile'),
  ];

  for (const f of candidates) {
    // Include file if it exists OR if it's the default shell's rc
    if (fs.existsSync(f)) files.push(f);
  }

  // Always include at least one
  if (files.length === 0) {
    const def = path.join(home, '.profile');
    fs.writeFileSync(def, '');
    files.push(def);
  }

  return files;
}

// ─── Windows: read current user PATH from registry ───────────────────────────
function getWindowsUserPath() {
  try {
    const raw = execSync(
      'reg query "HKCU\\Environment" /v Path',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const m = raw.match(/Path\s+REG(?:_EXPAND)?_SZ\s+(.+)/i);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

// ─── Windows: set user PATH via setx ─────────────────────────────────────────
function setWindowsPath(newPath) {
  // setx has a 1024-char limit on the value but handles environment vars
  try {
    execSync(`setx PATH "${newPath}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ─── Add paths to Windows PATH (deduplicates) ────────────────────────────────
export function addToWindowsPath(newDirs) {
  const current = getWindowsUserPath();
  const parts   = current.split(';').map((p) => p.trim()).filter(Boolean);
  let added = 0;

  for (const dir of newDirs) {
    const norm = dir.replace(/\//g, '\\');
    if (!parts.some((p) => p.toLowerCase() === norm.toLowerCase())) {
      parts.push(norm);
      added++;
    }
  }

  if (added === 0) return { added: 0, success: true };

  const success = setWindowsPath(parts.join(';'));
  return { added, success };
}

// ─── Add exports to Unix shell RC files ──────────────────────────────────────
export function addToUnixProfile(exportLines) {
  const rcFiles = getRcFiles();
  const block = [
    '',
    MARKER_START,
    ...exportLines,
    MARKER_END,
    '',
  ].join('\n');

  let updated = [];

  for (const rc of rcFiles) {
    const content = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';

    // Remove existing block
    const cleaned = content.replace(
      new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g'),
      ''
    );

    fs.writeFileSync(rc, cleaned + block, 'utf8');
    updated.push(rc);
  }

  return updated;
}

// ─── Main: configure PATH for all installed tools ────────────────────────────
export function setupPaths(osInfo, installPaths) {
  const { isWindows, isMac, isLinux } = osInfo;
  const results = [];

  if (isWindows) {
    const dirs = [];
    if (installPaths.flutter) dirs.push(path.join(installPaths.flutter, 'bin'));
    if (installPaths.android) {
      dirs.push(path.join(installPaths.android, 'cmdline-tools', 'latest', 'bin'));
      dirs.push(path.join(installPaths.android, 'platform-tools'));
    }
    if (installPaths.java)    dirs.push(path.join(installPaths.java, 'bin'));
    if (installPaths.node)    dirs.push(installPaths.node);

    if (dirs.length > 0) {
      const { added, success } = addToWindowsPath(dirs);
      results.push({ platform: 'windows', added, success, dirs });
    }

    // Also set ANDROID_HOME
    if (installPaths.android) {
      try {
        execSync(`setx ANDROID_HOME "${installPaths.android}"`, { stdio: 'ignore' });
        execSync(`setx ANDROID_SDK_ROOT "${installPaths.android}"`, { stdio: 'ignore' });
      } catch {}
    }
    if (installPaths.java) {
      try {
        execSync(`setx JAVA_HOME "${installPaths.java}"`, { stdio: 'ignore' });
      } catch {}
    }

  } else {
    // macOS / Linux
    const exports = [];

    if (installPaths.flutter) {
      exports.push(`export FLUTTER_HOME="${installPaths.flutter}"`);
      exports.push(`export PATH="$FLUTTER_HOME/bin:$PATH"`);
    }
    if (installPaths.android) {
      exports.push(`export ANDROID_HOME="${installPaths.android}"`);
      exports.push(`export ANDROID_SDK_ROOT="${installPaths.android}"`);
      exports.push(`export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"`);
    }
    if (installPaths.java) {
      exports.push(`export JAVA_HOME="${installPaths.java}"`);
      exports.push(`export PATH="$JAVA_HOME/bin:$PATH"`);
    }
    if (installPaths.dartPubCache) {
      exports.push(`export PATH="$HOME/.pub-cache/bin:$PATH"`);
    }

    if (isMac) {
      // macOS: also add Dart pub global for flutter
      exports.push(`export PATH="$HOME/.pub-cache/bin:$PATH"`);
    }

    if (exports.length > 0) {
      const updated = addToUnixProfile(exports);
      results.push({ platform: isMac ? 'macos' : 'linux', updated, exports });
    }
  }

  return results;
}
