/**
 * render-charts-node.js
 *
 * Renders Observable Plot charts from a Framework .md notebook in Node.js —
 * no browser, no build step needed.
 *
 * Strategy:
 *   1. Parse the .md file into ordered JS blocks, tracking which heading
 *      precedes each block.
 *   2. Collect all `import` statements, rewriting `npm:X` → `X` (npm package)
 *      and `./components/X` → absolute path.
 *   3. Generate a temporary ESM runner script that:
 *        - Imports all needed packages (d3, Plot, arquero, …)
 *        - Provides Observable globals (width, view, Inputs, …) as mocks
 *        - Wraps Plot.plot() to capture SVG output
 *        - Concatenates all cell code at top level (supports top-level await)
 *        - Writes captured SVGs + a manifest.json to outDir
 *   4. Executes the runner with `node` and returns the manifest.
 *
 * Limitations:
 *   - Reactive inputs (sliders, dropdowns) use their first/default value.
 *   - Cells sharing a variable name across blocks will conflict; rename if needed.
 *   - `FileAttachment` is not supported (all data must load from URLs).
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// npm: package name mapping (Observable Framework CDN → npm package name)
// ---------------------------------------------------------------------------
const NPM_SPECIFIER_MAP = {
  'arquero': 'arquero',
  'd3': 'd3',
  'd3-regression': 'd3-regression',
  'd3-array': 'd3-array',
  'topojson-client': 'topojson-client',
  'vega-lite': 'vega-lite',
};

// Packages already injected into the runner preamble — skip if encountered in imports
const BUILTIN_NAMES = new Set(['d3', '_Plot', 'aq', 'op', 'd3reg', 'jsdom', '_d3reg']);

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse the .md file into an ordered list of blocks.
 * Each block: { code: string, heading: string, context: string, isChart: boolean }
 *
 * `context` = prose paragraphs (non-code, non-heading lines) that appear in the
 * same section, up to and including those immediately before this block.
 * Chart-generation code uses this to write meaningful slide headers.
 *
 * Fenced blocks with languages other than `js` are ignored.
 */
