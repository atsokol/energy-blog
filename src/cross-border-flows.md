---
title: Ukraine's cross-border electricity trade
---

# Ukraine's cross-border electricity trade

Ukraine's electricity grid synchronised with ENTSO-E in March 2022, connecting it physically to its EU neighbours. Since then, cross-border trade has grown alongside Ukraine's need for external supply under wartime conditions. The data reveal a market that operates broadly as intended at the aggregate level — but whose border-by-border mechanics are shaped as much by network physics as by commercial incentives.

## Annual flow map

Import volumes expanded through 2024, with Hungary emerging as the single largest supplier corridor; Slovakia, Poland, and Romania contributed more evenly as secondary inflow routes. In 2025 the direction of growth reversed: export flows increased markedly, narrowing the net import position and in some months approaching balance. By 2026 the import orientation reasserted itself. Throughout, inflows have arrived from the west and north-west while Ukraine's exports — when they materialise — flow predominantly to Moldova and Poland.

```js
const selectedFlowmapYear = view(Inputs.select(flowmap_years, {
  label: "Year",
  value: flowmap_years.at(-1),
  format: d3.utcFormat("%Y"),
}))
```

```js
flowmapLegend()
```

```js
{
  const w = Math.min(width, 700), h = 460
  const project = d3.geoMercator().fitExtent(
    [[20, 20], [w - 20, h - 20]],
    {type: "FeatureCollection", features: flowmap_country_features}
  )
  const geoPath = d3.geoPath(project)
  const yearFlows = flowmap_annual.filter(d => +d.year === +selectedFlowmapYear)
  const arrowColorFor = f => f.origin === "UA" ? EXPORT_COLOR : IMPORT_COLOR
  const outflowColorFor = loc => loc.id === "UA" ? EXPORT_COLOR : IMPORT_COLOR
  const inflowColorFor  = loc => loc.id === "UA" ? IMPORT_COLOR : EXPORT_COLOR
  const fmt = d3.format(",.1f")
  const chart = flowMap({
    locations: flowmap_locations,
    flows: yearFlows,
    project: c => project(c),
    width: w, height: h,
    backgroundFeatures: flowmap_country_features,
    geoPath,
    arrowColor: arrowColorFor,
    outColor: outflowColorFor,
    inColor:  inflowColorFor,
    showLabels: true,
    labelFontSize: 13,
    maxArrowWidth: 14,
    maxCircleRadius: 30,
    radiusDomain: [0, annualNodeMax],
    widthDomain:  [0, annualFlowMax],
    nodeTooltip: (l, t) => `<b>${l.name}</b><br>out: ${fmt(t.out)} GWh<br>in: ${fmt(t.in)} GWh`,
    flowTooltip: (f, byId) => `<b>${byId.get(f.origin).name} → ${byId.get(f.dest).name}</b><br>${fmt(f.magnitude)} GWh`,
  })
  display(chart.node())
}
```

```js
const startDate = view(Inputs.date({label: "Start date", value: "2024-01-01"}))
```

## Commercial schedules by border

**Commercial schedules** — planned flows agreed between traders at day-ahead auctions — reveal the commercial intent behind the physical flows. On the Slovakia and Hungary corridors, scheduled and physical positions track closely, confirming these are genuine bilateral supply relationships. Moldova and Romania diverge: scheduled volumes are modest, but physical flows regularly exceed them, the signature of **loop-flow effects** where electricity routed commercially through one interconnector physically transits a different border.

