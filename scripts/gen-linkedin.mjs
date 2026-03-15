#!/usr/bin/env node
/**
 * gen-linkedin.mjs
 * CLI: node scripts/gen-linkedin.mjs <slug>
 *   or: npm run linkedin <slug>
 *
 * Generates output/<slug>/linkedin.md from src/<slug>.md via the Claude API.
 * Run this after `npm run make_slides` if the API key was not set at that time.
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/gen-linkedin.mjs <slug>');
  console.error('Example: node scripts/gen-linkedin.mjs gas-peakers');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('✗ ANTHROPIC_API_KEY is not set.');
  console.error('  Export it first: export ANTHROPIC_API_KEY=sk-...');
  process.exit(1);
}

const srcPath = resolve(ROOT, 'src', `${slug}.md`);
if (!existsSync(srcPath)) {
  console.error(`✗ Source file not found: src/${slug}.md`);
  process.exit(1);
}

const outDir = resolve(ROOT, 'output', slug);
if (!existsSync(outDir)) {
  console.error(`✗ Output directory not found: output/${slug}/`);
  console.error(`  Run first: npm run make_slides src/${slug}.md`);
  process.exit(1);
}

const { parsePost }            = await import('./lib/parse-post.js');
const { generateLinkedInPost } = await import('./lib/linkedin-gen.js');

console.log(`Generating LinkedIn post for "${slug}"…`);
const { prose } = parsePost(slug, ROOT);
const post = await generateLinkedInPost({ slug, prose, rootDir: ROOT });
writeFileSync(join(outDir, 'linkedin.md'), post, 'utf8');
console.log(`\n✓ Written to output/${slug}/linkedin.md`);
