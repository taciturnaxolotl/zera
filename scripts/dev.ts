#!/usr/bin/env bun

import { watch } from 'fs';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, rmSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join } from 'path';

let zolaProcess: any = null;

function cleanup() {
  if (zolaProcess) {
    zolaProcess.kill();
  }
  rmSync('.zola-build', { recursive: true, force: true });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function ensureDir(filePath: string) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src: string, dest: string) {
  ensureDir(dest);
  copyFileSync(src, dest);
}

function deleteFile(dest: string) {
  if (existsSync(dest)) {
    unlinkSync(dest);
  }
}

async function initialSync() {
  await Bun.$`rm -rf .zola-build`.quiet();
  await Bun.$`mkdir -p .zola-build`.quiet();
  await Bun.$`cp -r content .zola-build/`.quiet();
  
  const optionalDirs = ['static', 'templates', 'sass', 'syntaxes'];
  for (const dir of optionalDirs) {
    if (existsSync(dir)) {
      await Bun.$`cp -r ${dir} .zola-build/`.quiet();
    }
  }
  
  await Bun.$`cp config.toml .zola-build/`.quiet();
  await Bun.$`bun run scripts/preprocess.ts .zola-build/content`.quiet();
}

async function handleFileChange(dir: string, filename: string) {
  const srcPath = join(dir, filename);
  const destPath = join('.zola-build', dir, filename);
  
  if (existsSync(srcPath)) {
    copyFile(srcPath, destPath);
    if (dir === 'content' && filename.endsWith('.md')) {
      await Bun.$`bun run scripts/preprocess.ts ${destPath}`.quiet();
    }
  } else {
    deleteFile(destPath);
  }
}

async function handleConfigChange() {
  copyFile('config.toml', '.zola-build/config.toml');
}

async function startServer() {
  await initialSync();

  zolaProcess = spawn('zola', ['serve', '--force', '--interface', '0.0.0.0', '--output-dir', '../public'], {
    cwd: '.zola-build',
    stdio: 'inherit'
  });

  zolaProcess.on('error', (err: Error) => {
    console.error('Failed to start Zola:', err);
  });
}

await startServer();

const watchDirs = ['content', 'templates', 'sass', 'static', 'syntaxes'];

for (const dir of watchDirs) {
  if (existsSync(dir)) {
    watch(dir, { recursive: true }, (event, filename) => {
      if (filename && !filename.includes('.zola-build')) {
        handleFileChange(dir, filename);
      }
    });
  }
}

watch('config.toml', () => {
  handleConfigChange();
});
