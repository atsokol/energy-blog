---
title: Ukraine's cross-border electricity trade
---

# Ukraine's cross-border electricity trade

Ukraine's electricity grid synchronised with ENTSO-E in March 2022, connecting it physically to its western neighbours for the first time. Since then, cross-border trade has grown alongside Ukraine's need for external supply under wartime conditions. The data reveal a market that operates broadly as intended at the aggregate level — but whose border-by-border mechanics are shaped as much by network physics as by commercial incentives.

## Cross-border flows

Monthly **net flows** — exports minus imports — show Ukraine's overall position with each neighbouring system. Positive values indicate net electricity exported from Ukraine; negative values indicate net imports into Ukraine.

```js
const startDate = view(Inputs.date({label: "Start date", value: "2024-01-01"}))
```

```js
Plot.plot({
  title: "Monthly net cross-border flow by country — physical",
  subtitle: "GWh, positive = net export from Ukraine (physical flows)",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 320,
  x: {
    label: null,
    line: true,
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
  },
  y: {domain: netYDomain, grid: true, label: "GWh"},
  color: {legend: true, domain: [...borderLabels.keys()], range: [...borderColors.values()]},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.barY(
      monthly_net.filter(d => d.month >= new Date(startDate)),
      Plot.stackY({
        x: "month",
        y: "net_gwh",
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
  title: "Monthly net cross-border flow by country — scheduled",
  subtitle: "GWh, positive = net export from Ukraine (commercial schedules)",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 320,
  x: {
    label: null,
    line: true,
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
  },
  y: {domain: netYDomain, grid: true, label: "GWh"},
  color: {legend: true, domain: [...borderLabels.keys()], range: [...borderColors.values()]},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.barY(
      monthly_net_sched.filter(d => d.month >= new Date(startDate)),
      Plot.stackY({
        x: "month",
        y: "net_gwh",
        fill: "country",
        interval: d3.utcMonth,
        tip: {format: {x: d3.utcFormat("%b %Y"), fill: false, y: d => d3.format(".1f")(d)}},
      })
    ),
  ],
})
```

Ukraine has been a consistent net electricity importer since synchronisation, with commercial flows predominantly pointing inward. Slovakia and Hungary have been the largest net suppliers, reflecting their geographic position and interconnector capacity. Romania stands out as a border where flows in both directions are large relative to the net position, pointing to **transit activity** rather than straightforward bilateral trade.

```js
Plot.plot({
  title: "Total net cross-border flow: scheduled vs physical",
  subtitle: "GWh, all borders combined; positive = net export from Ukraine",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 55,
  marginRight: 15,
  width: Math.min(width, 800),
  height: 260,
  x: {
    label: null,
    line: true,
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
  },
  y: {nice: true, grid: true, label: "GWh"},
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.lineY(total_net_comparison.filter(d => d.type === "Scheduled"), {
      x: "month", y: "net",
      stroke: "#4e79a7", strokeWidth: 2, curve: "catmull-rom",
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

## Commercial schedules by border

Cross-border electricity trade is organised through **commercial schedules** — planned flows agreed between traders at day-ahead auctions. The chart below shows monthly scheduled import and export volumes alongside the net position for each border.

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
  y: {nice: true, grid: true, label: "GWh"},
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

The gap between physical and scheduled flows is most pronounced at the Romania and Moldova borders, where physical flows frequently exceed commercial schedules. This is consistent with **loop-flow effects**: electricity routed commercially through one interconnector may physically transit a different border due to the AC network's impedance distribution. Romania therefore functions less as a bilateral export destination and more as a border where redistributed physical flows materialise.

## Intraday and seasonal patterns

The heatmap below shows average net flows — positive for net export from Ukraine — by hour of day and calendar month. Blue cells indicate net export; red indicates net import.

```js
const selectedYear = view(Inputs.select(["2024", "2025", "2026"], {
  label: "Year",
  value: "2025",
}))
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

The intraday pattern reveals a consistent structure: Ukraine tends toward net export in overnight hours, when nuclear and hydro generation runs ahead of low night-time demand, and net import during daytime peak hours. The seasonal baseline shifts with system stress: winter months show heavier net imports during peak hours as demand rises and hydro availability falls; summer shows a more balanced profile with lower overall import volumes.

## Interconnector capacity

Cross-border flows are bounded by the **interconnector capacity** allocated at day-ahead auctions. ENTSO-E publishes both **capacity offered** — the amount made available — and **capacity allocated** — the amount actually cleared at auction. The charts below show allocated capacity for all borders combined, separately for import and export directions.