```js
const all_sched_flows = d3.flatRollup(
  sched,
  v => ({
    export: d3.sum(v.filter(x => x.dir === "export"), x => x.scheduled) / 1e3,
    import: d3.sum(v.filter(x => x.dir === "import"), x => x.scheduled) / 1e3,
  }),
  d => d.country,
  d => d.month
)
  .flatMap(([country, month, {export: exp, import: imp}]) => [
    {country, month, dir: "Export", gwh_signed: exp},
    {country, month, dir: "Import", gwh_signed: -imp},
  ])
  .filter(d => d.month >= new Date(startDate))
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
const all_sched_net = d3.flatRollup(
  sched,
  v => d3.sum(v, d => d.dir === "export" ? d.scheduled : -d.scheduled) / 1e3,
  d => d.country,
  d => d.month
)
  .map(([country, month, net]) => ({country, month, net}))
  .filter(d => d.month >= new Date(startDate))
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
Plot.plot({
  title: "Monthly scheduled flows by border",
  subtitle: "GWh, export (positive) and import (negative); line: net scheduled flow",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 45,
  marginRight: 10,
  width,
  height: 320,
  fx: {domain: [...borderLabels.keys()], label: null, tickFormat: d => borderLabels.get(d)},
  x: {label: null, ticks: d3.utcYear, tickFormat: d3.utcFormat("%Y")},
  y: {nice: true, grid: false, label: "GWh"},
  color: {legend: true, domain: ["Export", "Import"], range: ["#85c47a", "#e8807f"]},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.barY(all_sched_flows, Plot.stackY({
      fx: "country",
      x: "month",
      y: "gwh_signed",
      fill: "dir",
      interval: d3.utcMonth,
      tip: {format: {x: d3.utcFormat("%b %Y"), fill: false, y: d => d3.format(".1f")(d)}},
    })),
    Plot.lineY(all_sched_net, {
      fx: "country",
      x: "month", y: "net",
      stroke: "black", strokeWidth: 1.5, strokeDasharray: "5,4", curve: "catmull-rom",
      tip: {format: {x: d3.utcFormat("%b %Y"), y: d => `${d3.format(".1f")(d)} GWh`}},
    }),
  ],
})
```

## Monthly flow maps

The seasonal rhythm of import dependency is visible across the monthly sequence: Slovakia and Hungary sustain large inbound flows throughout winter, while Ukraine's own outbound positions to Poland and Moldova thin in the colder months. Summer months show a more balanced profile, with Ukraine occasionally posting net export positions on warmer, lower-demand days.

```js
flowmapLegend()
```

```js
{
  const cols = 3, rows = 4
  const facetStart = new Date(Date.UTC(2025, 5, 1))
  const facetEnd   = new Date(Date.UTC(2026, 5, 1))
  const months = d3.utcMonths(facetStart, facetEnd)
  const gap = 12
  const cellW = Math.min(Math.floor((width - gap * (cols - 1)) / cols), 320), cellH = 220
  const project = d3.geoMercator().fitExtent(
    [[12, 12], [cellW - 12, cellH - 12]],
    {type: "FeatureCollection", features: flowmap_country_features}
  )
  const geoPath = d3.geoPath(project)
  const arrowColorFor = f => f.origin === "UA" ? EXPORT_COLOR : IMPORT_COLOR
  const outflowColorFor = loc => loc.id === "UA" ? EXPORT_COLOR : IMPORT_COLOR
  const inflowColorFor  = loc => loc.id === "UA" ? IMPORT_COLOR : EXPORT_COLOR
  const fmt = d3.format(",.1f")
  const grid = d3.create("div")
    .style("display", "grid")
    .style("grid-template-columns", `repeat(${cols}, ${cellW}px)`)
    .style("grid-template-rows", `repeat(${rows}, auto)`)
    .style("gap", `${gap}px`)
  for (const m of months) {
    const cell = grid.append("div")
    cell.append("div")
      .style("font", "12px sans-serif").style("font-weight", "600")
      .style("padding", "2px 0 2px 4px")
      .text(d3.utcFormat("%b %Y")(m))
    const chart = flowMap({
      locations: flowmap_locations,
      flows: flowmap_monthly.filter(d => +d.month === +m),
      project: c => project(c),
      width: cellW, height: cellH,
      backgroundFeatures: flowmap_country_features,
      geoPath,
      maxArrowWidth: 10, maxCircleRadius: 22,
      arrowColor: arrowColorFor,
      outColor: outflowColorFor,
      inColor:  inflowColorFor,
      radiusDomain: [0, globalNodeMax],
      widthDomain:  [0, globalFlowMax],
      nodeTooltip: (l, t) => `<b>${l.name}</b><br>out: ${fmt(t.out)} GWh<br>in: ${fmt(t.in)} GWh`,
      flowTooltip: (f, byId) => `<b>${byId.get(f.origin).name} → ${byId.get(f.dest).name}</b><br>${fmt(f.magnitude)} GWh`,
    })
    cell.node().appendChild(chart.node())
  }
  display(grid.node())
}
```

