/**
 * base.js — Shared download / extract / exec utilities
 * Used by all individual installer modules
 */

import https from 'https';
import http  from 'http';
import fs    from 'fs';
import path  from 'path';
import { execSync, spawn } from 'child_process';
import os from 'os';

// ─── ANSI colors (no chalk dependency here) ───────────────────────────────────
const C = {
  reset  : '\x1b[0m',
  green  : '\x1b[32m',
  yellow : '\x1b[33m',
  cyan   : '\x1b[36m',
  gray   : '\x1b[90m',
  red    : '\x1b[31m',
  white  : '\x1b[37m',
};
export const col = (c, t) => `${C[c]}${t}${C.reset}`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Progress bar (inline, no deps) ──────────────────────────────────────────
export function drawBar(current, total, label = '') {
  const width  = 28;
  const pct    = total ? Math.min(Math.round((current / total) * 100), 100) : 0;
  const filled = Math.round((pct / 100) * width);
  const bar    = col('cyan', '█'.repeat(filled)) + col('gray', '░'.repeat(width - filled));
  const mb     = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
  process.stdout.write(
    `\r  ${col('gray', label.padEnd(18))} [${bar}] ${col('yellow', pct + '%')} ${col('gray', total ? mb(current) + '/' + mb(total) : '')}  `
  );
  if (current >= total && total > 0) process.stdout.write('\n');
}

// ─── Download file with progress & redirect support ───────────────────────────
export function downloadFile(url, dest, label = 'Downloading') {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const client  = parsed.protocol === 'https:' ? https : http;
    const file    = fs.createWriteStream(dest);

    const request = client.get(url, { timeout: 120000 }, (res) => {
      // Follow redirects (301 / 302 / 307 / 308)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest, label).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        drawBar(downloaded, total, label);
      });

      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });

    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      reject(err);
    });
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timed out'));
    });
  });
}

// ─── Extract ZIP ──────────────────────────────────────────────────────────────
export async function extractZip(src, dest) {
  const { default: extractZipFn } = await import('extract-zip');
  fs.mkdirSync(dest, { recursive: true });
  await extractZipFn(src, { dir: dest });
}

// ─── Extract TAR (.tar.xz, .tar.gz, .tgz) ────────────────────────────────────
export async function extractTar(src, dest) {
  const { default: tar } = await import('tar');
  fs.mkdirSync(dest, { recursive: true });
  await tar.x({ file: src, cwd: dest, strict: false });
}

// ─── Run command with live output ─────────────────────────────────────────────
export function runLive(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio : ['inherit', 'inherit', 'inherit'],
      shell : process.platform === 'win32',
      ...opts,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${cmd} ${args.join(' ')}" exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// ─── Run command silently, return stdout ──────────────────────────────────────
export function runSilent(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding : 'utf8',
      stdio    : ['pipe', 'pipe', 'pipe'],
      shell    : process.platform === 'win32',
      timeout  : 120000,
      ...opts,
    }).trim();
  } catch (e) {
    throw new Error(`Command failed: ${cmd}\n${e.stderr || e.message}`);
  }
}

// ─── Run command piping stdin string ─────────────────────────────────────────
export function runWithInput(cmd, input, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [], {
      stdio : ['pipe', 'inherit', 'inherit'],
      shell : process.platform === 'win32',
      ...opts,
    });
    child.stdin.write(input);
    child.stdin.end();
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${cmd}" exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// ─── Temp directory ───────────────────────────────────────────────────────────
export function tempDir() {
  const dir = path.join(os.tmpdir(), 'devtool-flutter-setup');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Simple spinner ───────────────────────────────────────────────────────────
export class Spinner {
  constructor(text) {
    this.text   = text;
    this.frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    this.idx    = 0;
    this.timer  = null;
  }

  start() {
    process.stdout.write('\x1B[?25l');
    this.timer = setInterval(() => {
      process.stdout.write(
        `\r  ${col('cyan', this.frames[this.idx++ % this.frames.length])} ${col('gray', this.text)}  `
      );
    }, 80);
    return this;
  }

  update(text) { this.text = text; }

  succeed(msg) {
    clearInterval(this.timer);
    process.stdout.write(`\r  ${col('green', '✔')} ${col('white', msg || this.text)}\n`);
    process.stdout.write('\x1B[?25h');
  }

  fail(msg) {
    clearInterval(this.timer);
    process.stdout.write(`\r  ${col('red', '✖')} ${col('white', msg || this.text)}\n`);
    process.stdout.write('\x1B[?25h');
  }

  warn(msg) {
    clearInterval(this.timer);
    process.stdout.write(`\r  ${col('yellow', '⚠')} ${col('white', msg || this.text)}\n`);
    process.stdout.write('\x1B[?25h');
  }
}
