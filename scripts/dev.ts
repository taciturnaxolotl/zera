#!/usr/bin/env bun

import { watch } from 'fs';
import { existsSync } from 'fs';
import { spawn } from 'child_process';

let zolaProcess: any = null;
let isRebuilding = false;

function cleanup() {
  if (zolaProcess) {
    zolaProcess.kill();
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function buildShadow() {
  if (isRebuilding) return;
  isRebuilding = true;
  
  if (zolaProcess) {
    zolaProcess.kill();
    zolaProcess = null;
  }

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

  zolaProcess = spawn('zola', ['serve', '--force', '--interface', '0.0.0.0', '--output-dir', '../public'], {
    cwd: '.zola-build',
    stdio: 'inherit'
  });

  zolaProcess.on('error', (err: Error) => {
    console.error('Failed to start Zola:', err);
  });

  isRebuilding = false;
}

await buildShadow();

const watchDirs = ['content', 'templates', 'sass', 'static', 'syntaxes'];

for (const dir of watchDirs) {
  if (existsSync(dir)) {
    watch(dir, { recursive: true }, async (event, filename) => {
      if (filename && !filename.includes('.zola-build')) {
        await buildShadow();
      }
    });
  }
}

watch('config.toml', async () => {
  await buildShadow();
});

