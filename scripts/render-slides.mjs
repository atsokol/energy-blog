#!/usr/bin/env node
/**
 * render-slides.mjs
 * CLI: node scripts/render-slides.mjs <slug> [md-file]
 *
 * Renders output/<slug>/<md-file> → output/<slug>/<pdf-file> via resvg + pdf-lib.
 * md-file defaults to "slides.md"; the PDF name is derived by replacing .md with .pdf.
 *
 * Examples:
 *   node scripts/render-slides.mjs gas-peakers
 *   node scripts/render-slides.mjs gas-peakers slides-update.md
 */

import { existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const slug    = process.argv[2];
const mdFile  = process.argv[3] ?? 'slides.md';
const pdfFile = basename(mdFile, '.md') + '.pdf';

if (!slug) {
  console.error('Usage: node scripts/render-slides.mjs <slug> [md-file]');
  console.error('Example: node scripts/render-slides.mjs gas-peakers slides-update.md');
  process.exit(1);
}

const outDir   = resolve(ROOT, 'output', slug);
const slidesSrc = resolve(outDir, mdFile);

if (!existsSync(slidesSrc)) {
  console.error(`✗ ${mdFile} not found at output/${slug}/${mdFile}`);
  process.exit(1);
}

console.log(`Rendering output/${slug}/${mdFile} → ${pdfFile}…`);

const { renderToPdf } = await import('./lib/render-pdf.js');
await renderToPdf({ outDir, mdFile, pdfFile });

console.log(`✓ PDF written to output/${slug}/${pdfFile}`);
