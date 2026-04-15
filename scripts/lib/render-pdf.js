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
const SLIDE_H   = 960;   // 4:3 — better fit for double-stacked charts
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
 * Word-wrap text to fit within maxWidth, returning an array of lines.
 */
function wrapText(text, font, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
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
export async function renderToPdf({ outDir, mdFile = 'slides.md', pdfFile = 'slides.pdf' }) {
  const slidesMdPath = join(outDir, mdFile);
  const slidesPdfPath = join(outDir, pdfFile);
  const chartsDir = join(outDir, 'charts');

  const md = readFileSync(slidesMdPath, 'utf8');
  const { title, sourceUrl, chartSlides } = parseSlideMd(md);

  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const hasTitleSlide = Boolean(title);
  const totalPages = (hasTitleSlide ? 1 : 0) + chartSlides.length;

  // ---- Title slide (only when a # heading exists in the MD) ---------------
  if (hasTitleSlide) {
    const page = doc.addPage([SLIDE_W, SLIDE_H]);
    page.drawRectangle({ x: 0, y: 0, width: SLIDE_W, height: SLIDE_H, color: rgb(1, 1, 1) });

    const titleY = SLIDE_H * 0.50;
    drawCentre(page, title, { font: fontBold, size: TITLE_SIZE, color: COLOR_DARK, y: titleY });

    const ruleY = titleY - 16;
    page.drawLine({
      start: { x: PAD_X, y: ruleY },
      end:   { x: SLIDE_W - PAD_X, y: ruleY },
      thickness: 3,
      color: COLOR_RED,
    });

    if (sourceUrl) {
      drawRight(page, `Source: ${sourceUrl}`, { font: fontReg, size: SOURCE_SIZE, color: COLOR_GREY, y: PAD_BOT });
    }

    drawRight(page, '1', { font: fontReg, size: PAGE_NUM_SIZE, color: COLOR_GREY, y: PAD_BOT });
  }

  // ---- Chart slides -------------------------------------------------------
  const pageOffset = hasTitleSlide ? 2 : 1;
  for (let i = 0; i < chartSlides.length; i++) {
    const { heading, chartFile } = chartSlides[i];
    const page = doc.addPage([SLIDE_W, SLIDE_H]);
    page.drawRectangle({ x: 0, y: 0, width: SLIDE_W, height: SLIDE_H, color: rgb(1, 1, 1) });

    // Heading – top left, word-wrapped to fit slide width
    const maxHeadingW  = SLIDE_W - 2 * PAD_X;
    const headingLines = wrapText(heading, fontBold, HEADING_SIZE, maxHeadingW);
    const lineHeight   = Math.round(HEADING_SIZE * 1.3);
    const headingY     = SLIDE_H - PAD_TOP - HEADING_SIZE;

    for (let li = 0; li < headingLines.length; li++) {
      page.drawText(headingLines[li], {
        x: PAD_X,
        y: headingY - li * lineHeight,
        size: HEADING_SIZE,
        font: fontBold,
        color: COLOR_DARK,
      });
    }

    // Chart PNG
    const pngBuffer = svgToPng(join(chartsDir, chartFile));
    const pngImage  = await doc.embedPng(pngBuffer);
    const { width: pngW, height: pngH } = pngImage.scale(1);

    // Available area below heading (accounts for multi-line headings)
    const chartAreaTop = headingY - (headingLines.length - 1) * lineHeight - 12;
    const chartAreaBot = PAD_BOT;
    const chartAreaH   = chartAreaTop - chartAreaBot;
    const chartAreaW   = CHART_W;

    // Scale to fit both dimensions (maintain aspect ratio)
    const scale    = Math.min(chartAreaW / pngW, chartAreaH / pngH);
    const drawW    = Math.round(pngW * scale);
    const drawH    = Math.round(pngH * scale);

    // Centre within available area
    const chartX   = PAD_X + Math.round((chartAreaW - drawW) / 2);
    const chartY   = chartAreaBot + Math.round((chartAreaH - drawH) / 2);

    page.drawImage(pngImage, {
      x: chartX,
      y: chartY,
      width: drawW,
      height: drawH,
    });

    // Page number – bottom right
    drawRight(page, String(i + pageOffset), { font: fontReg, size: PAGE_NUM_SIZE, color: COLOR_GREY, y: PAD_BOT });
  }

  const pdfBytes = await doc.save();
  writeFileSync(slidesPdfPath, pdfBytes);
}
