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

> **Note:** `energy-storage.md` and `res-price-capture.md` currently reference `energy-data-ua-eu` in their data URLs — update to `res-yield-data` once confirmed.

## Repo structure

```
src/
  index.md                 # homepage
  energy-storage.md        # Economics of energy storage in Ukraine
  res-price-capture.md     # Renewables price capture UA + EU
  ev-market-ua.md          # EV market in Ukraine
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

When converting an R/Quarto `.qmd` into a post, follow **[WRITING_STYLE.md](./WRITING_STYLE.md)** — prose voice, chart conventions, annex structure, and interactive control patterns derived from existing polished posts.

## Observable JS conventions

- npm packages: `import * as thing from "npm:package@version"` (no `require()`)
- Shared utilities live in `src/components/` and are imported as `import {x} from "./components/file.js"`
- `d3`, `Plot`, `Inputs`, `view` are available as globals
- All async data loads (`d3.csv(...)`) must use `await` so dependent cells receive an array, not a Promise

### Block cells: Framework vs. notebook syntax

Observable Framework `.md` files only recognise `const`/`let`/`var`, function, class, and import declarations as cell **outputs**. The classic notebook block-cell syntax `name = { ... return x; }` is silently ignored — the code runs but produces no output and nothing is displayed.

**Preferred patterns — split multi-step logic across separate ` ```js ` blocks:**

```js
// Step 1: named intermediate cells (accessible to all later blocks)
const grouped = d3.group(data, d => d.country)
const smoothed = Array.from(grouped, ([country, rows]) => regGen(rows).map(...)).flat()
```

```js
// Step 2: display cell — bare expression, no assignment
Plot.plot({ marks: [Plot.line(smoothed, {...})] })
```

Multiple `const` declarations in the same block are all exported and reactive. Prefer this over IIFEs — it makes each step independently named and reactive.

**Patterns reference:**

| Intent | Correct syntax |
|---|---|
| Named cell | `const name = expression` |
| Multiple prep steps | multiple `const` declarations in one block (no IIFE needed) |
| Display-only | bare `Plot.plot({...})` — last expression in a block is displayed |
| Reactive input | `const x = view(Inputs.select([...]))` |

`view()` is the preferred reactive input syntax (equivalent to `viewof`). It renders the widget inline and makes the value reactive.

Avoid IIFEs (`(() => { ... })()`). They are only necessary when a block must avoid polluting the namespace with intermediate variable names (rare).

### Arquero import

Arquero v8 does **not** export a named `aq` symbol. `import {aq, op} from "npm:arquero"` gives `aq = undefined`.

Always import arquero as:
```js
import * as aq from "npm:arquero"
import {op} from "npm:arquero"
```

`op` is a valid named export; `aq` must be a namespace import.

## CSS styling

`src/style.css` is **not** auto-loaded by Observable Framework. It must be registered explicitly:

```js
// observablehq.config.js
export default {
  style: "style.css",
  ...
}
```

Setting `style` **replaces** the entire default theme — the framework's own CSS is no longer injected. You must re-import it manually at the top of `style.css`:

```css
@import url("observablehq:default.css");
@import url("observablehq:theme-air.css");
@import url("observablehq:theme-near-midnight.css") (prefers-color-scheme: dark);
```

The framework's default prose max-width is 640px (hardcoded in `global.css`). To widen prose to match charts, override using the `#observablehq-main` ID prefix for sufficient specificity:

```css
#observablehq-main p,
#observablehq-main h1, /* ... etc */ {
  max-width: 800px;
}
```

Charts should use `width: Math.min(width, 800)` — the reactive `width` fills the container; capping at 800px keeps charts aligned with prose.

## Local dev

```bash
npm install
npm run dev   # preview at http://localhost:3000
```

## CI/CD

- **Blog deploys** on every push to `main`, and whenever `res-yield-data` fires `data-updated` via `repository_dispatch`
- **Data updates** run monthly in `res-yield-data`. Requires secret `BLOG_DISPATCH_TOKEN` (PAT with `repo` scope on this repo) stored in `res-yield-data`.
- GitHub Pages source: Settings → Pages → Source: GitHub Actions
