/**
 * generate-slide-headers.js
 *
 * Given the list of charts (each with a section heading and surrounding prose),
 * calls the Claude API once to generate a punchy one-line slide header for every chart.
 *
 * Returns the same chart array with a `header` field added to each entry.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * @param {object} opts
 * @param {Array<{ index: number, heading: string, context: string, filename: string }>} opts.charts
 * @param {string} opts.postTitle   title of the blog post (for extra context)
 * @param {string} opts.rootDir
 * @returns {Promise<Array<{ index, heading, context, filename, header }>>}
 */
export async function generateSlideHeaders({ charts, postTitle, rootDir = process.cwd() }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set.');
  }

  const styleDoc = readFileSync(resolve(rootDir, 'SLIDES_STYLE.md'), 'utf8');

  // Build a numbered list of charts for the prompt
  const chartList = charts
    .map((c, i) => [
      `### Chart ${i + 1}`,
      `Section heading: ${c.heading || '(none)'}`,
      `Surrounding prose:\n${(c.context || '').slice(0, 600) || '(none)'}`,
    ].join('\n'))
    .join('\n\n');

  const systemPrompt = [
    'You are a slide-deck editor for an energy markets analysis blog.',
    'You write concise, informative slide headers following the style guide below.',
    '',
    '--- SLIDES STYLE GUIDE (heading rules section) ---',
    // Extract just the heading rules section from SLIDES_STYLE.md
    styleDoc.match(/## Chart slides[\s\S]*?(?=\n## |$)/)?.[0] ?? styleDoc,
    '--- END STYLE GUIDE ---',
  ].join('\n');

  const userPrompt = [
    `Post title: "${postTitle}"`,
    '',
    'For each chart below, write a single slide header: a punchy active-voice phrase,',
    'max 8 words, no trailing punctuation. Use the section heading and surrounding prose',
    'to capture the key finding or insight the chart illustrates.',
    '',
    'Return ONLY a JSON array of strings, one per chart, in the same order.',
    'Example: ["Gas peakers earn margin in ~10% of hours", "Solar capture falls as capacity grows"]',
    '',
    chartList,
  ].join('\n');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content[0].text.trim();

  // Parse the JSON array from the response
  let headers;
  try {
    // Strip markdown code fences if present
    const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    headers = JSON.parse(jsonText);
  } catch {
    console.warn('Warning: could not parse Claude header response as JSON. Using section headings.');
    headers = charts.map(c => c.heading);
  }

  return charts.map((c, i) => ({ ...c, header: headers[i] ?? c.heading }));
}
