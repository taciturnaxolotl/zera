#!/usr/bin/env bun

import { existsSync } from 'fs';

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

const config = await Bun.file("config.toml").text();
const greetings = config.match(/greetings = \[([^\]]+)\]/)?.[1]
	.match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) ?? ["hello"];
const greeting = greetings[Math.floor(Math.random() * greetings.length)];
await Bun.write(".zola-build/config.toml",
	(await Bun.file(".zola-build/config.toml").text()) + `\ngreeting = "${greeting}"\n`
);

await Bun.$`bun run scripts/preprocess.ts .zola-build/content`.quiet();
await Bun.$`cd .zola-build && zola build --force --output-dir ../public`;
await Bun.$`rm -rf .zola-build`.quiet();