## Scheduled vs physical flows

The charts below compare **net** flows (exports minus imports) as scheduled and physical. The shaded area marks the gap between the two: green where physical exceeds scheduled, red where scheduled exceeds physical.

```js
const total_net_comparison = [
  ...d3.flatRollup(
    sched,
    v => d3.sum(v, d => d.dir === "export" ? d.scheduled : -d.scheduled) / 1e3,
    d => d.month
  ).map(([month, net]) => ({month, type: "Scheduled", net})),
  ...d3.flatRollup(
    flows,
    v => d3.sum(v, d => d.dir === "export" ? d.amount : -d.amount) / 1e3,
    d => d.month
  ).map(([month, net]) => ({month, type: "Physical", net})),
].filter(d => d.month >= new Date(startDate))
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
// Paired rows (one per month) for differenceY — derived from total_net_comparison
const net_total_paired = (() => {
  const schedMap = new Map(
    total_net_comparison.filter(d => d.type === "Scheduled").map(d => [+d.month, d.net])
  )
  return total_net_comparison
    .filter(d => d.type === "Physical")
    .map(d => ({month: d.month, sched: schedMap.get(+d.month) ?? 0, phys: d.net}))
    .sort((a, b) => d3.ascending(a.month, b.month))
})()
```


```js
// Net flow by country: export − import, monthly
const net_ctry_sched = d3.flatRollup(
  sched.filter(d => d.month >= new Date(startDate)),
  v => d3.sum(v, d => d.dir === "export" ? d.scheduled : -d.scheduled) / 1e3,
  d => d.country, d => d.month
).map(([country, month, net]) => ({country, month, net}))
  .sort((a, b) => d3.ascending(a.month, b.month))

const net_ctry_phys = d3.flatRollup(
  flows.filter(d => d.month >= new Date(startDate)),
  v => d3.sum(v, d => d.dir === "export" ? d.amount : -d.amount) / 1e3,
  d => d.country, d => d.month
).map(([country, month, net]) => ({country, month, net}))
  .sort((a, b) => d3.ascending(a.month, b.month))

const net_ctry_paired = (() => {
  const schedMap = new Map(net_ctry_sched.map(d => [`${d.country}_${+d.month}`, d.net]))
  return net_ctry_phys.map(d => ({
    country: d.country, month: d.month,
    sched: schedMap.get(`${d.country}_${+d.month}`) ?? 0,
    phys: d.net,
  })).sort((a, b) => d3.ascending(a.month, b.month))
})()
```

```js
Plot.plot({
  title: "Net cross-border flow by country: scheduled vs physical",
  subtitle: "GWh/month; positive = net export from Ukraine; shading = gap between scheduled and physical",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 45,
  marginRight: 10,
  width,
  height: 340,
  fx: {domain: [...borderLabels.keys()], label: null, tickFormat: d => borderLabels.get(d)},
  x: {label: null, ticks: d3.utcYear, tickFormat: d3.utcFormat("%Y")},
  y: {nice: true, grid: false, label: "GWh"},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.differenceY(net_ctry_paired, {
      fx: "country", x: "month", y1: "sched", y2: "phys",
      positiveFill: EXPORT_COLOR, negativeFill: IMPORT_COLOR, fillOpacity: 0.35,
      curve: "monotone-x",
    }),
    Plot.lineY(net_ctry_sched, {
      fx: "country", x: "month", y: "net",
      stroke: "#4e79a7", strokeWidth: 1.5, curve: "monotone-x",
      tip: {format: {x: d3.utcFormat("%b %Y"), y: d => `${d3.format(".1f")(d)} GWh (scheduled)`}},
    }),
    Plot.lineY(net_ctry_phys, {
      fx: "country", x: "month", y: "net",
      stroke: "#f28e2b", strokeWidth: 1.5, strokeDasharray: "5,4", curve: "monotone-x",
      tip: {format: {x: d3.utcFormat("%b %Y"), y: d => `${d3.format(".1f")(d)} GWh (physical)`}},
    }),
  ],
})
```

