---
description: Create or edit an Observable Framework interactive post in src/. Reads WRITING_STYLE.md and CHARTS.md before writing any code.
disable-model-invocation: true
allowed-tools: Read Write Edit Bash Agent
---

# New post

You are creating or editing an Observable Framework interactive post for the energy-blog.

## Writing style guide (auto-loaded)
!`cat docs/WRITING_STYLE.md`

## Chart conventions (auto-loaded)
!`cat docs/CHARTS.md`

## Country color imports (auto-loaded)
!`cat src/components/countries.js`

## Workflow

Ask for the slug and data source if not provided.

Use the Agent tool to draft the full `.md` content: delegate prose + chart code generation with the style rules above injected into the subagent prompt. The subagent should produce the complete `src/<slug>.md` text.

Validate the draft before writing. For every chart:
- [ ] `title`, `subtitle` (with units/method), `caption` (with source) all present
- [ ] `width: Math.min(width, 800)`
- [ ] Colors imported from `./components/countries.js` — never hardcoded hex
- [ ] Percentage axes: `tickFormat: d3.format(".0%")`
- [ ] Multi-year time series: responsive tick pattern from CHARTS.md
- [ ] Each `Inputs.*` in its own ` ```js ` block immediately before its chart

For prose:
- [ ] No "I", "we", "you" — third-person analytical
- [ ] No hedging ("it seems", "perhaps", "may")
- [ ] Opening paragraph 2-4 sentences
- [ ] Key terms bolded on first use
- [ ] Methodological caveat before `---` separator
- [ ] Calculations annex uses `####` subsections
- [ ] **No chart mechanics in prose** — never write "the chart below shows X", "the map uses circles sized by Y", "blue = export, red = import", or any description of visual encoding. Section intros and interpretation paragraphs lead with the substantive finding; how the chart is built is self-evident or belongs in the subtitle/caption.

Write to `src/<slug>.md`. If this is a new post, also add it to `observablehq.config.js` pages array.
Confirm: "Run `npm run dev` to preview."
