#!/usr/bin/env node
/**
 * generate-assets.mjs
 * CLI: node scripts/generate-assets.mjs <slug>
 *   or: npm run generate <slug>
 *
 * For a given post slug, produces:
 *   output/<slug>/charts/*.png   — chart screenshots
 *   output/<slug>/slides.md     — editable Marp slide deck source
 *   output/<slug>/linkedin.md   — LinkedIn post
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- Inline imports (CommonJS libs wrapped for ESM) -------------------------
const { parsePost } = await import('./lib/parse-post.js');
const { screenshotCharts } = await import('./lib/screenshot-charts.js');
const { buildSlidesMd } = await import('./lib/build-slides-md.js');
const { generateLinkedInPost } = await import('./lib/linkedin-gen.js');

// ---------------------------------------------------------------------------

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/generate-assets.mjs <slug>');
  console.error('Example: node scripts/generate-assets.mjs gas-peakers');
  process.exit(1);
}

const distDir = resolve(ROOT, 'dist');
const outDir = resolve(ROOT, 'output', slug);
const chartsDir = join(outDir, 'charts');

// 1. Build the Observable Framework site
console.log('Building Observable Framework site…');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
console.log('✓ Site built to dist/\n');

// 2. Parse the post prose
console.log('Parsing post…');
const { title, subtitle, prose } = parsePost(slug, ROOT);
console.log(`✓ Title: "${title}"\n`);

// 3. Screenshot charts
console.log('Screenshotting charts (launching headless browser)…');
const charts = await screenshotCharts({ distDir, slug, timeout: 45000 });
console.log(`✓ Found ${charts.length} chart(s)\n`);

if (charts.length === 0) {
  console.warn(
    'Warning: no svg.plot elements found on the page. ' +
    'Make sure the post renders Observable Plot charts and data loaded successfully.'
  );
}

// 4. Write chart PNGs
mkdirSync(chartsDir, { recursive: true });
for (const chart of charts) {
  const dest = join(chartsDir, chart.filename);
  writeFileSync(dest, chart.buffer);
  console.log(`  Saved: charts/${chart.filename}  (${chart.heading})`);
}
console.log();

// 5. Build slides.md
console.log('Building slides.md…');
const slidesMd = buildSlidesMd({ slug, title, subtitle, charts, rootDir: ROOT });
const slidesDest = join(outDir, 'slides.md');
writeFileSync(slidesDest, slidesMd, 'utf8');
console.log(`✓ slides.md written to output/${slug}/slides.md\n`);

// 6. Generate LinkedIn post
console.log('Generating LinkedIn post (calling Claude API)…');
let linkedinPost;
try {
  linkedinPost = await generateLinkedInPost({ slug, prose, rootDir: ROOT });
} catch (err) {
  if (err.message.includes('ANTHROPIC_API_KEY')) {
    console.error(`\n✗ ${err.message}\n`);
    process.exit(1);
  }
  throw err;
}
const linkedinDest = join(outDir, 'linkedin.md');
writeFileSync(linkedinDest, linkedinPost, 'utf8');
console.log(`✓ linkedin.md written to output/${slug}/linkedin.md\n`);

// Done
console.log('All done!');
console.log(`  Edit slides:  output/${slug}/slides.md`);
console.log(`  Render PDF:   npm run render ${slug}`);
console.log(`  LinkedIn:     output/${slug}/linkedin.md`);