```js
Plot.plot({
  title: "Total net cross-border flow: scheduled vs physical",
  subtitle: "GWh/month",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 200,
  x: {label: null, ticks: d3.utcMonth.every(3), tickFormat: d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)},
  y: {nice: true, grid: false, label: "GWh"},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.differenceY(net_total_paired, {
      x: "month", y1: "sched", y2: "phys",
      positiveFill: EXPORT_COLOR, negativeFill: IMPORT_COLOR, fillOpacity: 0.35,
      curve: "catmull-rom",
    }),
    Plot.lineY(total_net_comparison.filter(d => d.type === "Scheduled"), {
      x: "month", y: "net",
      stroke: "#4e79a7", strokeWidth: 1.5, curve: "catmull-rom",
      tip: {format: {x: d3.utcFormat("%b %Y"), y: d => `${d3.format(".1f")(d)} GWh (scheduled)`}},
    }),
    Plot.lineY(total_net_comparison.filter(d => d.type === "Physical"), {
      x: "month", y: "net",
     stroke: "#f28e2b", strokeWidth: 2, strokeDasharray: "5,4", curve: "catmull-rom",
      tip: {format: {x: d3.utcFormat("%b %Y"), y: d => `${d3.format(".1f")(d)} GWh (physical)`}},
    }),
  ],
})
```

The gap between physical and scheduled flows is most pronounced at the Romania and Moldova borders, where physical flows frequently exceed commercial schedules. This is consistent with loop-flow effects: electricity routed commercially through one interconnector may physically transit a different border due to the AC network's impedance distribution. Romania therefore functions less as a bilateral export destination and more as a border where redistributed physical flows materialise.

## Intraday and seasonal patterns

Ukraine's generation mix — dominated by nuclear baseload and run-of-river hydro — produces a predictable intraday signature in cross-border flows. Overnight, when domestic demand falls below the minimum output of inflexible nuclear units, Ukraine becomes a net exporter. Midday and evening peaks reverse that position: demand rises faster than dispatchable capacity can respond, pulling in imports. This structural pattern persists across the year but is modulated by season.

```js
const selectedYear = view(Inputs.select(["2024", "2025", "2026"], {
  label: "Year",
  value: "2025",
}))
```

```js
const heatmap_data = d3.flatRollup(
  flows.filter(d => d.year === selectedYear),
  v => d3.mean(v, d => d.dir === "export" ? d.amount : -d.amount),
  d => d.hour_of_day,
  d => d.month.getUTCMonth()
)
  .map(([h, m, avg_net]) => ({hour_of_day: h, month_name: MONTH_NAMES[m], month_idx: m, avg_net}))
  .filter(d => !isNaN(d.avg_net))

const hmMax = d3.max(heatmap_data, d => Math.abs(d.avg_net)) ?? 1
```

```js
Plot.plot({
  title: `Average net cross-border flow by hour and month, ${selectedYear}`,
  subtitle: "MW, all borders combined; blue = net export from Ukraine, red = net import",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 40,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {label: "Hour of day", domain: d3.range(0, 24)},
  y: {label: null, domain: MONTH_NAMES, reverse: true},
  color: {scheme: "RdBu", domain: [-hmMax, hmMax], label: "MW (avg net)", legend: true},
  marks: [
    Plot.cell(heatmap_data, {
      x: "hour_of_day",
      y: "month_name",
      fill: "avg_net",
      inset: 0.5,
      tip: {format: {x: d => `Hour ${d}`, fill: d => `${d3.format("+.1f")(d)} MW`}},
    }),
  ],
})
```