```js
Plot.plot({
  title: "Interconnector allocated capacity — import into Ukraine",
  subtitle: "MW, average per hour per month; stacked by border country",
  caption: "Source: ENTSO-E Transparency Platform (JAO auction results)",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {
    label: null,
    line: true,
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
  },
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
  title: "Interconnector allocated capacity — export from Ukraine",
  subtitle: "MW, average per hour per month; stacked by border country",
  caption: "Source: ENTSO-E Transparency Platform (JAO auction results)",
  marginLeft: 55,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {
    label: null,
    line: true,
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
  },
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

Allocation rates vary substantially by border and direction. On the Slovakia and Hungary import corridors, allocated capacity has frequently reached or saturated offered capacity, confirming that the interconnector — not commercial demand — is the binding constraint in these directions. On the Poland corridor, capacity utilisation has been lower and more variable, reflecting smaller interconnector ratings and less persistent price differentials.

## Interconnector capacity auction prices

When capacity is scarce and fully allocated, bidders drive prices up to the point where the interconnector's marginal value matches the price spread between the two markets. The **weighted average weekly auction price** — clearing price weighted by allocated capacity — is the market's revealed estimate of that scarcity value.

```js
Plot.plot({
  title: "Weighted average weekly capacity auction prices",
  subtitle: "€/MWh weighted by allocated capacity; gaps = weeks with zero allocation",
  caption: "Source: ENTSO-E Transparency Platform (JAO auction results)",
  marginLeft: 50,
  marginRight: 15,
  width: Math.min(width, 900),
  height: 320,
  x: {label: null, line: true, ticks: d3.utcYear, tickFormat: d3.utcFormat("%Y")},
  y: {nice: true, grid: true, label: "€/MWh"},
  fx: {domain: ["HU", "PL", "RO", "SK"], label: null, tickFormat: d => borderLabels.get(d)},
  color: {
    legend: true,
    domain: ["Import", "Export"],
    range: ["steelblue", "firebrick"],
  },
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.lineY(weekly_prices_flat, {
      fx: "country",
      x: "week",
      y: "weighted_price",
      stroke: "dir",
      strokeWidth: 1.5,
      curve: "monotone-x",
      tip: {
        format: {
          x: d3.utcFormat("%-d %b %Y"),
          stroke: false,
          y: d => d3.format(".1f")(d),
        },
      },
    }),
  ],
})
```

## DAM spread vs auction price

If interconnector auctions are efficient, the clearing price should track the **day-ahead market (DAM) price spread** between Ukraine and the neighbouring country. Market participants bid up to the point where the expected gain from arbitrage equals the cost of capacity access. The chart below shows the net spread: the flow-weighted DAM spread minus the auction price paid for capacity.

```js
const minScheduled = view(Inputs.range([0, 20], {label: "Min weekly scheduled volume (GWh)", step: 0.05, value: 0.05}))
```

```js
Plot.plot({
  title: "Net spread after capacity auction cost",
  subtitle: "€/MWh; flow-weighted DA spread (direction-adjusted) minus auction price paid for capacity",
  caption: "Source: ENTSO-E Transparency Platform",
  marginLeft: 50,
  marginRight: 15,
  width: Math.min(width, 900),
  height: 320,
  x: {label: null, line: true, ticks: d3.utcYear, tickFormat: d3.utcFormat("%Y")},
  y: {nice: true, grid: true, label: "€/MWh"},
  fx: {domain: ["HU", "PL", "RO", "SK"], label: null, tickFormat: d => borderLabels.get(d)},
  color: {
    legend: true,
    domain: ["Import", "Export"],
    range: ["steelblue", "firebrick"],
  },
  marks: [
    Plot.ruleY([0], {stroke: "#ccc"}),
    Plot.lineY(weekly_net_spreads.map(d => ({...d, net_spread: d.total_scheduled_gwh >= minScheduled ? d.net_spread : null})), {
      fx: "country",
      x: "week",
      y: "net_spread",
      stroke: "dir",
      strokeWidth: 1.5,
      curve: "monotone-x",
      tip: {format: {x: d3.utcFormat("%-d %b %Y"), stroke: false, y: d => d3.format(".1f")(d)}},
    }),
  ],
})
```

*This notebook updates automatically based on the most recently available data.*

This analysis uses physical and scheduled flow data from the ENTSO-E Transparency Platform and capacity auction results from JAO. Physical flows are published in hourly intervals and aggregated to monthly totals or averages. **Scheduled flows** represent net agreed cross-border positions and can differ from physical flows due to loop flows, contingency reserves, and intra-hour corrections. The analysis covers Ukraine's interconnections with Hungary, Poland, Romania, Slovakia, and Moldova from January 2023 onward. The capacity charts show day-ahead auction results only; intraday and remedial action capacity allocations are not captured. This analysis does not account for balancing energy exchanges or emergency assistance flows.

---

## Calculations annex

#### Physical and scheduled flows

```js
// Physical cross-border flows (CET timestamps stored as UTC via autoType)
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

