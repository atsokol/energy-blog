/**
 * render-pdf.js
 *
 * Renders output/<slug>/slides.md → output/<slug>/slides.pdf without a browser.
 *
 * Pipeline:
 *   1. Parse slides.md to extract title, source URL, and per-slide {heading, chartFile}.
 *   2. Render each chart SVG → PNG buffer via @resvg/resvg-js (Rust-based, no Chromium).
 *   3. Assemble slides as a PDF using pdf-lib (explicit layout, no CSS engine).
 *
 * Why not Marp + Chromium:
 *   Chromium's PDF renderer collapses `height:auto` on inline composite SVGs (those with
 *   legends assembled by _wrapAsSvg) to ~0px regardless of viewBox or aspect-ratio CSS.
 *   Removing the browser eliminates the problem entirely.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Resvg } from '@resvg/resvg-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ---------------------------------------------------------------------------
// Layout constants  (1280×720 pt = 16:9, matching Marp default)
// ---------------------------------------------------------------------------
const SLIDE_W   = 1280;
const SLIDE_H   = 720;
const PAD_X     = 40;
const PAD_TOP   = 40;
const PAD_BOT   = 30;
const CHART_W   = SLIDE_W - 2 * PAD_X;  // 1200 pt

const TITLE_SIZE   = 52;
const HEADING_SIZE = 28;
const SOURCE_SIZE  = 10;
const PAGE_NUM_SIZE = 10;

const COLOR_DARK = rgb(0.102, 0.102, 0.180);  // #1a1a2e
const COLOR_RED  = rgb(0.902, 0.224, 0.275);  // #e63946
const COLOR_GREY = rgb(0.533, 0.533, 0.533);  // #888888

// ---------------------------------------------------------------------------
// slides.md parser
// ---------------------------------------------------------------------------

/**
 * Parse slides.md and return { title, sourceUrl, slides[] }.
 * Each slide is either { kind:'title', title, sourceUrl } or
 * { kind:'chart', heading, chartFile }.
 */
function parseSlideMd(md) {
  const sections = md.split(/^---$/m).map(s => s.trim());

  let title = '';
  let sourceUrl = '';
  const chartSlides = [];

  for (const section of sections) {
    // Skip YAML frontmatter block
    if (section.startsWith('marp:')) continue;

    const titleMatch = section.match(/^#\s+(.+)$/m);
    const headingMatch = section.match(/^##\s+(.+)$/m);
    const chartMatch = section.match(/!\[\]\(\.\/charts\/([^)]+\.svg)\)/);
    const sourceMatch = section.match(/<span[^>]*class="source"[^>]*>Source:\s*([^<]+)<\/span>/);

    if (sourceMatch) sourceUrl = sourceMatch[1].trim();

    if (titleMatch && !headingMatch) {
      title = titleMatch[1].trim();
    } else if (headingMatch && chartMatch) {
      chartSlides.push({
        heading: headingMatch[1].trim(),
        chartFile: chartMatch[1].trim(),
      });
    }
  }

  return { title, sourceUrl, chartSlides };
}

// ---------------------------------------------------------------------------
// SVG → PNG via resvg
// ---------------------------------------------------------------------------

function svgToPng(svgPath) {
  const svgString = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svgString, {
    font: { loadSystemFonts: true },
    fitTo: { mode: 'width', value: CHART_W * 4 },
  });
  return resvg.render().asPng();
}

// ---------------------------------------------------------------------------
// PDF assembly helpers
// ---------------------------------------------------------------------------

/**
 * Draw right-aligned text on a page.
 * pdf-lib measures text in pt: textWidth = font.widthOfTextAtSize(text, size).
 */
function drawRight(page, text, { font, size, color, y }) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: SLIDE_W - PAD_X - w,
    y,
    size,
    font,
    color,
  });
}

/**
 * Draw horizontally centred text.
 */
function drawCentre(page, text, { font, size, color, y }) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (SLIDE_W - w) / 2,
    y,
    size,
    font,
    color,
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Render output/<slug>/slides.md → output/<slug>/slides.pdf.
 *
 * @param {object} opts
 * @param {string} opts.outDir   absolute path to output/<slug>/
 */
export async function renderToPdf({ outDir }) {
  const slidesMdPath = join(outDir, 'slides.md');
  const slidesPdfPath = join(outDir, 'slides.pdf');
  const chartsDir = join(outDir, 'charts');

  const md = readFileSync(slidesMdPath, 'utf8');
  const { title, sourceUrl, chartSlides } = parseSlideMd(md);

  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const totalPages = 1 + chartSlides.length;

  // ---- Title slide --------------------------------------------------------
  {
    const page = doc.addPage([SLIDE_W, SLIDE_H]);
    page.drawRectangle({ x: 0, y: 0, width: SLIDE_W, height: SLIDE_H, color: rgb(1, 1, 1) });

    // Centre title vertically (approximate: text baseline at 40% from bottom)
    const titleY = SLIDE_H * 0.50;
    drawCentre(page, title, { font: fontBold, size: TITLE_SIZE, color: COLOR_DARK, y: titleY });

    // Red rule below title
    const ruleY = titleY - 16;
    page.drawLine({
      start: { x: PAD_X, y: ruleY },
      end:   { x: SLIDE_W - PAD_X, y: ruleY },
      thickness: 3,
      color: COLOR_RED,
    });

    // Source URL – bottom right
    if (sourceUrl) {
      drawRight(page, `Source: ${sourceUrl}`, { font: fontReg, size: SOURCE_SIZE, color: COLOR_GREY, y: PAD_BOT });
    }

    // Page number
    drawRight(page, '1', { font: fontReg, size: PAGE_NUM_SIZE, color: COLOR_GREY, y: PAD_BOT });
  }

  // ---- Chart slides -------------------------------------------------------
  for (let i = 0; i < chartSlides.length; i++) {
    const { heading, chartFile } = chartSlides[i];
    const page = doc.addPage([SLIDE_W, SLIDE_H]);
    page.drawRectangle({ x: 0, y: 0, width: SLIDE_W, height: SLIDE_H, color: rgb(1, 1, 1) });

    // Heading – top left
    const headingY = SLIDE_H - PAD_TOP - HEADING_SIZE;
    page.drawText(heading, {
      x: PAD_X,
      y: headingY,
      size: HEADING_SIZE,
      font: fontBold,
      color: COLOR_DARK,
    });

    // Chart PNG
    const pngBuffer = svgToPng(join(chartsDir, chartFile));
    const pngImage  = await doc.embedPng(pngBuffer);
    const { width: pngW, height: pngH } = pngImage.scale(1);

    const chartPtW = CHART_W;
    const chartPtH = Math.round(chartPtW * pngH / pngW);

    // Centre chart in the space below the heading
    const chartAreaTop = headingY - 12;               // gap below heading baseline
    const chartAreaBot = PAD_BOT;
    const chartAreaH   = chartAreaTop - chartAreaBot;
    const chartY       = chartAreaBot + Math.max(0, (chartAreaH - chartPtH) / 2);

    page.drawImage(pngImage, {
      x: PAD_X,
      y: chartY,
      width: chartPtW,
      height: chartPtH,
    });

    // Page number – bottom right
    drawRight(page, String(i + 2), { font: fontReg, size: PAGE_NUM_SIZE, color: COLOR_GREY, y: PAD_BOT });
  }

  const pdfBytes = await doc.save();
  writeFileSync(slidesPdfPath, pdfBytes);
}