Winter months show the deepest peak-hour import pull — up to several hundred MW on average — as heating load compounds the midday demand spike while hydro reservoirs reach their seasonal nadir. Summer narrows that gap: lower overall demand and better hydro availability allow Ukraine to cover more of its own peak, occasionally posting a net export position across most hours of the day.

## Interconnector capacity and auction prices

Cross-border flows are bounded by the **interconnector capacity** allocated at day-ahead auctions. When demand for capacity exceeds what is offered, allocation reaches the ceiling and the interconnector — not commercial appetite — becomes the binding constraint on trade. On the Slovakia and Hungary import corridors, allocated capacity has repeatedly saturated the offered amount, confirming that physical limits, not weak commercial demand, cap Ukraine's import volumes on those borders.

```js
Plot.plot({
  title: "Allocated interconnector capacity — import into Ukraine",
  subtitle: "MW, average per hour per month; stacked by border country",
  caption: "Source: ENTSO-E Transparency Platform (JAO auction results)",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {label: null, ticks: d3.utcMonth.every(3), tickFormat: d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)},
  y: {nice: true, grid: true, label: "MW (avg per hour)"},
  color: {legend: true, domain: [...borderLabels.keys()], range: [...borderColors.values()]},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.barY(
      capacity_all_monthly.filter(d => d.dir === "import"),
      Plot.stackY({
        x: "month",
        y: "avg_allocated",
        fill: "country",
        interval: d3.utcMonth,
        tip: {format: {x: d3.utcFormat("%b %Y"), fill: false, y: d => d3.format(".1f")(d)}},
      })
    ),
  ],
})
```

```js
Plot.plot({
  title: "Allocated interconnector capacity — export from Ukraine",
  subtitle: "MW, average per hour per month; stacked by border country",
  caption: "Source: ENTSO-E Transparency Platform (JAO auction results)",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {label: null, ticks: d3.utcMonth.every(3), tickFormat: d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)},
  y: {nice: true, grid: true, label: "MW (avg per hour)"},
  color: {legend: true, domain: [...borderLabels.keys()], range: [...borderColors.values()]},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.barY(
      capacity_all_monthly.filter(d => d.dir === "export"),
      Plot.stackY({
        x: "month",
        y: "avg_allocated",
        fill: "country",
        interval: d3.utcMonth,
        tip: {format: {x: d3.utcFormat("%b %Y"), fill: false, y: d => d3.format(".1f")(d)}},
      })
    ),
  ],
})
```

Poland's corridor tells a different story: lower and more variable utilisation reflects both a smaller interconnector rating and less persistent price differentials between the two markets. When capacity is scarce and fully allocated, bidders drive prices up to the point where the interconnector's marginal value matches the cross-border price spread. The **weighted average weekly auction price** — clearing price weighted by allocated capacity — is the market's revealed estimate of that scarcity value.

```js
const maWindow = view(Inputs.range([1, 12], {label: "Moving average (weeks)", step: 1, value: 4}))
```

```js
const weekly_prices_flat = d3.flatRollup(
  auction_raw,
  v => {
    const w = d3.sum(v, d => +d.cap_allocated_mw)
    return {
      weighted_price: w > 0 ? d3.sum(v, d => +d.price * +d.cap_allocated_mw) / w : null,
      total_allocated: w,
    }
  },
  d => d3.utcWeek.floor(new Date(d.date)),
  d => (String(d.border).startsWith("UA-") ? "Export" : "Import"),
  d => String(d.border).replace("UA-", "").replace("-UA", "")
)
  .map(([week, dir, country, {weighted_price, total_allocated}]) => ({
    week, dir, country, weighted_price, total_allocated,
  }))
  .filter(d => ["HU", "PL", "RO", "SK"].includes(d.country)
    && d.week >= new Date(startDate))
  .sort((a, b) => d3.ascending(a.week, b.week))
```

