#!/usr/bin/env node
/**
 * make_slides.mjs  —  full pipeline for one post
 *
 * Usage:
 *   npm run make_slides src/gas-peakers.md
 *   node scripts/make_slides.mjs src/gas-peakers.md
 *
 * Steps (no build step, no browser):
 *   1. Read <file>.md — parse title, subtitle, prose
 *   2. Execute every Observable Plot cell in Node.js (JSDOM + @observablehq/plot)
 *      → fetches live data from GitHub URLs, captures SVGs + surrounding prose context
 *   3. Write output/<slug>/charts/*.svg
 *   4. Call Claude API to generate one-line slide headers from prose context
 *   5. Assemble output/<slug>/slides.md  ← edit this before step 6 if needed
 *   6. Render slides.md → output/<slug>/slides.pdf  via Marp
 *   7. Generate output/<slug>/linkedin.md  via Claude API
 *
 * To re-render the PDF after editing slides.md:
 *   npm run render <slug>
 *
 * One-time setup (run once):
 *   npm run setup
 *   export ANTHROPIC_API_KEY=sk-...   # add to ~/.zshrc / ~/.bashrc
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const { parsePost }             = await import('./lib/parse-post.js');
const { renderChartsFromMd }    = await import('./lib/render-charts-node.js');
const { generateSlideHeaders }  = await import('./lib/generate-slide-headers.js');
const { buildSlidesMd }         = await import('./lib/build-slides-md.js');
const { generateLinkedInPost }  = await import('./lib/linkedin-gen.js');
const { renderToPdf }           = await import('./lib/render-pdf.js');

// ---------------------------------------------------------------------------

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run make_slides src/<slug>.md');
  console.error('Example: npm run make_slides src/gas-peakers.md');
  process.exit(1);
}

const mdPath = arg.endsWith('.md')
  ? resolve(ROOT, arg)
  : resolve(ROOT, 'src', `${arg}.md`);
const slug = basename(mdPath, '.md');

const outDir    = resolve(ROOT, 'output', slug);
const chartsDir = join(outDir, 'charts');
mkdirSync(chartsDir, { recursive: true });

// 1. Parse prose
console.log('[1/5] Parsing post…');
const { title, subtitle, prose } = parsePost(slug, ROOT);
console.log(`✓ "${title}"\n`);

// 2. Render charts (Node.js — reads .md, fetches data, renders SVGs)
console.log('[2/5] Rendering charts from', basename(mdPath), '…');
console.log('      (fetching live data — requires internet access)');
let charts = await renderChartsFromMd({ mdPath, outDir: chartsDir, rootDir: ROOT });
if (charts.length === 0) {
  console.warn('Warning: no Plot.plot() calls found.');
}
for (const c of charts) console.log(`  → charts/${c.filename}  (${c.heading})`);
console.log(`✓ ${charts.length} chart(s) rendered\n`);

// 3. Generate slide headers via Claude
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[3/5] ANTHROPIC_API_KEY not set — using section headings as slide titles.');
  console.warn(`      Set the key and re-run: npm run make_slides src/${slug}.md\n`);
} else {
  console.log('[3/5] Generating slide headers (Claude API)…');
  charts = await generateSlideHeaders({ charts, postTitle: title, rootDir: ROOT });
  for (const c of charts) console.log(`  → "${c.header}"`);
  console.log();
}

// 4. Build slides.md
console.log('[4/5] Writing slides.md…');
const slidesMd = buildSlidesMd({ slug, title, subtitle, charts, rootDir: ROOT });
writeFileSync(join(outDir, 'slides.md'), slidesMd, 'utf8');
console.log(`✓ output/${slug}/slides.md`);
console.log('  → Edit headings, remove or reorder slides, then re-run: npm run render', slug, '\n');

// 5. Render PDF
console.log('[5/5] Rendering PDF…');
await renderToPdf({ outDir, rootDir: ROOT });
console.log(`\n✓ output/${slug}/slides.pdf\n`);

// + LinkedIn post
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[+] ANTHROPIC_API_KEY not set — skipping LinkedIn post.');
  console.warn(`    Generate it later: npm run linkedin ${slug}\n`);
} else {
  console.log('[+] Generating LinkedIn post…');
  const post = await generateLinkedInPost({ slug, prose, rootDir: ROOT });
  writeFileSync(join(outDir, 'linkedin.md'), post, 'utf8');
  console.log(`✓ output/${slug}/linkedin.md\n`);
}

console.log('Done.');
console.log(`  Slides (edit):  output/${slug}/slides.md`);
console.log(`  PDF:            output/${slug}/slides.pdf`);
console.log(`  LinkedIn post:  output/${slug}/linkedin.md`);
