/**
 * linkedin-gen.js
 * Calls the Claude API to generate a LinkedIn post from a blog post's prose.
 * Reads LINKEDIN_STYLE.md as the style guide, injected as the system prompt.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Generate a LinkedIn post for a blog article.
 *
 * @param {object} opts
 * @param {string} opts.slug      post slug (used in the blog URL)
 * @param {string} opts.prose     stripped prose text from the post
 * @param {string} opts.rootDir   repo root
 * @returns {Promise<string>}     LinkedIn post text
 */
export async function generateLinkedInPost({ slug, prose, rootDir = process.cwd() }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Export it before running this script.'
    );
  }

  const styleDoc = readFileSync(resolve(rootDir, 'LINKEDIN_STYLE.md'), 'utf8');
  const blogUrl = `https://atsokol.github.io/energy-blog/${slug}`;

  const client = new Anthropic({ apiKey });

  const systemPrompt = [
    'You are a professional content writer for an energy markets analysis blog.',
    'Write LinkedIn posts following the style guide below exactly.',
    '',
    '--- STYLE GUIDE ---',
    styleDoc,
    '--- END STYLE GUIDE ---',
    '',
    `The blog post URL is: ${blogUrl}`,
    'Use this URL in the CTA line as specified in the style guide.',
  ].join('\n');

  const userPrompt = [
    'Write a LinkedIn post for the following blog article. ',
    'Follow the style guide precisely: hook → context → 3 bullet findings → CTA → hashtags.',
    '',
    '--- ARTICLE PROSE ---',
    prose.slice(0, 8000), // cap to avoid very long posts hitting token limits
    '--- END ARTICLE ---',
  ].join('\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return message.content[0].text.trim();
}
