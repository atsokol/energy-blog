# Chart conventions reference

Derived from all polished posts in `src/`. Follow these rules exactly when drafting or editing any chart in this blog.

---

## Required properties on every chart

Every `Plot.plot({...})` must include:

| Property | Rule |
|---|---|
| `title` | Always present. Pattern: `"Metric in Country"` or `"Metric: UA vs. EU Peers"` |
| `subtitle` | Methodology note: units, aggregation, smoothing window. Use template literals when values are reactive: `` `Daily top-${storageDuration} spreads, ${windowSize}-day MA` `` |
| `caption` | Data attribution. E.g. `"Sources: ENTSO-E, Market Operator JSC"` |
| `width` | Always `Math.min(width, 800)` — responsive but capped at 800 px |
| `height` | `300` standard; `280–320` acceptable; `400` for tall faceted / heatmap charts; `220` for compact heatmaps |
| `marginLeft` | `50` standard; `60` when y-axis label is wider (UAH values, ↑↓ labels); `90` for horizontal bar charts with country names |
| `marginRight` | `30` standard; `50–80` when right-side labels or legends are outside the plot area; `100` for inline text annotations beyond the right axis |

---

## Axes

### Y-axis
- Always `grid: true` on the y-axis.
- `label` with units: `"EUR / MWh"`, `"MWh / hour / day"`, `"UAH / MWh"`, `"hours / week"`.
- Use arrow notation for diverging axes: `"↑ premium\n↓ discount"`.
- Percentage axes: `tickFormat: d3.format(".0%")` — never raw decimals.
- Use `nice: true` to avoid clipped extremes.

### X-axis for time series
- `label: null` — date is self-evident on a time series.
- `line: true` to draw a baseline on the axis.

### X-axis for hour-of-day
- `label: "hour of day"`.
- `domain: [0, 24]` (or `d3.range(0, 24)` for cell/heatmap).
- `ticks: 24` for detailed hourly; `ticks: [0, 6, 12, 18, 23]` for dispatch/week facet charts.
- `line: true`.

### X-axis for month-of-year (seasonal)
```js
x: {
  ticks: [1, 4, 7, 10],
  tickFormat: d => d3.utcFormat("%b")(new Date(2000, d)),
  label: "month of year"
}
```

### Facet axes (`fx`, `fy`)
- `fx: {label: null}` — facet key is self-explanatory from context.
- `fx: {label: null, fontWeight: "bold"}` for country-name facets.
- `fx: {label: null, padding: 0.15, tickFormat: d => d.toLocaleDateString("en-US", {weekday: "short", day: "numeric", timeZone: "UTC"})}` for day-of-week week-view facets.
- `fy: {label: null}` for tech-faceted rows.

---

## Responsive x-axis ticks (time series)

**Always adapt tick density to screen width.** On narrow screens (`width < 500`) show only yearly ticks; on wider screens show monthly ticks with a biaxial year/month format.

```js
x: {
  line: true,
  label: null,
  ticks: width < 500 ? d3.utcYear.every(1) : d3.utcMonth.every(3),
  tickFormat: width < 500
    ? d3.utcFormat("%Y")
    : (() => {
        const seen = new Set()
        return d => {
          const y = d.getUTCFullYear(), m = d.getUTCMonth()
          if (m === 0 || !seen.has(y)) { seen.add(y); return d3.utcFormat("%b\n%Y")(d) }
          return d3.utcFormat("%b")(d)
        }
      })(),
}
```
This pattern is used in `gas-peakers.md` for every multi-year weekly time series. Apply it to any series that spans >12 months.

---

## Responsive display modes

When a chart would be unreadable on a narrow screen (e.g. a multi-day faceted week view), collapse to a simpler single-panel mode:

```js
const MIN_FACET_WIDTH = 600
const dispatchViewMode = width < MIN_FACET_WIDTH
  ? "Day"
  : view(Inputs.radio(["Day", "Week"], {value: "Week", label: "View"}))
```

Then branch on `dispatchViewMode` at render time. On narrow screens, suppress the `Inputs.radio` entirely by computing the value directly — this avoids rendering a control the user can't meaningfully use.

---

## Conditionally hiding annotations on narrow screens

Dense text labels inside heatmaps or cell charts should be suppressed below a width threshold:

```js
marks: [
  Plot.cell(data, { x: "hour", y: "year", fill: "pct" }),
  ...(width > 400 ? [Plot.text(data, { x: "hour", y: "year", text: d => d3.format(".0%")(d.pct), fontSize: 9 })] : []),
]
```

---

## Marks reference

### Raw data scatter
```js
Plot.dot(data, {x: "date", y: "value", r: 2, strokeOpacity: 0.3, tip: true})
```
- `r: 2` — standard small dot for daily/monthly raw points.
- `strokeOpacity: 0.2–0.4` — de-emphasise individual points; trend lines read above them.
- Always pair with a trend line or moving-average line for the same series.

