# energy-blog

Observable Framework site deployed to GitHub Pages. Source of truth for published interactive analysis posts on Ukraine and EU electricity markets.

## Architecture

Three-repo setup:

| Repo | Purpose |
|---|---|
| `atsokol/res-yield-data` | Data repo. R scripts download raw data and export processed files. Monthly GitHub Actions cron updates data and triggers blog rebuild via `repository_dispatch`. |
| `atsokol/energy-blog` | This repo. Observable Framework site → GitHub Pages. |
| Local: `RES analysis/` | Private R/Quarto scratchpad. Never published. |

## Data loading

Pages load data directly from raw GitHub URLs in the data repo:

- Raw files: `https://raw.githubusercontent.com/atsokol/res-yield-data/refs/heads/main/data/data_raw/<file>.csv`
- Processed files: `https://raw.githubusercontent.com/atsokol/res-yield-data/refs/heads/main/data/data_output/<file>.csv`

> **Note:** The existing pages (`storage.md`, `capture.md`) currently reference `energy-data-ua-eu` in their URLs — update to `res-yield-data` once confirmed.

## Repo structure

```
src/
  index.md                 # homepage
  storage.md               # Economics of energy storage in Ukraine
  capture.md               # Renewables price capture UA + EU
  components/
    countries.js           # shared Map: country code → name
.github/workflows/
  deploy.yml               # builds + deploys on push or repository_dispatch
```

## Adding a new post

1. Explore and prototype in R/Quarto (local scratchpad)
2. Export clean/aggregated data to `res-yield-data/data/data_output/` via an R script
3. Create `src/<slug>.md` — markdown prose + fenced ` ```js ` blocks (Observable JS)
4. Add the page to `observablehq.config.js`
5. Push → auto-deploys

## Observable JS conventions

- `viewof` inputs and reactive cells work the same as in Observable notebooks
- npm packages: `import * as thing from "npm:package@version"` (no `require()`)
- Shared utilities live in `src/components/` and are imported as `import {x} from "./components/file.js"`
- `d3`, `Plot`, `Inputs` are available as globals
- All async data loads (`d3.csv(...)`) must use `await` so dependent cells receive an array, not a Promise

### Block cells: Framework vs. notebook syntax

Observable Framework `.md` files only recognise `const`/`let`/`var`, function, class, and import declarations as cell **outputs**. The classic notebook block-cell syntax `name = { ... return x; }` is silently ignored — the code runs but produces no output and nothing is displayed.

**Always use these patterns instead:**

| Intent | Correct syntax |
|---|---|
| Named cell (used by other cells) | `const name = (() => { ...; return value; })()` |
| Display-only cell (renders a chart) | `(() => { ...; return Plot.plot({...}); })()` |

### Arquero import

Arquero v8 does **not** export a named `aq` symbol. `import {aq, op} from "npm:arquero"` gives `aq = undefined`.

Always import arquero as:
```js
import * as aq from "npm:arquero"
import {op} from "npm:arquero"
```

`op` is a valid named export; `aq` must be a namespace import.

## Local dev

```bash
npm install
npm run dev   # preview at http://localhost:3000
```

## CI/CD

- **Blog deploys** on every push to `main`, and whenever `res-yield-data` fires `data-updated` via `repository_dispatch`
- **Data updates** run monthly in `res-yield-data`. Requires secret `BLOG_DISPATCH_TOKEN` (PAT with `repo` scope on this repo) stored in `res-yield-data`.
- GitHub Pages source: Settings → Pages → Source: GitHub Actions
