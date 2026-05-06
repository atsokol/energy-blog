# Infra and Energy Data — Blog

Interactive data analysis blog on Ukraine and EU energy markets, built with [Observable Framework](https://observablehq.com/framework/) and deployed to GitHub Pages at [energy.atsokol.com](https://energy.atsokol.com).

## Posts

| Post | URL |
|------|-----|
| Economics of gas peakers | `/gas-peakers` |
| Economics of energy storage in Ukraine | `/energy-storage` |
| Renewables price capture | `/res-price-capture` |
| EV market in Ukraine | `/ev-market-ua` |
| Cross-border electricity trade | `/cross-border-flows` |

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

## Repo structure

```
src/
  index.md                 # homepage
  energy-storage.md
  res-price-capture.md
  gas-peakers.md
  ev-market-ua.md
  cross-border-flows.md
  components/
    countries.js           # shared Map: country code → name
docs/
  WRITING_STYLE.md         # prose voice, post structure, annex layout
  CHARTS.md                # Observable Plot chart reference
  LINKEDIN_STYLE.md        # LinkedIn post style guide
  SLIDES_STYLE.md          # PDF slide deck style guide
analytics/                 # LinkedIn analytics Excel exports
output/                    # generated artifacts per post (gitignored)
scripts/
  generate-assets.mjs      # renders charts via Playwright, screenshots
  render-slides.mjs        # assembles + renders PDF slide deck
  lib/
    render-pdf.js          # pdf-lib PDF assembly
    screenshot-charts.js   # Playwright chart capture
.claude/skills/            # Claude Code slash command skills
.github/workflows/
  deploy.yml               # builds + deploys on push or repository_dispatch
```

## Adding a new post

1. Prototype in R/Quarto (local scratchpad).
2. Export aggregated data to `res-yield-data/data/data_output/` via an R script.
3. Create `src/<slug>.md` — markdown prose + fenced ` ```js ` blocks (Observable JS).
4. Register the page in `observablehq.config.js`.
5. Push → auto-deploys via GitHub Actions.

See [docs/WRITING_STYLE.md](./docs/WRITING_STYLE.md) for prose voice, chart conventions, and interactive control patterns. See [docs/CHARTS.md](./docs/CHARTS.md) for the Observable Plot chart reference.

## Claude Code skills

Five skills cover the full content lifecycle. Invoke with `/skill-name` in Claude Code.

| Skill | What it does |
|-------|-------------|
| `/new-post` | Scaffold `src/<slug>.md` following writing and chart style guides |
| `/linkedin-post` | Generate `output/<slug>/linkedin.md` with full style-guide enforcement |
| `/make-slides` | Render charts via Playwright, write `slides.md`, assemble PDF |
| `/update-post` | Refresh an existing post's LinkedIn + slides when new monthly data arrives |
| `/post-analytics` | Read `analytics/` Excel files, compute engagement metrics, synthesise insights |

## Slide deck generation

```bash
node .claude/skills/make-slides/scripts/generate-assets.mjs <slug>   # render charts via Playwright
npm run render <slug>                                                  # assemble PDF from output/<slug>/slides.md
```

Charts are screenshotted from the live dev server via Playwright, then assembled into a 16:9 PDF with `pdf-lib` + `@resvg/resvg-js`.

### Output files

```
output/<slug>/
  charts/          SVG/PNG chart files (rendered by Playwright)
  slides.md        Slide deck source — edit this before re-rendering
  slides.pdf       Final PDF (1280×720 pt, 16:9)
  linkedin.md      LinkedIn post text
```