### Trend / smoothed lines
```js
Plot.lineY(smooth, {x: "date", y: "value", strokeWidth: 2, curve: "catmull-rom"})
```
- `curve: "catmull-rom"` — standard for smoothed/trend lines and hourly profile shapes.
- `curve: "step-after"` — for block-discrete hourly electricity prices (DAM price shown as a step function).

### Ukraine emphasis
Always make Ukraine visually heavier than peer EU countries:
```js
strokeWidth: d => d.country === "UA" ? 2.5 : 1.5
strokeOpacity: d => d.country === "UA" ? 1 : 0.6   // for bar/area opacity
fillOpacity:   d => d.Country === "Ukraine" ? 1 : 0.6
```

### Area / band fills
```js
Plot.areaY(data, {x: "date", y1: "p10", y2: "p90", fill: "#bae4bc", fillOpacity: 0.4, curve: "catmull-rom"})
```
Use `"#bae4bc"` at `fillOpacity: 0.4` for uncertainty bands, P10–P90 ranges, and dispatch-profitable shading.

### Dispatch profitability shading
```js
Plot.rect(
  data.filter(d => d.hour < 24 && d.price > d.break_even),
  {x1: "hour", x2: d => d.hour + 1, y1: "break_even", y2: "price", fill: "#bae4bc", fillOpacity: 0.6}
)
```

### rectY for weekly bar-like data
When data is keyed by week start date and you want bar-width equal to one week:
```js
Plot.rectY(data, {
  x1: "date",
  x2: d => d3.utcMonday.offset(d.date, 1),
  y: "value",
  fill: d => d.value > 0,   // or a diverging color scale
  tip: true,
})
```

### Reference lines
```js
Plot.ruleY([0], {stroke: "#333"})          // zero baseline (strong)
Plot.ruleY([0], {stroke: "#aaa", strokeDasharray: "4,4"})  // soft zero reference
Plot.ruleY([1], {strokeDasharray: "2,2"})  // 100% baselines for capture factor charts
Plot.ruleY([dam_bottom_avg], {stroke: "red",   strokeDasharray: "4,4"})
Plot.ruleY([dam_top_avg],    {stroke: "green", strokeDasharray: "4,4"})
```

### Inline reference lines from data (reactive)
```js
Plot.ruleY(beData, {y: "be_engine_mkt", stroke: "steelblue", strokeDasharray: "4,4", strokeWidth: 1.5})
```
Use when the reference level itself changes per facet or per selected date.

### Arrows and text annotations
```js
Plot.arrow([{x1: 12, y1: 1.6, x2: 14, y2: 1.25}], {
  x1: "x1", y1: "y1", x2: "x2", y2: "y2",
  stroke: "grey", strokeWidth: 1.5, bend: 20,
})
Plot.text([{x: 12, y: 1.6, label: "flat two-tier pricing in 2022"}], {
  x: "x", y: "y", text: "label", dy: -10, fontSize: 14, fill: "grey",
})
```
- Annotation color is always `"grey"`.
- `fontSize: 14` for chart callouts.
- `bend: 20` (or `-20`) for curved arrows.

### Inline right-edge labels (replaces legend for single-series or annotated reference lines)
```js
Plot.text(
  [{y: ref.price_cap, label: "max price cap", color: "orange"},
   {y: ref.be_engine_mkt, label: "break-even price", color: "steelblue"}],
  {x: 23, y: "y", text: "label", fill: "color",
   textAnchor: "start", dx: 8, fontSize: 10, clip: false}
)
```
Set `marginRight: 100` when using this pattern.

### Heatmap / cell
```js
Plot.cell(data, {
  x: "hour", y: "year",
  fill: "pct_profitable",
  inset: 0.5,
  fillOpacity: 0.8,
})
```
- `color: {scheme: "RdYlGn", domain: [0, 1], type: "linear", legend: true, tickFormat: d3.format(".0%")}` for 0–100% profitability.
- `color: {scheme: "RdYlGn", reverse: true}` for discount/premium (green = discount = good).
- Cell text labels: `fill: d => d.pct < 0.25 || d.pct > 0.8 ? "white" : "#333"` — switch to white on dark backgrounds.

### Bar charts (stacked)
```js
// Vertical bars
Plot.barY(data, Plot.stackY({x: "year", y: "value", fill: "category", tip: true}))

// Horizontal bars (cross-country comparison)
Plot.barX(data, Plot.stackX({x: "value", y: "Country", fill: "category",
  fillOpacity: d => d.Country === "Ukraine" ? 1 : 0.6,
  tip: {format: {x: d3.format(".1%"), fill: d => d}}
}))
```
Add `Plot.ruleY([0])` at the bottom of bar chart marks. Add `Plot.text` labels above bars for absolute totals.