#### DAM price data

```js
// EU DAM prices: hour is CET delivery hour stored as nominal UTC
const dam_eu_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/DAM_EU.csv",
  d3.autoType
)
```

```js
// UA DAM prices: hour is EET delivery hour stored as nominal UTC (1h ahead of CET)
const dam_ua_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/DAM_UA.csv",
  d3.autoType
)
```

#### Aggregate and transform data

```js
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
// Shared y-domain ensures physical and scheduled net charts are directly comparable
function stackedBarExtent(data) {
  const byMonth = d3.rollup(data, v => v, d => d.month)
  let lo = 0, hi = 0
  for (const vals of byMonth.values()) {
    lo = Math.min(lo, d3.sum(vals.filter(d => d.net_gwh < 0), d => d.net_gwh))
    hi = Math.max(hi, d3.sum(vals.filter(d => d.net_gwh > 0), d => d.net_gwh))
  }
  return [lo, hi]
}
const physExtent = stackedBarExtent(monthly_net.filter(d => d.month >= new Date(startDate)))
const schedExtent = stackedBarExtent(monthly_net_sched.filter(d => d.month >= new Date(startDate)))
const netYDomain = d3.scaleLinear()
  .domain([Math.min(physExtent[0], schedExtent[0]), Math.max(physExtent[1], schedExtent[1])])
  .nice().domain()
```

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
// EU prices use CET nominal UTC; UA prices use EET nominal UTC (1h ahead), shifted back to align
const dam_lookup = new Map([
  ...dam_eu_raw
    .filter(d => +d.price_eur !== 0)
    .map(d => [`${+new Date(d.hour)}_${String(d.country).toUpperCase()}`, +d.price_eur]),
  ...dam_ua_raw
    .filter(d => +d.price_eur_mwh !== 0)
    .map(d => [`${+new Date(d.hour) - 3_600_000}_uaips`, +d.price_eur_mwh]),
])
```

```js
const spread_records = sched_raw
  .filter(d => d.from_country === "UA" || d.to_country === "UA")
  .flatMap(d => {
    const neighbor = d.from_country === "UA" ? d.to_country : d.from_country
    if (!["HU", "PL", "RO", "SK"].includes(neighbor)) return []
    const scheduled = +d.scheduled_mw
    if (!(scheduled > 0)) return []
    const t = +new Date(d.hour)
    const price_UA = dam_lookup.get(`${t}_uaips`)
    const price_nb = dam_lookup.get(`${t}_${neighbor}`)
    if (price_UA == null || price_nb == null) return []
    const dir = d.from_country === "UA" ? "Export" : "Import"
    const spread = dir === "Import" ? price_UA - price_nb : price_nb - price_UA
    return [{week: d3.utcWeek.floor(new Date(d.hour)), country: neighbor, dir, spread, scheduled}]
  })

const weekly_spreads = d3.flatRollup(
  spread_records,
  v => {
    const w = d3.sum(v, d => d.scheduled)
    return {
      weighted_spread: d3.sum(v, d => d.spread * d.scheduled) / w,
      total_scheduled_gwh: w / 1000,
    }
  },
  d => d.week,
  d => d.country,
  d => d.dir
)
  .map(([week, country, dir, {weighted_spread, total_scheduled_gwh}]) => ({
    week, country, dir, weighted_spread, total_scheduled_gwh,
  }))
  .filter(d => d.week >= new Date(startDate))
  .sort((a, b) => d3.ascending(a.week, b.week))

const auction_price_lookup = new Map(
  weekly_prices_flat.map(d => [`${+d.week}_${d.country}_${d.dir}`, d.weighted_price])
)

const weekly_net_spreads = weekly_spreads
  .map(d => {
    const auction = auction_price_lookup.get(`${+d.week}_${d.country}_${d.dir}`)
    return auction != null ? {...d, net_spread: d.weighted_spread - auction} : null
  })
  .filter(d => d !== null)
```

```js
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
```

#### Import libraries

```js
import {countries, countryColors} from "./components/countries.js"
```

```js
// Extends standard country palette with Moldova (not in countries.js)
const borderLabels = new Map([
  ["HU", countries.get("HU")],
  ["MD", "Moldova"],
  ["PL", countries.get("PL")],
  ["RO", countries.get("RO")],
  ["SK", countries.get("SK")],
])

const borderColors = new Map([
  ["HU", countryColors.get("HU")],
  ["MD", "#b08ece"],
  ["PL", countryColors.get("PL")],
  ["RO", countryColors.get("RO")],
  ["SK", countryColors.get("SK")],
])
```
