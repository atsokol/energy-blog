# Infra and Energy Data — Blog

Interactive data analysis blog on Ukraine and EU energy markets, built with [Observable Framework](https://observablehq.com/framework/) and deployed to GitHub Pages at [energy.atsokol.com](https://energy.atsokol.com).

## Posts

| Post | URL |
|------|-----|
| Economics of gas peakers | `/gas-peakers` |
| Economics of energy storage in Ukraine | `/energy-storage` |
| Renewables price capture | `/res-price-capture` |
| EV market in Ukraine | `/ev-market-ua` |

## Architecture

Three-repo setup:

| Repo | Purpose |
|------|---------|
| `atsokol/res-yield-data` | Data repo — R scripts fetch raw data and export processed CSVs. Monthly GitHub Actions cron updates data and triggers blog rebuild via `repository_dispatch`. |
| `atsokol/energy-blog` | This repo — Observable Framework site → GitHub Pages. |
| Local `RES analysis/` | Private R/Quarto scratchpad. Never published. |

Pages fetch data directly from raw GitHub URLs in the data repo (no build-time data bundling).

## Local development

```bash
npm install
npm run dev      # preview at http://localhost:3000
npm run build    # production build → dist/
```

## Adding a new post

1. Prototype in R/Quarto (local scratchpad).
2. Export aggregated data to `res-yield-data/data/data_output/` via an R script.
3. Create `src/<slug>.md` — markdown prose + fenced ` ```js ` blocks (Observable JS).
4. Register the page in `observablehq.config.js`.
5. Push → auto-deploys via GitHub Actions.

See [WRITING_STYLE.md](./WRITING_STYLE.md) for prose voice, chart conventions, and interactive control patterns.

## Slide deck generation

The `scripts/` pipeline converts any post into a PDF slide deck — without a browser. Charts are rendered from Observable JS in Node.js via JSDOM + `@observablehq/plot`, then rasterised to PNG with `@resvg/resvg-js`, and assembled into a 16:9 PDF with `pdf-lib`.

### Full pipeline (charts + slides + LinkedIn)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run make_slides src/<slug>.md
```

This runs five steps:

| Step | Output |
|------|--------|
| 1. Parse post | Extracts title and prose |
| 2. Render charts | `output/<slug>/charts/*.svg` |
| 3. Generate slide headers | Claude API → punchy one-line headers |
| 4. Assemble slides | `output/<slug>/slides.md` |
| 5. Render PDF | `output/<slug>/slides.pdf` |
| + LinkedIn post | `output/<slug>/linkedin.md` |

If `ANTHROPIC_API_KEY` is not set, steps 3 and the LinkedIn post are skipped (section headings are used as slide titles instead).

### Re-render PDF after editing slides.md

Edit `output/<slug>/slides.md` first (adjust headings, remove or reorder slides), then:

```bash
npm run render <slug>
```

### Generate LinkedIn post independently

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run linkedin <slug>
```

Use this if `make_slides` was run without the API key, or to regenerate the post.

### Output files

```
output/<slug>/
  charts/          SVG chart files (one per Plot.plot() call)
  slides.md        Marp-format slide deck — edit this before re-rendering
  slides.pdf       Final PDF (1280×720 pt, 16:9)
  linkedin.md      LinkedIn post text
```

### Style guides

- **Slides:** [SLIDES_STYLE.md](./SLIDES_STYLE.md) — frontmatter, heading rules, layout conventions
- **LinkedIn:** [LINKEDIN_STYLE.md](./LINKEDIN_STYLE.md) — tone, structure, hashtag rules

## CI/CD

- **Blog** deploys on every push to `main`, and whenever `res-yield-data` fires `data-updated` via `repository_dispatch`.
- **Data** updates run monthly in `res-yield-data`. Requires secret `BLOG_DISPATCH_TOKEN` (PAT with `repo` scope on this repo) stored in `res-yield-data`.
- GitHub Pages source: Settings → Pages → Source: GitHub Actions.