### Stacked bar text labels
```js
// Above vertical bars
Plot.text(totals, {x: "year", y: "total", text: d => d3.format(".0%")(d.total), dy: -8, textAnchor: "middle", fill: "black", fontSize: 11})

// After horizontal bars
Plot.text(totals, {x: "total", y: "Country", text: d => `${d3.format(".0f")(d.total / 1000)}k`, textAnchor: "start", dx: 4, fill: "black", fontSize: 11})
```

### Plot.link for bidirectional arrows (TB4 illustration)
```js
Plot.link([{x: 12, y1: bottom_avg, y2: top_avg}], {
  x: 12, y1: "y1", y2: "y2",
  stroke: "gray", strokeWidth: 1.5,
  markerStart: "arrow-reverse", markerEnd: "arrow",
})
```

---

## Tooltips

- `tip: true` on primary data marks (dots, lines) for simple hover.
- Custom tip format:
  ```js
  tip: {format: {x: d => d3.utcFormat("%b %Y")(d), y: d3.format(".1f"), fill: false, strokeWidth: false}}
  ```
- Suppress auto-inferred channels that add noise: `stroke: false`, `strokeWidth: false`, `z: false`.
- Use `channels` to add a derived readable label to the tooltip:
  ```js
  channels: {country: {value: d => countries.get(d.country), label: "country"}}
  tip: {format: {stroke: false, country: true}}
  ```

---

## Color palette

### Country colors — always import, never hardcode inline

```js
import {countries, colorDomain, colorRange} from "./components/countries.js"
```

Apply to a chart:
```js
color: {legend: true, domain: colorDomain, range: colorRange}
```

Use `countries.get(d.country)` for legend labels and stroke values — never raw ISO codes.

| Country | Hex |
|---|---|
| Ukraine (UA) | `#f59e0b` |
| Hungary (HU) | `#e15759` |
| Poland (PL) | `#4e79a7` |
| Romania (RO) | `#76b7b2` |
| Slovakia (SK) | `#59a14f` |

### Technology / fuel colors

| Use | Value |
|---|---|
| Solar | `#f59e0b` |
| Wind | `#3b82f6` |
| BEV | `#59A14F` |
| PHEV | `steelblue` |
| ICE | `#F28E2B` |
| Gas / single-series UA lines | `#f59e0b` |
| Price / electricity lines | `steelblue` |
| Break-even / reference lines | `steelblue` (dashed) |
| Max price cap lines | `orange` (dashed) |
| Upward regulation / profitable | `green` |
| Downward regulation / loss | `red` |
| Area fills / P10–P90 bands | `"#bae4bc"` at `fillOpacity: 0.4` |
| Annotations (arrows, text) | `"grey"` |
| Zero baseline (strong) | `"#333"` |
| Zero reference (soft) | `"#aaa"` dashed |

### Diverging / sequential scales

```js
color: {scheme: "RdYlGn", domain: [0, 1], type: "linear"}   // profitability heatmap
color: {scheme: "RdYlGn", reverse: true}                      // discount = green (good)
color: {range: d3.schemeYlGnBu[5], type: "ordinal"}           // sequential ordinal (e.g. year ladder)
color: {type: "ordinal", scheme: "Observable10"}               // generic multi-category ordinal
```

---

## Interactive controls

Place each `Inputs.*` cell **immediately before** the chart it controls, never after. One control per `js` block.

```js
// Date picker
const selectedDate = view(Inputs.date({label: "Select date", value: lastDayPrevMonth}))

// Country select with full name format
const selectedCountry = view(Inputs.select(
  ["UA","HU","PL","RO","SK"],
  {label: "Select country", value: "UA", format: x => countries.get(x)}
))

// Moving average window
const windowSize = view(Inputs.range([30, 90], {value: 60, step: 30, label: "Select moving average window (days)"}))

// Year checkbox (multi-select)
const selectYear = view(Inputs.checkbox(["2022","2023","2024","2025"], {label: "Select years", value: ["2024","2025"]}))

// Storage duration / integer range
const storageDuration = view(Inputs.range([2, 8], {label: "Storage duration, hours", step: 2, value: 4}))

// Radio button
const fuelType = view(Inputs.radio(["BEV", "PHEV", "Both"], {value: "Both", label: "Show"}))

// View mode (suppress on narrow screens)
const viewMode = width < 600
  ? "Day"
  : view(Inputs.radio(["Day", "Week"], {value: "Week", label: "View"}))
```

Labels are short noun phrases. Defaults show the most recent or most illustrative data slice. Smoothing bandwidth controls (`Inputs.range`) live in the **Calculations annex**, not the main narrative.

---

## Two-chart side-by-side layout

