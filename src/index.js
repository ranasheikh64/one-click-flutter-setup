#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           DEVTOOL CLI — SELF INSTALLER               ║
 * ║  User শুধু `devtool` দেবে, বাকি সব auto হবে        ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Flow:
 *  1. Check করবে dependencies আছে কিনা
 *  2. না থাকলে user কে notify করবে
 *  3. Permission নেবে
 *  4. Install করবে (progress সহ)
 *  5. তারপর main app চালু করবে
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PKG_DIR    = path.resolve(__dirname, '..');
const NODE_MODS  = path.join(PKG_DIR, 'node_modules');

// ─── Required packages ────────────────────────────────────────────────────────
const REQUIRED_DEPS = {
  chalk:             '^5.3.0',
  ora:               '^8.0.1',
  inquirer:          '^9.2.12',
  'cli-progress':    '^3.12.0',
  figlet:            '^1.7.0',
  boxen:             '^7.1.1',
  'gradient-string': '^2.0.2',
  'cli-table3':      '^0.6.3',
  commander:         '^12.0.0',
};

// ─── Colors without chalk (chalk না থাকলেও কাজ করবে) ────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
};

const c = (color, text) => `${C[color]}${text}${C.reset}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Simple spinner (no ora needed) ──────────────────────────────────────────
class SimpleSpinner {
  constructor(text) {
    this.text    = text;
    this.frames  = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    this.idx     = 0;
    this.timer   = null;
    this.stream  = process.stdout;
  }

  start() {
    process.stdout.write('\x1B[?25l'); // hide cursor
    this.timer = setInterval(() => {
      this.stream.write(`\r  ${c('cyan', this.frames[this.idx % this.frames.length])} ${c('gray', this.text)}`);
      this.idx++;
    }, 80);
    return this;
  }

  succeed(msg) {
    clearInterval(this.timer);
    this.stream.write(`\r  ${c('green', '✔')} ${c('white', msg || this.text)}\n`);
    process.stdout.write('\x1B[?25h');
  }

  fail(msg) {
    clearInterval(this.timer);
    this.stream.write(`\r  ${c('red', '✖')} ${c('white', msg || this.text)}\n`);
    process.stdout.write('\x1B[?25h');
  }

  update(text) { this.text = text; }
}

// ─── Simple progress bar (no cli-progress needed) ─────────────────────────────
function drawProgressBar(current, total, label = '') {
  const width   = 30;
  const filled  = Math.round((current / total) * width);
  const empty   = width - filled;
  const pct     = Math.round((current / total) * 100);
  const bar     = c('cyan', '█'.repeat(filled)) + c('gray', '░'.repeat(empty));
  process.stdout.write(
    `\r  ${c('gray', label.padEnd(20))} [${bar}] ${c('yellow', pct + '%')} (${current}/${total})  `
  );
  if (current === total) process.stdout.write('\n');
}

// ─── Ask yes/no ───────────────────────────────────────────────────────────────
function askYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
    });
    rl.question(`  ${c('cyan','?')} ${question} ${c('gray','(Y/n)')} `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() !== 'n');
    });
  });
}

// ─── Check which deps are missing ─────────────────────────────────────────────
function getMissingDeps() {
  const missing = [];
  for (const pkg of Object.keys(REQUIRED_DEPS)) {
    const pkgPath = path.join(NODE_MODS, pkg, 'package.json');
    if (!existsSync(pkgPath)) missing.push(pkg);
  }
  return missing;
}

// ─── Write deps to package.json then npm install ──────────────────────────────
async function installDeps(missing) {
  // Update package.json with required deps
  const pkgJsonPath = path.join(PKG_DIR, 'package.json');
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  pkgJson.dependencies = REQUIRED_DEPS;
  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

  const spinner = new SimpleSpinner('npm install চলছে...');
  spinner.start();

  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['install', '--save', '--prefix', PKG_DIR],
      { cwd: PKG_DIR, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        spinner.succeed(`${missing.length} টি package install সম্পন্ন!`);
        resolve();
      } else {
        spinner.fail('Install ব্যর্থ হয়েছে');
        console.error(c('red', output));
        reject(new Error('npm install failed'));
      }
    });
  });
}

// ─── BANNER ───────────────────────────────────────────────────────────────────
function showRawBanner() {
  console.clear();
  console.log('');
  console.log(c('cyan',  '  ██████╗ ███████╗██╗   ██╗████████╗ ██████╗  ██████╗ ██╗'));
  console.log(c('cyan',  '  ██╔══██╗██╔════╝██║   ██║╚══██╔══╝██╔═══██╗██╔═══██╗██║'));
  console.log(c('cyan',  '  ██║  ██║█████╗  ██║   ██║   ██║   ██║   ██║██║   ██║██║'));
  console.log(c('cyan',  '  ██║  ██║██╔══╝  ╚██╗ ██╔╝   ██║   ██║   ██║██║   ██║██║'));
  console.log(c('cyan',  '  ██████╔╝███████╗ ╚████╔╝    ██║   ╚██████╔╝╚██████╔╝███████╗'));
  console.log(c('gray',  '  ╚═════╝ ╚══════╝  ╚═══╝     ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝'));
  console.log('');
  console.log(c('gray',  '  ─────────────────────────────────────────────────────'));
  console.log(c('white', '  ⚡ Advanced CLI Tool') + c('gray', ' • v1.0.0 • Windows/Linux/macOS'));
  console.log(c('gray',  '  ─────────────────────────────────────────────────────'));
  console.log('');
}

// ─── MAIN BOOTSTRAP ───────────────────────────────────────────────────────────
async function bootstrap() {
  showRawBanner();

  const missing = getMissingDeps();

  if (missing.length === 0) {
    // সব আছে — সরাসরি app চালু করো
    await launchApp();
    return;
  }

  // ─── Dependencies নেই, user কে জানাও ────────────────────────────────────
  console.log(c('yellow', '  ⚠  প্রথমবার চালু হচ্ছে — কিছু packages দরকার\n'));
  console.log(c('gray',   '  নিচের packages install হবে:\n'));

  missing.forEach((pkg, i) => {
    const ver = REQUIRED_DEPS[pkg];
    console.log(`  ${c('gray', (i+1)+'.)')} ${c('cyan', pkg.padEnd(20))} ${c('gray', ver)}`);
  });

  console.log('');
  console.log(c('gray', `  📦 মোট ${missing.length} টি package — একবারই install হবে`));
  console.log(c('gray', '  পরের বার আর install হবে না\n'));

  const confirmed = await askYesNo('Install করবো?');

  if (!confirmed) {
    console.log('');
    console.log(c('yellow', '  বাতিল করা হয়েছে। পরে আবার চেষ্টা করো।\n'));
    process.exit(0);
  }

  console.log('');

  try {
    await installDeps(missing);
    console.log('');
    console.log(c('green', '  ✔ সব কিছু প্রস্তুত! CLI চালু হচ্ছে...\n'));
    await sleep(800);
    await launchApp();
  } catch (err) {
    console.log('');
    console.log(c('red', '  ✖ Install ব্যর্থ হয়েছে।'));
    console.log(c('gray', '  নিচের command টি manually চালাও:\n'));
    console.log(c('cyan', `  cd "${PKG_DIR}" && npm install\n`));
    process.exit(1);
  }
}

// ─── Launch main app after bootstrap ─────────────────────────────────────────
async function launchApp() {
  try {
    const { startApp } = await import('./app.js');
    await startApp();
  } catch (err) {
    console.error(c('red', '  App চালু করতে সমস্যা হয়েছে:'), err.message);
    process.exit(1);
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
bootstrap().catch((err) => {
  console.error('\n  Fatal error:', err.message);
  process.exit(1);
});