```js
const weekly_prices_ma = (() => {
  const result = []
  for (const [country, byDir] of d3.group(weekly_prices_flat, d => d.country, d => d.dir)) {
    for (const [dir, rows] of byDir) {
      const sorted = rows.filter(d => d.weighted_price != null)
        .sort((a, b) => d3.ascending(a.week, b.week))
      for (let i = maWindow - 1; i < sorted.length; i++) {
        result.push({
          ...sorted[i],
          ma_price: d3.mean(sorted.slice(i - maWindow + 1, i + 1), d => d.weighted_price),
        })
      }
    }
  }
  return result
})()
```

```js
Plot.plot({
  title: "Weighted average weekly capacity auction prices",
  subtitle: `€/MWh weighted by allocated capacity; points = weekly values, line = ${maWindow}-week moving average`,
  caption: "Source: ENTSO-E Transparency Platform (JAO auction results)",
  marginLeft: 50,
  marginRight: 15,
  width: Math.min(width, 900),
  height: 320,
  x: {label: null, ticks: d3.utcYear, tickFormat: d3.utcFormat("%Y")},
  y: {nice: true, grid: true, label: "€/MWh"},
  fx: {domain: ["HU", "PL", "RO", "SK"], label: null, tickFormat: d => borderLabels.get(d)},
  color: {
    legend: true,
    domain: ["Import", "Export"],
    range: ["steelblue", "firebrick"],
  },
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.dot(weekly_prices_flat.filter(d => d.weighted_price != null), {
      fx: "country",
      x: "week",
      y: "weighted_price",
      fill: "dir",
      fillOpacity: 0.5,
      r: 2.5,
      tip: {
        format: {
          x: d3.utcFormat("%-d %b %Y"),
          fill: false,
          y: d => d3.format(".1f")(d),
        },
      },
    }),
    Plot.lineY(weekly_prices_ma, {
      fx: "country",
      x: "week",
      y: "ma_price",
      stroke: "dir",
      strokeWidth: 2,
      curve: "monotone-x",
    }),
  ],
})
```

*This notebook updates automatically based on the most recently available data.*

This analysis uses physical and scheduled flow data from the ENTSO-E Transparency Platform and capacity auction results from JAO. Physical flows are published in hourly intervals and aggregated to monthly totals or averages. **Scheduled flows** represent net agreed cross-border positions and can differ from physical flows due to loop flows, contingency reserves, and intra-hour corrections. The analysis covers Ukraine's interconnections with Hungary, Poland, Romania, Slovakia, and Moldova from January 2023 onward. The capacity charts show day-ahead auction results only; intraday and remedial action capacity allocations are not captured. This analysis does not account for balancing energy exchanges or emergency assistance flows.

---

```js
// Calculations annex
```

#### 

```js
// Physical cross-border flows 
const flows_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/transm_phys_EU.csv",
  d3.autoType
)
```

```js
// Scheduled cross-border flows (UTC timestamps)
const sched_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/transm_sched_EU.csv",
  d3.autoType
)
```

```js
// Day-ahead auction capacity results
const auction_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/auction_dam_UA.csv",
  d3.autoType
)
```


```js
// Aggregate and transform data
const flows = flows_raw
  .filter(d => d.from_country === "UA" || d.to_country === "UA")
  .map(d => {
    const dt = new Date(d.hour)
    return {
      month: d3.utcMonth.floor(dt),
      hour_of_day: dt.getUTCHours(),
      year: String(dt.getUTCFullYear()),
      date: d3.utcDay.floor(dt),
      country: d.from_country === "UA" ? d.to_country : d.from_country,
      dir: d.from_country === "UA" ? "export" : "import",
      amount: +d.physical_flow_mw,
    }
  })
  .filter(d => d.month >= new Date("2023-01-01") && !isNaN(d.amount))
```

