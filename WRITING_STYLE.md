# Writing style guide

Derived from existing polished posts (`energy-storage.md`, `res-price-capture.md`, `ev-market-ua.md`). Use this when converting R/Quarto `.qmd` analysis files into Observable Framework `.md` posts.

---

## Post structure

Every post follows this top-to-bottom layout:

```
---
title: <descriptive title>
---

# <same title>

[Opening paragraph — context and motivation]

[chart]

[Interpretation paragraph → introduces the next chart]

[interactive control(s)]

[chart]

[Interpretation paragraph]

... repeat ...

[Methodological caveat paragraph — limitations and what the analysis does/does not show]

---

## Calculations annex

#### <Subsection heading>
[data loading and computation cells, hidden from casual readers]

#### Import libraries
[import statements]
```

---

## Prose style

**Voice and register**
- Third-person analytical. No "I", "we", or "you". No hedging phrases like "it seems" or "it is worth noting".
- Present tense for describing ongoing phenomena; past tense only for dated historical events.
- Precise but accessible: assume a reader with economics/finance literacy, not necessarily an energy-sector specialist.

**Sentence and paragraph length**
- Opening paragraph: 2–4 sentences. Sets the problem, the context (Ukraine / EU), and the key tension.
- Interpretation paragraphs: 2–5 sentences. Lead with the key takeaway, then add nuance.
- One idea per paragraph. Do not combine interpretation of two different charts.

**Key terms**
- Bold on first use: **day-ahead market (DAM)**, **capture factor**, **TB4**, **balancing market (BM)**, etc.
- Expand acronyms once, then use the short form freely.

**Numbers and comparisons**
- Anchor observations with concrete figures: "EUR 200/MWh/day", "~20% above baseload", "25%".
- Ukraine is always compared against neighbouring EU markets (HU, PL, RO, SK) where relevant.

**Caveats and limitations**
- Each post ends with an explicit methodological note before the `---` separator. State what the analysis measures, what it does not measure, and what additional steps would be needed to translate market signals into project-level outcomes.

**Footer / live-update note**
- Include a one-sentence live-data disclosure where appropriate: *"This notebook updates automatically based on the most recently available data."*

---

## Chart conventions (Observable Plot)

### Required properties on every chart

| Property | Rule |
|---|---|
| `title` | Always present. Pattern: `"Metric in Country/Context"` or `"Metric: Country vs. Peers"` |
| `subtitle` | Methodology note: units, aggregation, smoothing window. E.g. `"Monthly averages and trend"` |
| `caption` | Data attribution. E.g. `"Sources: ENTSO-E, Market Operator JSC"` |
| `width` | `Math.min(width, 800)` — responsive but capped at 800px |
| `height` | `300` (standard); `400` for taller faceted charts |
| `marginLeft` | `50` (standard); `60` when y-axis label is wider |
| `marginRight` | `30` (standard); `50–80` when right-side labels or legend needed |

### Axes

- Y-axis: always `grid: true` + `label` with units in parentheses or slash notation: `"EUR / MWh"`, `"MWh / hour / day"`.
- X-axis for time series: `label: null` (date is self-evident). For hour-of-day: `label: "hour of day"`.
- Percentage axes: `tickFormat: d3.format(".0%")` — never show raw decimals.

### Marks and encodings

- **Raw data points**: `Plot.dot(data, {r: 2, strokeOpacity: 0.3, tip: true})`
- **Trend lines / smoothed**: `Plot.lineY(smooth, {strokeWidth: 2, curve: "catmull-rom"})`
- **Ukraine emphasis**: `strokeWidth: d => d.country == "UA" ? 2.5 : 1.5`
- **Uncertainty bands**: `Plot.areaY(..., {fill: "#bae4bc", fillOpacity: 0.4})`
- **Reference lines**: `Plot.ruleY([1], {strokeDasharray: "2,2"})` for 100% baselines; dashed rules for averages
- **Annotations**: `Plot.arrow` + `Plot.text` with `fill: "grey", fontSize: 14` for chart callouts
- `tip: true` on primary data marks for hover tooltips

### Colors

| Use | Value |
|---|---|
| Primary line / UA highlight | `"steelblue"` |
| Area fills / bands | `"#bae4bc"` at `fillOpacity: 0.4` |
| Solar | `"#f59e0b"` |
| Wind | `"#3b82f6"` |
| BEV | `"steelblue"` |
| PHEV | `"#59A14F"` |
| ICE | `"#4E79A7"` |
| Annotation arrows/text | `"grey"` |
| Upward regulation | `"green"` |
| Downward / cap floor | `"red"` |

- `color: {legend: true}` whenever there are multiple series.
- Country names come from `countries.get(d.country)` (shared `./components/countries.js`), never raw ISO codes in legends.

---

## Interactive controls

- Place each `Inputs.*` cell **immediately before** the chart it controls, never after.
- One control per `js` block.
- Use sensible defaults that show the most recent or most illustrative data slice.
- Labels are short noun phrases: `"Select date"`, `"Storage duration, hours"`, `"Select moving average window (days)"`.

Common patterns:
```js
const selectedCountry = view(Inputs.select(["UA","HU","PL","RO","SK"], {label: "Select country", value: "UA", format: x => countries.get(x)}))
const windowSize = view(Inputs.range([30, 90], {value: 60, step: 30, label: "Select moving average window (days)"}))
const selectYear = view(Inputs.checkbox(["2022","2023","2024","2025"], {label: "Select years", value: ["2024","2025"]}))
```

---

## Calculations annex

- Separated from main content by `---`.
- Heading: `## Calculations annex` (preferred) or `## Annex: calculations`.
- Subsections use `####` (four hashes): `#### Aggregate and transform data`, `#### Electricity price data`, `#### Wind and solar yield data`, `#### Import libraries`.
- Data-loading cells include a comment indicating which folder the file comes from:
  ```js
  // Raw DAM prices — from data_raw/
  // Processed capture factors — from data_output/
  ```
- All library `import` statements go in the last subsection `#### Import libraries`.
- Smoothing bandwidth controls (`Inputs.range`) live in the annex, not in the main narrative.

---

## Converting from R/Quarto `.qmd`

When translating an R analysis into a post:

1. **Keep the analytical structure**, not the R code structure. Reorganise around insights, not around data-pipeline steps.
2. Move all data loading and computation to the **Calculations annex**. The main body should contain only prose + `Plot.plot(...)` display cells.
3. Rewrite R `ggplot2` charts as Observable `Plot.plot(...)` following the chart conventions above.
4. Replace R narrative with prose matching the voice guidelines: no hedging, anchor with numbers, bold key terms on first use.
5. Add interactive controls (`Inputs.*`) for any dimension the reader would naturally want to explore (date range, country, smoothing window, storage duration).
6. End the main content with a methodological caveat paragraph derived from the R analysis's limitations section (or write one if absent).
