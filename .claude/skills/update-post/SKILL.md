---
description: Refresh an existing blog post's downstream artifacts (LinkedIn post, slides) when new monthly data arrives. Does not rewrite the blog post itself — src/<slug>.md auto-updates via live GitHub data URLs.
disable-model-invocation: true
allowed-tools: Read Write Edit Bash
---

# Update post

Use this when new monthly data has arrived and an existing post needs refreshed outputs.

The blog post `src/<slug>.md` updates its charts automatically — it loads data from live GitHub URLs. This skill handles the downstream artifacts: an updated LinkedIn post and updated slides.

## Style guides (auto-loaded)
!`cat docs/LINKEDIN_STYLE.md`
!`cat docs/SLIDES_STYLE.md`

## Current output folders
!`ls output/`

## Workflow

Ask for:
1. Slug (e.g. `gas-peakers`)
2. Month/year of the update (e.g. "May 2026")
3. What changed in the data (optional — describe new highs/lows/trends, or leave blank to infer from the post)

---

### Step 1 — Updated LinkedIn post

Read `src/<slug>.md` for current analysis highlights (prose sections only, skip JS blocks).

Read `output/<slug>/linkedin.md` (original post) and any `output/<slug>/linkedin-update-*.md` files to understand what has already been communicated — avoid repeating the same framing.

Write an updated LinkedIn post that:
- Opens with a "data update" framing, not a new series opener
  (e.g. "Updated #InfraEnergyData data for [Month Year]: ...")
- References the original post: "Building on the [topic] analysis..."
- Highlights what changed vs. prior data: new highs/lows, trend shifts, notable months
- Includes a closing question specific to the new data development
- Follows all LINKEDIN_STYLE.md rules: 200-250 words, no URLs in body, `Link in the first comment 👇`

Save to: `output/<slug>/linkedin-update-<mon><year>.md`
(e.g. `output/gas-peakers/linkedin-update-may2026.md`)

---

### Step 2 — Updated slides

Re-render charts with the latest data:
```bash
npm run generate-assets <slug>
```

Read `output/<slug>/slides.md` as a template for structure and ordering.

Rewrite headings where the new data changes the key claim (apply SLIDES_STYLE.md heading rules: ≤ 8 words, active-voice verb phrase).

Save to: `output/<slug>/slides-update.md`

Assemble PDF — pass the update source file as the second positional argument:
```bash
node .claude/skills/make-slides/scripts/render-slides.mjs <slug> slides-update.md
```
The PDF is written to `output/<slug>/slides-update.pdf` (derived from the md filename automatically).

---

## Confirm outputs

- `output/<slug>/linkedin-update-<mon><year>.md`
- `output/<slug>/slides-update.md`
- `output/<slug>/slides-update.pdf`