```js
const sched = sched_raw
  .filter(d => d.from_country === "UA" || d.to_country === "UA")
  .map(d => {
    const dt = new Date(d.hour)
    return {
      month: d3.utcMonth.floor(dt),
      country: d.from_country === "UA" ? d.to_country : d.from_country,
      dir: d.from_country === "UA" ? "export" : "import",
      scheduled: +d.scheduled_mw,
    }
  })
  .filter(d => d.month >= new Date("2023-01-01") && !isNaN(d.scheduled))
```

```js
// Border format: "UA-PL" (export) or "PL-UA" (import)
const auction = auction_raw
  .map(d => {
    const border = String(d.border)
    const dir = border.startsWith("UA-") ? "export" : "import"
    const country = border.replace("UA-", "").replace("-UA", "")
    const dt = new Date(d.date)
    return {
      month: d3.utcMonth.floor(dt),
      year: String(dt.getUTCFullYear()),
      dir,
      country,
      price_cap: +d.price,
      cap_offered: +d.cap_offered_mw,
      cap_allocated: +d.cap_allocated_mw,
    }
  })
  .filter(d => ["HU", "MD", "PL", "RO", "SK"].includes(d.country)
    && d.month >= new Date("2023-01-01")
    && !isNaN(d.cap_offered))
```

```js
const monthly_net = d3.flatRollup(
  flows,
  v => d3.sum(v, d => d.dir === "export" ? d.amount : -d.amount) / 1e3,
  d => d.month,
  d => d.country
)
  .map(([month, country, net_gwh]) => ({month, country, net_gwh}))
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
const monthly_net_sched = d3.flatRollup(
  sched,
  v => d3.sum(v, d => d.dir === "export" ? d.scheduled : -d.scheduled) / 1e3,
  d => d.month,
  d => d.country
)
  .map(([month, country, net_gwh]) => ({month, country, net_gwh}))
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
const capacity_all_monthly = d3.flatRollup(
  auction,
  v => d3.mean(v, d => d.cap_allocated),
  d => d.month,
  d => d.country,
  d => d.dir
)
  .map(([month, country, dir, avg_allocated]) => ({month, country, dir, avg_allocated}))
  .sort((a, b) => d3.ascending(a.month, b.month))
```


```js
// Flow map
import {flowMap} from "./components/d3-flowmap.js"
import {feature} from "npm:topojson-client@3"
```

```js
// Natural Earth attributes Crimea to Russia — re-attach as a Ukraine-styled feature
const _world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json")
const _flowmapCountryIds = new Set(["804", "616", "348", "703", "642", "498"])  // UA, PL, HU, SK, RO, MD
const _all_countries = feature(_world, _world.objects.countries).features
const _russia = _all_countries.find(f => String(f.id) === "643")
const _crimea_point = [34.0, 45.3]
const _crimea_rings = _russia?.geometry?.type === "MultiPolygon"
  ? _russia.geometry.coordinates.find(rings =>
      d3.geoContains({type: "Polygon", coordinates: rings}, _crimea_point))
  : null
const _crimea_feature = _crimea_rings
  ? {type: "Feature", id: "ua-crimea", properties: {name: "Crimea"},
     geometry: {type: "Polygon", coordinates: _crimea_rings}}
  : null
const flowmap_country_features = [
  ..._all_countries.filter(f => _flowmapCountryIds.has(String(f.id))),
  ...(_crimea_feature ? [_crimea_feature] : []),
]
```

```js
// labelDir: compass direction for country label, chosen to avoid overlapping arrows
const flowmap_locations = [
  {id: "UA", lon: 31.0, lat: 49.0, name: "Ukraine",  labelDir: "N"},
  {id: "PL", lon: 19.5, lat: 51.5, name: "Poland",   labelDir: "NW"},
  {id: "SK", lon: 19.5, lat: 48.7, name: "Slovakia", labelDir: "W"},
  {id: "HU", lon: 19.0, lat: 47.2, name: "Hungary",  labelDir: "SW"},
  {id: "RO", lon: 25.0, lat: 45.9, name: "Romania",  labelDir: "SW"},
  {id: "MD", lon: 29.1, lat: 46.9, name: "Moldova",  labelDir: "E"},
]
```

