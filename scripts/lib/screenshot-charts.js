/**
 * screenshot-charts.js
 * Uses Playwright to render an Observable Framework page and screenshot every
 * Observable Plot chart (svg.plot elements).
 *
 * Returns an array of:
 *   { index: number, heading: string, filename: string, buffer: Buffer }
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';

const MIME_MAP = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const MIME_FALLBACK = 'application/octet-stream';

/**
 * Minimal static file server over a directory.
 * @param {string} dir  directory to serve
 * @returns {{ port: number, close: () => void }}
 */
function serveDir(dir) {
  const server = createServer((req, res) => {
    // Strip query string
    let urlPath = req.url.split('?')[0];
    // Default index
    if (urlPath.endsWith('/')) urlPath += 'index.html';

    let filePath = join(dir, urlPath);

    // Observable Framework emits extensionless paths → try .html
    if (!existsSync(filePath)) {
      const withHtml = filePath + '.html';
      if (existsSync(withHtml)) {
        filePath = withHtml;
      } else {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }

    const mime = MIME_MAP[extname(filePath)] || MIME_FALLBACK;
    res.writeHead(200, { 'Content-Type': mime });
    res.end(readFileSync(filePath));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        port,
        close: () => server.close(),
      });
    });
  });
}

/**
 * Slugify a heading string to a safe filename fragment.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Screenshot all svg.plot charts on an Observable Framework page.
 *
 * @param {object} opts
 * @param {string} opts.distDir   path to the built dist/ directory
 * @param {string} opts.slug      post slug (e.g. "gas-peakers")
 * @param {number} [opts.timeout] ms to wait for networkidle (default 30000)
 * @returns {Promise<Array<{ index: number, heading: string, filename: string, buffer: Buffer }>>}
 */
export async function screenshotCharts({ distDir, slug, timeout = 30000 }) {
  const server = await serveDir(distDir);
  const url = `http://127.0.0.1:${server.port}/${slug}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Wide viewport so charts render at full width
  await page.setViewportSize({ width: 1280, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout });

    // Additional wait: ensure at least one svg.plot has rendered
    await page.waitForFunction(
      () => document.querySelectorAll('svg.plot').length > 0,
      { timeout }
    );

    // Collect chart metadata from the DOM
    const charts = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg.plot'));

      // Collect all headings with their top positions
      const headings = Array.from(document.querySelectorAll('h2, h3')).map((el) => ({
        text: el.textContent.trim(),
        top: el.getBoundingClientRect().top + window.scrollY,
      }));

      return svgs.map((svg, i) => {
        // Find the parent observablehq block
        let container = svg.parentElement;
        while (container && !container.classList.contains('observablehq')) {
          container = container.parentElement;
        }

        const svgTop = svg.getBoundingClientRect().top + window.scrollY;

        // Nearest heading above this chart
        let heading = `Chart ${i + 1}`;
        let bestTop = -Infinity;
        for (const h of headings) {
          if (h.top < svgTop && h.top > bestTop) {
            bestTop = h.top;
            heading = h.text;
          }
        }

        return {
          index: i,
          heading,
          // We'll use the container's bounding rect in a separate step
          // (can't return DOM nodes from evaluate)
        };
      });
    });

    // Screenshot each chart container
    const results = [];
    for (const chart of charts) {
      const svgHandle = await page.$$('svg.plot');
      const svgEl = svgHandle[chart.index];
      if (!svgEl) continue;

      // Walk up to the observablehq block container
      let containerHandle = await svgEl.evaluateHandle((el) => {
        let node = el.parentElement;
        while (node && !node.classList.contains('observablehq')) {
          node = node.parentElement;
        }
        return node || el.parentElement;
      });

      const buffer = await containerHandle.screenshot({ type: 'png' });

      const idx = String(chart.index + 1).padStart(2, '0');
      const filename = `${idx}-${slugify(chart.heading)}.png`;

      results.push({
        index: chart.index,
        heading: chart.heading,
        filename,
        buffer,
      });
    }

    return results;
  } finally {
    await browser.close();
    server.close();
  }
}
