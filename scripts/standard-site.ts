#!/usr/bin/env bun

/**
 * Sync blog posts to AT Protocol as site.standard.document records.
 * Creates/updates/deletes records on the Bluesky PDS to match local blog content.
 *
 * Usage: bun run scripts/standard-site.ts [--dry-run]
 *
 * Requires BSKY_APP_PASSWORD in .env
 */

import { Client, simpleFetchHandler, ok } from '@atcute/client';
import '@atcute/atproto';
import { config } from 'dotenv';
import { glob } from 'glob';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

config();

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = 'https://dunkirk.sh';
const HANDLE = 'dunkirk.sh';
const PDS_SERVICE = process.env.BSKY_PDS_URL || 'https://pds.hogwarts.dev';
const COLLECTION_PUB = 'site.standard.publication';
const COLLECTION_DOC = 'site.standard.document';
const MAPPING_FILE = '.standard-site-records.json';

// Theme colors matching the site's aesthetic
const THEME = {
	$type: 'site.standard.theme.basic',
	background: { $type: 'site.standard.theme.color#rgb', r: 39, g: 38, b: 49 },
	foreground: { $type: 'site.standard.theme.color#rgb', r: 205, g: 214, b: 244 },
	accent: { $type: 'site.standard.theme.color#rgb', r: 203, g: 166, b: 247 },
	accentForeground: { $type: 'site.standard.theme.color#rgb', r: 30, g: 30, b: 46 },
};

interface RecordMapping {
	publicationUri?: string;
	publicationRkey?: string;
	documents: Record<string, { uri: string; rkey: string; cid: string }>;
}

interface BlogPost {
	slug: string;
	title: string;
	description?: string;
	date: string;
	tags?: string[];
	path: string; // URL path like /blog/my-post
	filePath: string;
}

function parseFrontmatter(content: string): Record<string, any> {
	const match = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+/);
	if (!match) return {};

	const fm: Record<string, any> = {};
	const lines = match[1].split('\n');
	let currentKey = '';

	for (const line of lines) {
		const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
		if (kvMatch) {
			currentKey = kvMatch[1];
			let val: any = kvMatch[2].trim();
			// Strip quotes
			if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
				val = val.slice(1, -1);
			}
			fm[currentKey] = val;
		} else if (currentKey && line.trim().startsWith('tags')) {
			// Handle tags array on next line(s)
			const tagMatch = line.match(/tags\s*=\s*\[(.+)\]/);
			if (tagMatch) {
				fm.tags = tagMatch[1]
					.split(',')
					.map((t: string) => t.trim().replace(/['"]/g, ''))
					.filter(Boolean);
			}
		}
	}

	return fm;
}

async function getBlogPosts(): Promise<BlogPost[]> {
	const files = await glob('content/blog/*.md', { ignore: ['content/blog/_index.md'] });
	const posts: BlogPost[] = [];

	for (const filePath of files) {
		const content = readFileSync(filePath, 'utf-8');
		const fm = parseFrontmatter(content);

		if (!fm.title || !fm.date) continue;
		if (fm.draft === 'true' || fm.draft === true) continue;

		const slug = fm.slug || basename(filePath, '.md').replace(/^\d{4}-\d{2}-\d{2}_/, '');
		const dateStr = typeof fm.date === 'string' ? fm.date : String(fm.date);
		// Normalize date to ISO format
		const publishedAt = new Date(dateStr).toISOString();

		posts.push({
			slug,
			title: fm.title,
			description: fm.description,
			date: publishedAt,
			tags: fm.tags,
			path: `/blog/${slug}`,
			filePath,
		});
	}

	return posts.sort((a, b) => a.date.localeCompare(b.date));
}

function loadMapping(): RecordMapping {
	if (existsSync(MAPPING_FILE)) {
		return JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));
	}
	return { documents: {} };
}

function saveMapping(mapping: RecordMapping) {
	writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2) + '\n');
}

