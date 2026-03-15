# Slide Deck Style Guide

Use this guide when assembling a Marp slide deck from a blog post.

## Marp frontmatter (place at the top of every slides.md)
```yaml
---
marp: true
theme: default
size: 16:9
paginate: true
style: |
  section {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    padding: 20px 40px;
  }
  section h1 {
    font-size: 2em;
    color: #1a1a2e;
    border-bottom: 3px solid #e63946;
  }
  section h2 {
    font-size: 1.4em;
    color: #1a1a2e;
    margin-top: 0;
    margin-bottom: 0.2em;
  }
  section img {
    display: block;
    margin: 0 auto;
    max-height: 88%;
    max-width: 100%;
    object-fit: contain;
  }
  section footer, section .source {
    font-size: 0.65em;
    color: #888;
    position: absolute;
    bottom: 24px;
    right: 40px;
  }
  section.title {
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.title p {
    font-size: 1.1em;
    color: #444;
    max-width: 700px;
    margin: 0 auto;
  }
---
```

## Title slide
- Use `<!-- _class: title -->` directive
- `# Post title` — exact post title, title case
- One paragraph teaser: first 1–2 sentences of the post's introductory paragraph (no charts, no code references)
- Source footnote: `<span class="source">energy.atsokol.com</span>`

## Chart slides
Each chart gets its own slide, separated by `---`.

**Heading rules:**
- Use `##` (h2) — rendered at 1.4em, fits on one line
- Max 8 words; prefer an active-voice verb phrase ("Gas peakers earn margin in ~10% of hours")
- Omit "Chart:", "Figure:", numbering prefixes
- If the nearest section heading is too long, rewrite it to be punchy; don't truncate mid-phrase

**Image:**
```markdown
![](./charts/01-chart-name.png)
```
- Centred automatically by CSS
- Do not set explicit width/height

**Source footnote (every chart slide):**
```markdown
<span class="source">Source: energy.atsokol.com/&lt;slug&gt;</span>
```

## What to omit
- Slides for interactive input widgets (date pickers, dropdowns, sliders) — charts only
- Methodology and data-loading details (those belong in the blog annex)
- Duplicate charts (if two code blocks produce the same chart type with different parameters, keep only the most illustrative one)
