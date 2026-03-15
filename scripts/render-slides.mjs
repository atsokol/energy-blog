#!/usr/bin/env node
/**
 * render-slides.mjs
 * CLI: node scripts/render-slides.mjs <slug>
 *   or: npm run render <slug>
 *
 * Renders output/<slug>/slides.md → output/<slug>/slides.pdf via resvg + pdf-lib.
 * Edit slides.md first to adjust headings, remove slides, or reorder charts.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/render-slides.mjs <slug>');
  console.error('Example: node scripts/render-slides.mjs gas-peakers');
  process.exit(1);
}

const outDir = resolve(ROOT, 'output', slug);
const slidesSrc = resolve(outDir, 'slides.md');

if (!existsSync(slidesSrc)) {
  console.error(`✗ slides.md not found at output/${slug}/slides.md`);
  console.error(`  Run first: npm run generate ${slug}`);
  process.exit(1);
}

console.log(`Rendering output/${slug}/slides.md → slides.pdf…`);

const { renderToPdf } = await import('./lib/render-pdf.js');
await renderToPdf({ outDir, rootDir: ROOT });

console.log(`\n✓ PDF written to output/${slug}/slides.pdf`);
