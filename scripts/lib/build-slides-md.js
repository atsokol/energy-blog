/**
 * build-slides-md.js
 * Assembles a Marp-format slides.md from:
 *   - post metadata (title, subtitle)
 *   - chart screenshots (heading + filename)
 *   - SLIDES_STYLE.md (for frontmatter + conventions)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Extract the YAML frontmatter block from SLIDES_STYLE.md.
 * Looks for the first ```yaml ... ``` fenced block.
 * Falls back to a sensible default if none found.
 */
function extractFrontmatter(styleDoc) {
  const match = styleDoc.match(/^```yaml\n([\s\S]*?)\n```/m);
  if (match) {
    // Strip leading/trailing --- delimiters if the yaml block includes them
    return match[1].trim().replace(/^---\n/, '').replace(/\n---$/, '').trim();
  }
  return [
    'marp: true',
    'theme: default',
    'size: 16:9',
    'paginate: true',
  ].join('\n');
}

/**
 * Extract source footnote format from SLIDES_STYLE.md.
 * Looks for the source footnote example line.
 */
function extractSourceTemplate(styleDoc) {
  const match = styleDoc.match(/<span class="source">Source: ([^<]+)<\/span>/);
  return match ? match[0] : '<span class="source">Source: energy.atsokol.com</span>';
}

/**
 * Build the full Marp slides.md string.
 *
 * @param {object} opts
 * @param {string} opts.slug
 * @param {string} opts.title
 * @param {string} opts.subtitle
 * @param {Array<{ heading: string, filename: string }>} opts.charts
 * @param {string} opts.rootDir
 * @returns {string}
 */
export function buildSlidesMd({ slug, title, subtitle, charts, rootDir = process.cwd() }) {
  const styleDoc = readFileSync(resolve(rootDir, 'SLIDES_STYLE.md'), 'utf8');
  const frontmatter = extractFrontmatter(styleDoc);
  const sourceTemplate = extractSourceTemplate(styleDoc).replace(
    /energy\.atsokol\.com\/[^"<]*/,
    `energy.atsokol.com/${slug}`
  );

  const lines = [];

  // Opening frontmatter
  lines.push('---');
  lines.push(frontmatter);
  lines.push('---');
  lines.push('');

  // Title slide
  lines.push('<!-- _class: title -->');
  lines.push('');
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(sourceTemplate);

  // Chart slides
  for (const chart of charts) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## ${chart.header ?? chart.heading}`);
    lines.push('');
    lines.push(`![](./charts/${chart.filename})`);
  }

  return lines.join('\n');
}