function extractBlocks(mdContent) {
  const blocks = [];
  let currentHeading = '';
  let currentProse = [];   // prose lines accumulated since the last heading/chart
  const lines = mdContent.split('\n');
  let inBlock = false;
  let blockLang = '';
  let blockLines = [];
  let inNonJsBlock = false;

  for (const line of lines) {
    if (!inBlock && !inNonJsBlock) {
      const headingMatch = line.match(/^#{1,3}\s+(.+)/);
      if (headingMatch) {
        currentHeading = headingMatch[1].trim();
        currentProse = [];   // reset prose context at each new section
        continue;
      }
      if (line.startsWith('```js')) {
        inBlock = true;
        blockLang = 'js';
        blockLines = [];
        continue;
      }
      if (line.startsWith('```')) {
        inNonJsBlock = true;
        continue;
      }
      // Accumulate prose (skip blank lines at start of accumulation)
      if (line.trim() || currentProse.length > 0) {
        currentProse.push(line);
      }
    } else if (inNonJsBlock) {
      if (line.startsWith('```')) inNonJsBlock = false;
    } else {
      // inside a ```js block
      if (line.startsWith('```')) {
        const code = blockLines.join('\n').trim();
        if (code) {
          const isChart = /\bPlot\.plot\s*\(/.test(code);
          // Trim trailing blank lines from prose, join to string
          const trimmedProse = currentProse
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          blocks.push({ code, heading: currentHeading, context: trimmedProse, isChart });
          if (isChart) currentProse = [];  // reset after a chart so next chart gets fresh context
        }
        inBlock = false;
        blockLang = '';
        blockLines = [];
      } else {
        blockLines.push(line);
      }
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Import rewriting
// ---------------------------------------------------------------------------

/**
 * Rewrite a single import specifier:
 *   "npm:arquero"          → "arquero"
 *   "npm:arquero@8"        → "arquero"
 *   "./components/foo.js"  → "/abs/path/src/components/foo.js"
 *   anything else          → unchanged
 */
function rewriteSpecifier(spec, srcDir) {
  if (spec.startsWith('npm:')) {
    const pkg = spec.slice(4).replace(/@.*$/, '');
    return NPM_SPECIFIER_MAP[pkg] || pkg;
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    return resolve(srcDir, spec);
  }
  return spec;
}

/**
 * Rewrite all import specifiers in a block of code.
 * Returns the rewritten code.
 */
function rewriteImports(code, srcDir) {
  return code.replace(
    /from\s+(['"])(.*?)\1/g,
    (_, q, spec) => `from ${q}${rewriteSpecifier(spec, srcDir)}${q}`
  );
}

// ---------------------------------------------------------------------------
// Runner generation
// ---------------------------------------------------------------------------

/**
 * Collect all import statements from the blocks, deduplicate, and rewrite.
 * Returns { importLines: string[], strippedBlocks: block[] }
 */
function collectImports(blocks, srcDir) {
  const seen = new Set();
  const importLines = [];
  const strippedBlocks = blocks.map(block => {
    const lines = block.code.split('\n');
    const bodyLines = [];
    for (const line of lines) {
      if (/^\s*import\s/.test(line)) {
        const rewritten = rewriteImports(line, srcDir);
        if (!seen.has(rewritten)) {
          seen.add(rewritten);
          importLines.push(rewritten);
        }
      } else {
        bodyLines.push(line);
      }
    }
    return { ...block, code: bodyLines.join('\n') };
  });
  return { importLines, strippedBlocks };
}

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------

/**
 * Extract top-level declared variable names from a block of code.
 * Handles: const x, let x, var x, const { x, y }, const [x, y]
 */
function getDeclaredNames(code) {
  const names = new Set();
  // Simple declarations: const foo =  (only top-level, no leading whitespace)
  for (const [, name] of code.matchAll(/^(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=,;\n]/gm)) {
    names.add(name);
  }
  // Destructuring: const { foo, bar }  (only top-level, no leading whitespace)
  for (const [, inner] of code.matchAll(/^(?:const|let|var)\s+\{([^}]+)\}/gm)) {
    for (const part of inner.split(',')) {
      const m = part.trim().match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (m) names.add(m[1]);
    }
  }
  return names;
}

/**
 * Sort blocks so each block's dependencies execute before it.
 * Observable notebooks are reactive (any order is valid), but our runner
 * is linear, so we need topological order.
 */
function topoSort(blocks) {
  const n = blocks.length;
  const defs = blocks.map(b => getDeclaredNames(b.code));

  // Build adjacency: edge[i] = set of block indices that block i depends on
  const deps = blocks.map((block, i) => {
    const needed = new Set();
    for (const [j, defSet] of defs.entries()) {
      if (i === j || defSet.size === 0) continue;
      for (const name of defSet) {
        // word-boundary check: name appears in block i's code
        if (new RegExp(`\\b${name}\\b`).test(block.code)) {
          needed.add(j);
          break;
        }
      }
    }
    return needed;
  });

  // Kahn's algorithm
  const inDegree = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (const j of deps[i]) inDegree[j]; // j must come before i → i depends on j
  }
  // Recount: inDegree[i] = number of blocks that i depends on and haven't been scheduled
  // Actually: inDegree[i] = |deps[i]|
  const degree = deps.map(d => d.size);

  const queue = [];
  for (let i = 0; i < n; i++) if (degree[i] === 0) queue.push(i);

  const order = [];
  const scheduled = new Set();
  while (queue.length > 0) {
    const i = queue.shift();
    order.push(i);
    scheduled.add(i);
    // For every block that depended on i, decrement its degree
    for (let j = 0; j < n; j++) {
      if (deps[j].has(i)) {
        degree[j]--;
        if (degree[j] === 0 && !scheduled.has(j)) queue.push(j);
      }
    }
  }

  // Append any remaining (cycles or missed) in original order
  for (let i = 0; i < n; i++) if (!scheduled.has(i)) order.push(i);

  return order.map(i => blocks[i]);
}

/**
 * Generate a self-contained Node.js ESM runner script.
 */
function generateRunner({ blocks, srcDir, outDir }) {
  const { importLines, strippedBlocks } = collectImports(blocks, srcDir);
  const sortedBlocks = topoSort(strippedBlocks);

  // Filter out imports for packages we inject in the preamble
  const userImports = importLines.filter(line => {
    // Keep if it's not one of our builtin injections
    const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!fromMatch) return true;
    const pkg = fromMatch[1];
    return !['d3', '@observablehq/plot', 'arquero', 'jsdom'].includes(pkg);
  });

  const preamble = `
// === RUNNER PREAMBLE (auto-generated) ===
import * as d3 from 'd3';
import * as _Plot from '@observablehq/plot';
import * as aq from 'arquero';
import { op } from 'arquero';
import { JSDOM } from 'jsdom';
import { writeFileSync, mkdirSync } from 'fs';
${userImports.join('\n')}

// DOM setup for Observable Plot SVG rendering
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { document } = window;
global.document = document;
global.window   = window;
global.SVGElement = window.SVGElement;

// Canvas mock for Plot's legendRamp (continuous color legends).
// Plot renders gradients pixel-by-pixel: fillStyle=color(t), fillRect(x,0,1,1).
// We capture each (x → color) pair and reconstruct an SVG linearGradient.
let _pixelFill = '';
const _pixelMap = new Map();
window.HTMLCanvasElement.prototype.getContext = function(type) {
  if (type !== '2d') return null;
  _pixelMap.clear();
  return {
    get fillStyle()  { return _pixelFill; },
    set fillStyle(v) { _pixelFill = v; },
    fillRect: (x, _y, w) => { if (w <= 2) _pixelMap.set(x, _pixelFill); },
    clearRect: () => {},
    drawImage: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
  };
};
window.HTMLCanvasElement.prototype.toDataURL = function() {
  const cw = this.width || 240;
  const ch = this.height || 10;
  if (_pixelMap.size === 0) return '';
  const sorted = Array.from(_pixelMap.entries()).sort(([a], [b]) => a - b);
  const n = sorted.length;
  // Sample ~20 representative stops evenly across the range
  const step = Math.max(1, Math.floor(n / 20));
  const sampled = sorted.filter((_, i) => i % step === 0 || i === n - 1);
  const stops = sampled.map(([x, c]) => '<stop offset="' + (x / (n - 1)) + '" stop-color="' + c + '"/>').join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + cw + '" height="' + ch + '"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">' + stops + '</linearGradient></defs><rect width="' + cw + '" height="' + ch + '" fill="url(#g)"/></svg>';
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
};

// Observable Framework globals (mocked with sensible defaults)
const width = 800;
const view  = (x) => x;   // Inputs already return the default value (see below)
const display = (x) => x; // Observable display() — passthrough in runner context
const html  = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (vals[i] ?? ''), '');
const Inputs = {
  select : (opts, cfg = {}) => {
    const arr = Array.isArray(opts) ? opts : Object.keys(opts);
    return 'value' in cfg ? cfg.value : arr[0];
  },
  range  : ([min], cfg = {}) => 'value' in cfg ? cfg.value : min,
  checkbox: (_opts, cfg = {}) => 'value' in cfg ? cfg.value : [],
  radio  : (opts, cfg = {}) => {
    const arr = Array.isArray(opts) ? opts : Object.keys(opts);
    return 'value' in cfg ? cfg.value : arr[0];
  },
  date   : (cfg = {}) => 'value' in cfg ? new Date(cfg.value) : new Date('2024-01-01'),
  text   : (cfg = {}) => 'value' in cfg ? cfg.value : '',
  toggle : (cfg = {}) => 'value' in cfg ? cfg.value : false,
  button : (_label, cfg = {}) => 0,
};

// Chart capture
const _charts = [];
let   _currentHeading = '';
let   _currentContext = '';

// Wrap Plot.plot to capture SVG output keyed to the current heading + prose context
const Plot = new Proxy(_Plot, {
  get(t, prop) {
    if (prop === 'plot') {
      return (opts = {}) => {
        const el = _Plot.plot({ ...opts, document });
        _charts.push({ svg: el.outerHTML, heading: _currentHeading, context: _currentContext });
        return el;
      };
    }
    return Reflect.get(t, prop);
  },
});

const _outDir = ${JSON.stringify(outDir)};
mkdirSync(_outDir, { recursive: true });

// === CELL CODE ===
`.trimStart();

  // Build cell execution lines (in dependency-resolved order)
  const cellLines = [];
  for (const block of sortedBlocks) {
    if (!block.code.trim()) continue;
    if (block.isChart) {
      cellLines.push(`_currentHeading = ${JSON.stringify(block.heading)};`);
      cellLines.push(`_currentContext = ${JSON.stringify(block.context || '')};`);
    }
    cellLines.push(rewriteImports(block.code, srcDir));
    cellLines.push('');
  }

  const postamble = `
// === WRITE OUTPUTS ===
const _slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Extract a single SVG element whose opening tag matches classPattern.
// Uses a depth counter to handle nested <svg> elements correctly.
function _extractSvg(html, classPattern) {
  const tagRe = new RegExp('<svg(?=[^>]*class="' + classPattern + '")[^>]*>');
  const m = tagRe.exec(html);
  if (!m) return null;
  let pos = m.index + m[0].length;
  let depth = 1;
  while (depth > 0 && pos < html.length) {
    const open  = html.indexOf('<svg', pos);
    const close = html.indexOf('</svg', pos);
    if (close === -1) break;
    if (open !== -1 && open < close) {
      depth++;
      pos = open + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(m.index, close + 6);
      pos = close + 6;
    }
  }
  return null;
}

// Ensure an SVG string has an xmlns attribute.
function _addXmlns(svgStr) {
  return svgStr.includes('xmlns=')
    ? svgStr
    : svgStr.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}

// Extract categorical swatches from figure HTML and return an SVG <g> legend strip,
// or null if no swatches are present.
function _swatchesToSvg(figHtml) {
  const swatchRe = /<span class="plot-[a-z0-9]+-swatch">\\s*<svg[^>]*fill="([^"]+)"[^>]*>[\\s\\S]*?<\\/svg>\\s*([\\s\\S]*?)\\s*<\\/span>/g;
  const swatches = [];
  for (const m of figHtml.matchAll(swatchRe)) {
    const label = m[2].replace(/<[^>]+>/g, '').trim();
    if (m[1] && label) swatches.push({ color: m[1], label });
  }
  if (swatches.length === 0) return null;

  const itemW = 130, rowH = 22, rectSize = 12, gap = 5;
  const items = swatches.map((s, i) => {
    const x = i * itemW;
    return '<rect x="' + x + '" y="' + ((rowH - rectSize) / 2) + '" width="' + rectSize + '" height="' + rectSize + '" fill="' + s.color + '"/>' +
      '<text x="' + (x + rectSize + gap) + '" y="' + (rowH / 2) + '" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="11" fill="#333">' + s.label + '</text>';
  });
  return { g: '<g>' + items.join('') + '</g>', h: rowH };
}

// Compose a valid standalone SVG from a Plot <figure> element.
// Extracts title/subtitle, swatches, ramp, and main chart; stacks them vertically.
// Avoids <foreignObject> — SVGs loaded via <img> cannot render it.
function _wrapAsSvg(figHtml) {
  const mainSvg = _extractSvg(figHtml, 'plot-[a-z0-9]+');
  if (!mainSvg) return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"></svg>';

  const mW = parseInt(mainSvg.match(/width="(\\d+)"/)?.[1] ?? '800');
  const mH = parseInt(mainSvg.match(/height="(\\d+)"/)?.[1] ?? '400');

  // Extract HTML title / subtitle from the <figure> wrapper (Plot renders these
  // as <h2> / <h3> elements outside the SVG, so we convert them to SVG text).
  const titleText    = (figHtml.match(/<h2[^>]*>([\\s\\S]*?)<\\/h2>/) ?? [])[1]?.trim();
  const subtitleText = (figHtml.match(/<h3[^>]*>([\\s\\S]*?)<\\/h3>/) ?? [])[1]?.trim();

  const _FONT = 'system-ui, sans-serif';
  const parts = [];
  let y = 0;

  if (titleText) {
    parts.push('<text x="4" y="' + (y + 15) + '" font-family="' + _FONT + '" font-size="13" font-weight="bold" fill="currentColor">' + titleText + '</text>');
    y += 22;
  }
  if (subtitleText) {
    parts.push('<text x="4" y="' + (y + 12) + '" font-family="' + _FONT + '" font-size="11" fill="#888">' + subtitleText + '</text>');
    y += 18;
  }

  // Categorical legend (HTML swatch divs → SVG rects + text)
  const swatchResult = _swatchesToSvg(figHtml);
  if (swatchResult) {
    parts.push('<g transform="translate(4,' + y + ')">' + swatchResult.g + '</g>');
    y += swatchResult.h;
  }

  // Continuous legend (color ramp SVG with gradient image)
  const rampSvg = _extractSvg(figHtml, 'plot-[a-z0-9]+-ramp');
  if (rampSvg) {
    const rH = parseInt(rampSvg.match(/height="(\\d+)"/)?.[1] ?? '50');
    // Add overflow="visible" as attribute so resvg doesn't clip ticks that
    // fall 0.5px outside the ramp SVG viewport (CSS overflow:visible is ignored
    // by resvg for nested SVG clip regions).
    const rampSvgVisible = rampSvg.replace(/^<svg /, '<svg overflow="visible" ');
    parts.push('<g transform="translate(0,' + y + ')">' + rampSvgVisible + '</g>');
    y += rH + 6;
  }

  // Main chart
  parts.push('<g transform="translate(0,' + y + ')">' + mainSvg + '</g>');
  y += mH;

  if (parts.length === 1) return _addXmlns(mainSvg); // no title, no legends

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + mW + '" height="' + y + '">' +
    parts.join('') + '</svg>';
}

const manifest = _charts.map(({ svg, heading, context }, i) => {
  const idx      = String(i + 1).padStart(2, '0');
  const filename = idx + '-' + _slugify(heading || 'chart-' + (i + 1)) + '.svg';
  // If Plot returned a <figure> wrapper, embed it in a valid SVG via foreignObject
  const content  = svg.trimStart().startsWith('<figure') ? _wrapAsSvg(svg) : svg;
  writeFileSync(_outDir + '/' + filename, content, 'utf8');
  return { index: i, heading, context, filename };
});

writeFileSync(_outDir + '/_manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
console.error('[render-charts-node] wrote ' + manifest.length + ' chart(s) to ' + _outDir);
`;

  return preamble + cellLines.join('\n') + postamble;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render all Observable Plot charts from an .md notebook file, in Node.js.
 *
 * @param {object} opts
 * @param {string} opts.mdPath   absolute path to the source .md file
 * @param {string} opts.outDir   directory to write chart SVGs + manifest.json
 * @param {string} opts.rootDir  repo root (used to resolve src/ components)
 * @returns {Promise<Array<{ index: number, heading: string, filename: string }>>}
 */
export async function renderChartsFromMd({ mdPath, outDir, rootDir }) {
  const srcDir = resolve(rootDir, 'src');
  const mdContent = readFileSync(mdPath, 'utf8');

  const blocks = extractBlocks(mdContent);
  const runnerCode = generateRunner({ blocks, srcDir, outDir });

  // Write the runner inside the repo root so Node.js ESM resolution
  // can walk up and find node_modules/ from the file's location.
  // (Writing to /tmp/ breaks import resolution for d3, arquero, etc.)
  const tmpFile = join(
    rootDir,
    `.obs-runner-${randomBytes(6).toString('hex')}.mjs`
  );
  writeFileSync(tmpFile, runnerCode, 'utf8');

  try {
    execSync(`node "${tmpFile}"`, {
      cwd: rootDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, NODE_OPTIONS: '' },
    });
  } finally {
    if (process.env.DEBUG_RUNNER) {
      console.error('[debug] runner kept at:', tmpFile);
    } else {
      try { rmSync(tmpFile); } catch { /* ignore */ }
    }
  }

  const manifestPath = join(outDir, '_manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  rmSync(manifestPath);

  return manifest;
}

// Export internals so specialised scripts (e.g. gen-update-slides.mjs) can
// generate patched runners without re-parsing the whole .md file.
export { extractBlocks, generateRunner };