async function main() {
	const appPassword = process.env.BSKY_APP_PASSWORD;
	if (!appPassword) {
		console.error('BSKY_APP_PASSWORD not set in .env');
		process.exit(1);
	}

	// Authenticate
	console.log('Authenticating with Bluesky PDS...');
	const authClient = new Client({
		handler: simpleFetchHandler({ service: PDS_SERVICE }),
	});

	const session = await ok(
		authClient.post('com.atproto.server.createSession', {
			input: { identifier: HANDLE, password: appPassword },
		}),
	);

	console.log(`Authenticated as ${session.handle} (${session.did})`);

	// Create authenticated client
	const client = new Client({
		handler: {
			async handle(pathname, init) {
				const url = new URL(pathname, PDS_SERVICE);
				const headers = new Headers(init.headers);
				headers.set('Authorization', `Bearer ${session.accessJwt}`);
				// Ensure content-type is set for POST requests with JSON body
				if (init.method?.toUpperCase() === 'POST' && typeof init.body === 'string') {
					headers.set('Content-Type', 'application/json');
				}
				return fetch(url.href, { ...init, headers });
			},
		},
	});

	const mapping = loadMapping();
	const posts = await getBlogPosts();

	console.log(`Found ${posts.length} blog posts`);

	// Ensure publication record exists
	if (!mapping.publicationUri) {
		console.log('Creating publication record...');
		if (DRY_RUN) {
			console.log('[DRY RUN] Would create publication record');
		} else {
			const pubResult = await ok(
				client.post('com.atproto.repo.createRecord', {
					input: {
						repo: session.did,
						collection: COLLECTION_PUB,
						record: {
							$type: COLLECTION_PUB,
							url: BASE_URL,
							name: 'dunkirk.sh',
							description: "Kieran Klukas' home site — nix nerd, photographer, hardware kid, cyber operator",
							basicTheme: THEME,
							preferences: { showInDiscover: true },
						},
						validate: false,
					},
				}),
			);

			mapping.publicationUri = pubResult.uri;
			mapping.publicationRkey = pubResult.uri.split('/').pop();
			console.log(`Created publication: ${pubResult.uri}`);
		}
	} else {
		console.log(`Publication exists: ${mapping.publicationUri}`);
	}

	if (!mapping.publicationUri && !DRY_RUN) {
		console.error('No publication URI available, cannot create documents');
		process.exit(1);
	}

	const publicationRef = mapping.publicationUri || 'at://placeholder/site.standard.publication/placeholder';

	// List existing document records from PDS
	const existingRecords = new Map<string, { uri: string; cid: string; value: any }>();
	if (!DRY_RUN) {
		let cursor: string | undefined;
		do {
			const result = await ok(
				client.get('com.atproto.repo.listRecords', {
					params: {
						repo: session.did,
						collection: COLLECTION_DOC,
						limit: 100,
						...(cursor ? { cursor } : {}),
					},
				}),
			);
			for (const rec of result.records) {
				const path = (rec.value as any)?.path;
				if (path) {
					existingRecords.set(path, { uri: rec.uri, cid: rec.cid, value: rec.value });
				}
			}
			cursor = result.cursor;
		} while (cursor);
	}

	console.log(`Found ${existingRecords.size} existing document records on PDS`);

	// Track which paths we've processed
	const processedPaths = new Set<string>();

	// Create or update document records
	for (const post of posts) {
		processedPaths.add(post.path);
		const existing = existingRecords.get(post.path);

		const record = {
			$type: COLLECTION_DOC,
			site: publicationRef,
			title: post.title,
			path: post.path,
			publishedAt: post.date,
			...(post.description ? { description: post.description } : {}),
			...(post.tags?.length ? { tags: post.tags } : {}),
		};

		if (existing) {
			// Check if update needed
			const needsUpdate =
				existing.value.title !== post.title ||
				existing.value.description !== post.description ||
				existing.value.publishedAt !== post.date ||
				JSON.stringify(existing.value.tags) !== JSON.stringify(post.tags);

			if (needsUpdate) {
				console.log(`Updating: ${post.path}`);
				if (!DRY_RUN) {
					const rkey = existing.uri.split('/').pop()!;
					const result = await ok(
						client.post('com.atproto.repo.putRecord', {
							input: {
								repo: session.did,
								collection: COLLECTION_DOC,
								rkey,
								record,
								validate: false,
							},
						}),
					);
					mapping.documents[post.path] = {
						uri: result.uri,
						rkey,
						cid: result.cid,
					};
				}
			} else {
				// Ensure mapping is up to date even if no changes
				if (!mapping.documents[post.path]) {
					const rkey = existing.uri.split('/').pop()!;
					mapping.documents[post.path] = {
						uri: existing.uri,
						rkey,
						cid: existing.cid,
					};
				}
			}
		} else {
			console.log(`Creating: ${post.path}`);
			if (!DRY_RUN) {
				const result = await ok(
					client.post('com.atproto.repo.createRecord', {
						input: {
							repo: session.did,
							collection: COLLECTION_DOC,
							record,
							validate: false,
						},
					}),
				);
				const rkey = result.uri.split('/').pop()!;
				mapping.documents[post.path] = {
					uri: result.uri,
					rkey,
					cid: result.cid,
				};
			}
		}
	}

	// Delete records for posts that no longer exist
	for (const [path, rec] of existingRecords) {
		if (!processedPaths.has(path)) {
			console.log(`Deleting stale record: ${path}`);
			if (!DRY_RUN) {
				const rkey = rec.uri.split('/').pop()!;
				await ok(
					client.post('com.atproto.repo.deleteRecord', {
						input: {
							repo: session.did,
							collection: COLLECTION_DOC,
							rkey,
						},
					}),
				);
				delete mapping.documents[path];
			}
		}
	}

	if (!DRY_RUN) {
		saveMapping(mapping);
		console.log(`Saved record mapping to ${MAPPING_FILE}`);

		// Inject standard_site_uri into blog post frontmatter for template rendering
		console.log('Injecting document URIs into blog post frontmatter...');
		for (const [path, doc] of Object.entries(mapping.documents)) {
			const post = posts.find((p) => p.path === path);
			if (!post) continue;

			let content = readFileSync(post.filePath, 'utf-8');
			const uriValue = `standard_site_uri = "${doc.uri}"`;

			if (content.includes('standard_site_uri')) {
				// Update existing line
				content = content.replace(/standard_site_uri\s*=\s*".*"/, uriValue);
			} else if (content.includes('[extra]')) {
				// Append to existing [extra] section
				content = content.replace(/\[extra\]/, `[extra]\n${uriValue}`);
			} else {
				// Insert [extra] section before closing +++ of frontmatter
				const fmEnd = content.indexOf('\n+++\n');
				if (fmEnd !== -1) {
					content = content.slice(0, fmEnd) + `\n\n[extra]\n${uriValue}` + content.slice(fmEnd);
				}
			}

			writeFileSync(post.filePath, content);
		}
		console.log('Done injecting URIs');
	}

	console.log('Done!');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
