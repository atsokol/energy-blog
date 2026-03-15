/**
 * parse-post.js
 * Reads a src/<slug>.md file and returns:
 *   - title: string (from the first # heading)
 *   - subtitle: string (first non-empty prose paragraph after the title)
 *   - prose: string (all text with fenced ```js blocks stripped out)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * @param {string} slug  e.g. "gas-peakers"
 * @param {string} rootDir  repo root (defaults to cwd)
 * @returns {{ title: string, subtitle: string, prose: string }}
 */
export function parsePost(slug, rootDir = process.cwd()) {
  const filePath = resolve(rootDir, 'src', `${slug}.md`);
  const raw = readFileSync(filePath, 'utf8');

  // Strip fenced code blocks (```js ... ``` and ``` ... ```)
  const prose = raw.replace(/^```[\s\S]*?^```/gm, '').trim();

  // Extract title from first # heading
  const titleMatch = prose.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  // Extract subtitle: first non-empty paragraph that is not a heading
  // Split on blank lines, filter out headings and empty lines
  const blocks = prose.split(/\n{2,}/);
  let subtitle = '';
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('---')) continue;
    // Take the first sentence of this block
    const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0];
    subtitle = firstSentence.replace(/\n/g, ' ').trim();
    break;
  }

  return { title, subtitle, prose };
}