```js
const flowmap_monthly = d3.flatRollup(
  sched,
  v => d3.sum(v, d => d.scheduled) / 1e3,
  d => d.month,
  d => d.country,
  d => d.dir,
)
  .map(([month, country, dir, magnitude]) => ({
    month, country, dir, magnitude,
    origin: dir === "export" ? "UA" : country,
    dest:   dir === "export" ? country : "UA",
  }))
  .filter(d => d.magnitude > 0)
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
// Locked scales so all monthly facets are visually comparable
const {globalNodeMax, globalFlowMax} = (() => {
  let nodeMax = 0, flowMax = 0
  for (const monthFlows of d3.group(flowmap_monthly, d => +d.month).values()) {
    const t = new Map(flowmap_locations.map(l => [l.id, {in: 0, out: 0}]))
    for (const f of monthFlows) {
      t.get(f.origin).out += f.magnitude
      t.get(f.dest).in    += f.magnitude
      flowMax = Math.max(flowMax, f.magnitude)
    }
    for (const v of t.values()) nodeMax = Math.max(nodeMax, v.in, v.out)
  }
  return {globalNodeMax: nodeMax, globalFlowMax: flowMax}
})()
```

```js
const flowmap_annual = d3.flatRollup(
  sched,
  v => d3.sum(v, d => d.scheduled) / 1e3,
  d => d3.utcYear.floor(d.month),
  d => d.country,
  d => d.dir,
)
  .map(([year, country, dir, magnitude]) => ({
    year, country, dir, magnitude,
    origin: dir === "export" ? "UA" : country,
    dest:   dir === "export" ? country : "UA",
  }))
  .filter(d => d.magnitude > 0)
  .sort((a, b) => d3.ascending(a.year, b.year))
```

```js
const flowmap_years = [...new Set(flowmap_annual.map(d => +d.year))]
  .sort((a, b) => a - b)
  .map(t => new Date(t))
```

```js
// Locked scales for the annual map (yearly sums are an order of magnitude larger than monthly)
const {annualNodeMax, annualFlowMax} = (() => {
  let nodeMax = 0, flowMax = 0
  for (const yearFlows of d3.group(flowmap_annual, d => +d.year).values()) {
    const t = new Map(flowmap_locations.map(l => [l.id, {in: 0, out: 0}]))
    for (const f of yearFlows) {
      t.get(f.origin).out += f.magnitude
      t.get(f.dest).in    += f.magnitude
      flowMax = Math.max(flowMax, f.magnitude)
    }
    for (const v of t.values()) nodeMax = Math.max(nodeMax, v.in, v.out)
  }
  return {annualNodeMax: nodeMax, annualFlowMax: flowMax}
})()
```

```js
const EXPORT_COLOR = "#85c47a"
const IMPORT_COLOR = "#e8807f"
const flowmapLegend = () => html`<div style="display: flex; gap: 18px; align-items: center; font: 13px sans-serif; margin: 4px 0 8px;">
  <div style="display: flex; align-items: center; gap: 6px;">
    <span style="display: inline-block; width: 14px; height: 14px; background: ${EXPORT_COLOR}; border-radius: 2px;"></span>
    Export from Ukraine
  </div>
  <div style="display: flex; align-items: center; gap: 6px;">
    <span style="display: inline-block; width: 14px; height: 14px; background: ${IMPORT_COLOR}; border-radius: 2px;"></span>
    Import into Ukraine
  </div>
</div>`
```


```js
// Labels and constants
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
```

```js
const borderLabels = new Map([
  ["HU", "Hungary"],
  ["MD", "Moldova"],
  ["PL", "Poland"],
  ["RO", "Romania"],
  ["SK", "Slovakia"],
])

const borderColors = new Map([
  ["HU", "#e8898a"],
  ["MD", "#b08ece"],
  ["PL", "#7dadc9"],
  ["RO", "#9dceca"],
  ["SK", "#82c47a"],
])
```
