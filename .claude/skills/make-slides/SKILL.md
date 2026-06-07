---
description: Generate a PDF slide deck for a published blog post. Renders charts via Playwright (node .claude/skills/make-slides/scripts/generate-assets.mjs), writes slides.md with natively generated headings, assembles PDF.
disable-model-invocation: true
allowed-tools: Read Write Edit Bash
---

# Make slides

## Slides style guide (auto-loaded)
!`cat docs/SLIDES_STYLE.md`

## Workflow

Ask for the slug if not provided. Ask: full pipeline or re-render from existing `slides.md`?

### Full pipeline (recommended)

**Step 1 — Render charts via Playwright:**
```bash
node .claude/skills/make-slides/scripts/generate-assets.mjs <slug>
```

> **Important:** Always use `node .claude/skills/make-slides/scripts/generate-assets.mjs` directly — **never `npm run generate-assets`**. The `npm run` form is broken on Apple Silicon (Rosetta x64 context causes `@rollup/rollup-darwin-x64` missing error).

This builds the site and screenshots every Observable Plot chart as a PNG, writing them to `output/<slug>/charts/`. Each PNG captures the **full figure element** — chart body, title, subtitle, color legend, and caption. Wait for it to complete before proceeding; it can take 1–2 minutes because the pipeline waits for all remote CSV data to finish loading (`networkidle`).

**Step 2 — Generate `slides.md`:**

Read the chart files: `ls output/<slug>/charts/`
Read the prose from `src/<slug>.md` (ignore ` ```js ` blocks — focus on section headings and interpretation paragraphs).

Write `output/<slug>/slides.md` containing:
1. Frontmatter block from SLIDES_STYLE.md (exact YAML)
2. Title slide with `<!-- _class: title -->`, the post title as `# heading`, first 1-2 sentences of the intro as a paragraph, and `<span class="source">energy.atsokol.com/<slug></span>`
3. One `---`-separated slide per chart file in `output/<slug>/charts/`:
   - `## Heading` — ≤ 8 words, active-voice verb phrase, no "Chart:" or "Figure:" prefix
   - `![](./charts/<filename>.png)` image reference
   - `<span class="source">Source: energy.atsokol.com/<slug></span>`

Omit slides for interactive widget screenshots (date pickers, dropdowns, sliders). Identify widgets by checking the post prose context — the PNG itself may look like a chart but its section will describe user controls.
Omit duplicate chart types — keep only the most illustrative instance.

**Step 3 — Assemble PDF:**
```bash
npm run render <slug>
```

### Re-render only

If `output/<slug>/slides.md` already exists and has been manually edited:
```bash
npm run render <slug>
```

## Confirm outputs

- `output/<slug>/charts/*.png` — N chart files (full-figure PNGs at 2× scale)
- `output/<slug>/slides.md` — editable slide source
- `output/<slug>/slides.pdf` — final PDF

Remind: "To edit and re-render: modify `output/<slug>/slides.md` then run `npm run render <slug>`"