When two related charts share the same width and should stack vertically as a pair, render them inside an IIFE and return an `html` template:

```js
(() => {
  const chart1 = Plot.plot({ title: "...", width: Math.min(width, 800), ... })
  const chart2 = Plot.plot({ title: "...", width: Math.min(width, 800), ... })
  return html`${chart2}${chart1}`
})()
```

Use only when two charts are tightly coupled in prose and share no reactive state that would be cleaner as separate cells.

---

## Shared chart options with spreading

When a chart branches on a view mode (Day vs. Week), extract shared config and spread it:

```js
const commonOpts = {
  title: "...",
  caption: "...",
  marginLeft: 60,
  marginRight: 100,
  width: Math.min(width, 800),
  x: {label: "hour", domain: d3.range(0, 24), ticks: [0, 6, 12, 18, 23]},
  y: {label: "UAH / MWh", domain: [0, 16500], grid: true},
}

dispatchViewMode === "Day"
  ? display(Plot.plot({...commonOpts, subtitle: "...", height: 320, marks: [...]}))
  : display(Plot.plot({...commonOpts, subtitle: "...", height: 320, fx: {...}, marks: [...]}))
```

Use `display(...)` (not a bare expression) inside an `{}` block when the plot is conditionally rendered.

---

## Smoothing patterns

All regression/LOESS smoothing uses `d3-regression`:

```js
import * as d3reg from "npm:d3-regression"

const regGen = d3reg.regressionLoess()
  .x(d => d.date)   // or d => d.month for seasonal
  .y(d => d.value)
  .bandwidth(bandwidth)   // controlled by annex Inputs.range

const smooth = Array.from(
  d3.group(data, d => d.groupKey),
  ([key, rows]) => {
    rows.sort((a, b) => d3.ascending(a.x, b.x))
    return regGen(rows).map(([x, y]) => ({date: x, value: y, groupKey: key}))
  }
).flat()
```

For multi-dimensional groupings (country × tech × year), use nested `Array.from` with `.flat(N)`.

Moving averages (simpler, no library) for weekly data:
```js
const ma = rows.map((d, i) => {
  const window = rows.slice(Math.max(0, i - windowSize + 1), i + 1)
  return {...d, ma: d3.mean(window, w => w.value)}
})
```

---

## Common chart types by use case

| Use case | Chart type | Key marks |
|---|---|---|
| Time-series trend with raw scatter | line + dot | `Plot.lineY` + `Plot.dot` (r:2, opacity:0.3) |
| Hourly profile (hour of day) | line | `Plot.lineY`, `curve: "catmull-rom"`, `fx` by year or country |
| Hourly DAM price (single day) | step line + area shading | `Plot.lineY` (`step-after`) + `Plot.rect` for profitable hours |
| DAM price dispatch week | step line + area, faceted by day | same marks + `fx: "date"` |
| Multi-country comparison | multi-line with country color scale | `stroke: d => countries.get(d.country)`, `color: {domain: colorDomain, range: colorRange}` |
| Uncertainty band | area + line | `Plot.areaY` (fill `#bae4bc`) + `Plot.lineY` (median) |
| Year-on-year comparison | multi-line by year | `stroke: "year"`, `color: {type: "ordinal", scheme: "Observable10"}` |
| Weekly bar with diverging colour | rectY | `Plot.rectY`, `x1/x2` = week boundaries, `fill: d => d.value > 0` + RdYlGn scheme |
| Hour × year profitability | heatmap | `Plot.cell`, `fill: "pct"`, RdYlGn, inline `%` text |
| Annual stacked bar | barY + stackY | `Plot.barY(data, Plot.stackY({...}))` + `Plot.text` for totals |
| Country ranking bar | barX + stackX | `Plot.barX(data, Plot.stackX({...}))`, `y: "Country"`, horizontal |
| Treemap (brand breakdown) | Treemap component | `import {Treemap} from "./components/treemap.js"` |
| Arbitrage illustration | rect background + ruleY + lineY + text | see energy-storage.md TB4 chart |
| Seasonal patterns | dot + line, fx by country, fy by tech | faceted scatter with loess smooth |

---

## Don'ts

- Never hardcode country hex colors inline — always use `countryColors` from `countries.js`.
- Never use `label: "Date"` or `label: "Value"` — always use the specific unit.
- Never omit `title` or `caption`.
- Never show raw ISO country codes in legends — always `countries.get(d.country)`.
- Never use `tickFormat: d3.format(".2f")` on a percentage axis — use `.0%`.
- Never use a flat constant `ticks: 12` on a multi-year time series — use responsive tick logic.
- Don't put smoothing bandwidth controls in the main narrative — they go in the Calculations annex.
- Don't use `require()` — always `import * as pkg from "npm:pkg@version"`.
