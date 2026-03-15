---
title: Economics of gas peakers in Ukraine
---

# Economics of gas peakers in Ukraine

Gas-fired peakers are the primary source of dispatchable generation in Ukraine's power system. After Russian attacks destroyed or occupied roughly two-thirds of Ukraine's pre-war generation capacity, the remaining gas fleet has shifted from a supplementary role to a system-critical one, covering evening demand peaks and absorbing residual load not served by nuclear, hydro, and renewables.

The economics of a gas peaker hinges on the **spark spread**: the margin between the electricity price earned and the cost of gas consumed per MWh of output. When spreads are wide and persistent, investment in new gas capacity is attractive; when price caps constrain electricity revenues below the gas break-even, plants run at a loss.

## Gas prices in Ukraine

Gas prices in Ukraine are determined by three forces acting simultaneously:
 - European wholesale prices set the import parity ceiling: the cost of sourcing gas at the European gas hubs such as the **TTF** and transporting it to the Ukrainian border. 
 - Domestic production, operated primarily by Naftogaz/Ukrgasvydobuvannya, historically kept exchange prices well below import parity. Russian strikes on gas infrastructure since 2024 have reduced domestic output by up to 60%, compressing this structural discount. 
 - Growing demand from gas-fired plants replacing destroyed thermal capacity has added further pressure on prices.

The figure below shows monthly average gas prices on the **Ukrainian Energy Exchange (UEEX)** against the TTF import parity price, which reflects the TTF spot price plus transit cost to the Ukrainian border and injection into the GTS, converted at the prevailing UAH/EUR exchange rate.

```js
const startDateGas = view(Inputs.date({label: "Start date", value: "2023-01-01"}))
```

```js
Plot.plot({
  title: "Gas prices in Ukraine vs TTF import-parity",
  subtitle: "Monthly averages, EUR / MWh thermal",
  caption: "Sources: UEEX, Yahoo Finance (TTF)",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "EUR / MWh_th"},
  color: {legend: true},
  marks: [
    Plot.lineY(gas_monthly_long.filter(d => d.date >= new Date(startDateGas)), {
      x: "date", y: "price_eur",
      stroke: "series",
      strokeWidth: d => d.series === "UEEX (domestic)" ? 2.5 : 1.5,
      strokeDasharray: d => d.series === "TTF spot" ? "4,4" : null,
      curve: "catmull-rom",
      tip: true,
    }),
  ],
})
```

The discount between UEEX and TTF import-parity has historically ranged from 20–75%, reflecting the structural surplus of domestic production over local demand. As the figure below shows, this discount narrowed sharply in 2025 as production fell and generator gas demand rose. By early 2026, UEEX prices have converged to within 10–20% of import-parity on a monthly basis, significantly compressing the fuel-cost advantage that previously underpinned gas generator economics.

```js
Plot.plot({
  title: "UEEX domestic gas discount vs TTF import-parity",
  subtitle: "Monthly average: (UEEX − TTF import-parity) / TTF import-parity",
  caption: "Sources: UEEX, Yahoo Finance (TTF)",
  marginLeft: 60,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "% discount", tickFormat: d3.format(".0%")},
  marks: [
    Plot.ruleY([0], {stroke: "#aaa", strokeDasharray: "4,4"}),
    Plot.line(gas_discount_monthly.filter(d => d.date >= new Date(startDateGas)), {
      x: "date",
      y: "discount_pct",
      stroke: "steelblue",
      interval: "month",
      tip: true,
      curve: "catmull-rom",
    }),
  ],
})
```

Since January 2025, the GTS exit tariff paid by gas buyers quadrupled following NEURC Resolution 2387 — a direct consequence of the loss of Russian transit revenues that previously covered 85% of the gas transmission operator's (GTSOU) costs. Distribution tariffs were raised again in late 2025 and are scheduled to increase further in April 2026. These tariff increases add approximately UAH 2,000–2,400/1,000 m³ to the delivered cost above the UEEX commodity price, raising break-even electricity prices for all gas generators.

## Spark spread: Ukraine vs EU neighbours

The spark spread measures a gas plant's hourly variable profit margin. For EU markets operating under the EU Emissions Trading System, the relevant measure is the **clean spark spread (CSS)**: electricity price minus fuel cost minus carbon cost. For Ukraine, which is not part of the ETS, no carbon cost applies — the spread is simply electricity revenue minus delivered fuel cost.

```js
const sparkWindowSize = view(Inputs.range([4, 12], {value: 8, step: 4, label: "Moving average window (weeks)"}))
```
```js
const startDateSpark = view(Inputs.date({label: "Start date", value: "2023-01-01"}))
```

```js
Plot.plot({
  title: "Weekly spark spread: Ukraine vs EU neighbours",
  subtitle: `EU: clean spark spread (fuel + EUA carbon); UA: simple spread (fuel only, no ETS). ${sparkWindowSize}-week moving average`,
  caption: "Sources: ENTSO-E, Market Operator JSC, Yahoo Finance (TTF, EUA)",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 320,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "EUR / MWh"},
  color: {legend: true},
  marks: [
    Plot.ruleY([0], {stroke: "#aaa", strokeDasharray: "4,4"}),
    Plot.lineY(spark_weekly_ma.filter(d => d.week >= new Date(startDateSpark)), {
      x: "week", y: "ma",
      stroke: d => countries.get(d.country),
      strokeWidth: d => d.country === "UA" ? 2.5 : 1.5,
      tip: true,
    }),
  ],
})
```

EU neighbours (Hungary, Romania, Slovakia) maintained positive clean spark spreads through 2023–2025 as gas prices normalised from their 2022 crisis peaks, with spreads stabilising in the EUR 10–30/MWh range for a 50% efficient combined-cycle reference plant. Ukraine's spread, calculated using TTF import-parity gas costs, showed a more volatile path: deeply negative in 2022–2023 when electricity price caps prevented any gas cost pass-through, recovering sharply through 2024–2025 as caps were raised and electricity prices converged toward European levels. Note that Ukraine's spread under domestic UEEX pricing is materially wider than the TTF-based measure shown here, reflecting the discount of domestic gas below import-parity — a discount that has narrowed since 2025.

## Daily dispatch economics

The figure below shows hourly day-ahead electricity prices for a selected date alongside the gas break-even price for a gas engine CHP plant (46% efficiency — the dominant new-build technology in Ukraine). Two break-even lines are shown: one based on TTF import-parity gas cost (upper bound) and one based on the prevailing UEEX within-day price on that date (base case). Hours where the electricity price exceeds the break-even are shaded green; below it, the plant would generate at a variable loss.

```js
const selectedDatePeaker = view(Inputs.date({label: "Select date", value: lastDayPrevMonth}))
```

```js
Plot.plot({
  title: `Day-ahead electricity prices vs gas break-even — Ukraine`,
  subtitle: new Date(selectedDatePeaker).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}),
  caption: "Sources: Market Operator JSC, UEEX, Yahoo Finance (TTF). Break-even: gas engine CHP, 46% efficiency",
  marginLeft: 60,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 320,
  x: {label: "Hour of Day", domain: [0, 24], ticks: 24},
  y: {label: "UAH / MWh", domain: [0, 16000], grid: true},
  marks: [
    Plot.rect(
      hourly_ua_for_date.filter(d => d.hour < 24 && d.price_uah > d.be_engine_mkt),
      {x1: "hour", x2: d => d.hour + 1, y1: "be_engine_mkt", y2: "price_uah", fill: "#bae4bc", fillOpacity: 0.6}
    ),
    Plot.lineY(hourly_ua_for_date, {
      x: "hour", y: "price_uah",
      stroke: "steelblue", strokeWidth: 2, curve: "step-after", tip: true,
    }),
    Plot.ruleY([be_engine_mkt_day], {stroke: "steelblue", strokeDasharray: "4,4", strokeWidth: 1.5}),
    Plot.text([
      {y: be_engine_mkt_day, label: "Break-even (UEEX)"},
    ], {
      x: 18, y: "y", text: "label",
      textAnchor: "start", dx: 4, dy: -6,
      fill: d => d.label.includes("UEEX") ? "steelblue" : "#e15759",
      fontSize: 12,
    }),
  ],
})
```

The price cap structure — currently set at UAH 5,600/MWh in off-peak hours and UAH 15,000/MWh during the evening peak (17:00–23:00) — is clearly visible as a ceiling on hourly prices. During the evening peak, when gas generators are most needed, prices frequently hit the UAH 15,000/MWh cap. The break-even for a gas engine at UEEX domestic pricing sits in the UAH 4,800–5,500/MWh range; under TTF import-parity, it rises to UAH 6,500–7,500/MWh. This means that under current cap levels, gas engines running on domestically-priced gas are profitable in most off-peak hours as well, while plants buying at TTF parity are predominantly profitable only during the capped evening peak.

## Profitability profile: hours and margins

The heatmap below shows, for each hour of day and each year, the share of hours in which a gas engine CHP plant (46% efficiency, UEEX pricing) would have earned a positive gross margin on the day-ahead market.

```js
Plot.plot({
  title: "Profitable hours for gas engine CHP — Ukraine",
  subtitle: "% of hours with positive gross margin by hour of day and year (UEEX gas pricing, 46% efficiency)",
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 220,
  x: {label: "hour of day", domain: d3.range(0, 24)},
  y: {label: null, reverse: true},
  color: {scheme: "RdYlGn", domain: [0, 1], type: "linear", legend: true, tickFormat: d3.format(".0%")},
  marks: [
    Plot.cell(profitable_heatmap, {
      x: "hour", y: "year",
      fill: "pct_profitable",
      inset: 0.5, 
      fillOpacity: 0.8,
    }),
    Plot.text(profitable_heatmap, {
      x: "hour", y: "year",
      text: d => d3.format(".0%")(d.pct_profitable),
      fill: d => d.pct_profitable < 0.25 || d.pct_profitable > 0.8 ? "white" : "#333",
      fontSize: 9,
    }),
  ],
})
```

The heatmap reveals a structural shift in profitability. In 2022–2023, cap-constrained prices kept gas engines below break-even for most of the day. By 2024–2025, the evening peak window (hours 17–22) reached near-100% profitability, and profitable hours expanded into the morning ramp (hours 7–10). The mid-day window (hours 11–15) remains below break-even on most days due to solar suppression of prices — the same dynamic that drives battery storage arbitrage demand.

The figures below show the evolution of profitable hours per month and the average gross margin per profitable hour over time, illustrating the improving but volatile economics of gas peakers in Ukraine.

```js
const operatingHours = view(Inputs.range([1, 12], {label: "Daily operating hours (top hours by margin)", step: 1, value: 7}))
```

```js
const profitable_monthly_long = profitable_monthly.flatMap(d => [
  {month: d.month, series: "UEEX (domestic)", hours: d.profitable_hours_mkt},
  {month: d.month, series: "TTF import-parity", hours: d.profitable_hours_ttf},
])

const quarterly_months = [...new Set(profitable_monthly.map(d => d.month.getTime()))]
  .map(t => new Date(t))
  .filter(d => [0, 3, 6, 9].includes(d.getUTCMonth()))

const quarterlyTickFormat = d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)
```

```js
Plot.plot({
  title: "Monthly profitable dispatch hours — Ukraine",
  subtitle: "Gas engine CHP, 46% efficiency",
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {label: null, axis: null},
  y: {nice: true, grid: true, label: "hours / month"},
  fx: {label: null, ticks: quarterly_months, tickFormat: quarterlyTickFormat},
  color: {legend: true, domain: ["UEEX (domestic)", "TTF import-parity"], range: ["#f59e0b", "steelblue"]},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.barY(profitable_monthly_long, {
      x: "series", y: "hours", fx: "month",
      fill: "series", tip: true,
    }),
  ],
})
```

```js
const monthly_margin_long = monthly_margin_top_n.flatMap(d => [
  {month: d.month, series: "UEEX (domestic)", margin: d.avg_margin_mkt},
  {month: d.month, series: "TTF import-parity", margin: d.avg_margin_ttf},
])
```

```js
Plot.plot({
  title: `Monthly gross margin — Ukraine (top ${operatingHours} hours/day dispatch)`,
  subtitle: "Average daily gross margin assuming dispatch during top operating hours; gas engine CHP, 46% efficiency",
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 60,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {label: null, axis: null},
  y: {nice: true, grid: true, label: "UAH / MWh"},
  fx: {label: null, ticks: quarterly_months, tickFormat: quarterlyTickFormat},
  color: {legend: true, domain: ["UEEX (domestic)", "TTF import-parity"], range: ["#f59e0b", "steelblue"]},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.barY(monthly_margin_long, {
      x: "series", y: "margin", fx: "month",
      fill: "series", tip: true,
    }),
  ],
})
```

Profitable hours under UEEX pricing expanded from near-zero in early 2023 to 150–200 hours per month by late 2025, with average gross margins of UAH 1,500–3,000/MWh during profitable hours. Under TTF import-parity pricing, profitable hours are fewer and margins are thinner, illustrating the sensitivity of project economics to the UEEX–TTF spread. The divergence between the two scenarios has narrowed since mid-2025 as domestic gas prices converged toward import-parity.

This analysis measures market-level profitability signals for a reference gas engine CHP plant on the day-ahead market, under two gas cost scenarios. It does not account for balancing market revenues (which can add UAH 700–1,500/MWh at peak times under current cap structures, but carry settlement risk from Ukrenergo's chronic underfunding), heat revenues under a CHP configuration, or fixed costs and capital recovery. Translating gross margins into investment returns requires a full dispatch model incorporating plant cycling constraints, a cap trajectory assumption, and a gas procurement strategy. The results should be read as a directional signal of how gas peaker economics in Ukraine have evolved, not as project-level revenue forecasts.

*This notebook updates automatically based on the most recently available data.*

---

```js
// Aggregate and transform data

const lastDayPrevMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 0))
  .toISOString().split("T")[0]
```

```js
// Constants: plant and tariff parameters

const GTS_ADDER = 552      // UAH/1,000 m³ — GTS exit tariff at day-ahead rate (NEURC Res. 2387, Jan 2025)
const DSO_ADDER = 1490     // UAH/1,000 m³ — DSO distribution (medium-pressure network)
const HEAT_VAL  = 9.44     // MWh_th / 1,000 m³ (lower heating value, Ukrainian gas)
const EFF_ENGINE = 0.46    // Gas engine CHP efficiency (dominant new-build technology in Ukraine)
const HEAT_RATE_CCGT = 2.0 // MWh_th / MWh_el for CCGT reference plant (50% efficiency)
const EMISSION_FACTOR = 0.37 // tCO₂ / MWh_el (EU ETS reference for CCGT)
```

```js
// TTF lookup map keyed by ISO date string

const ttf_map = new Map(ttf_raw.map(d => [d.date.toISOString().slice(0, 10), d]))
```

```js
// EUA carbon price lookup

const eua_map = new Map(eua_raw.map(d => [d.date.toISOString().slice(0, 10), d]))
```

```js
// UEEX daily volume-weighted average price (GTS-delivered trades only)

const ueex_daily = d3.rollups(
  ueex_raw.filter(d => d.supply_conditions === "ГТС"),
  v => d3.sum(v, d => d.price_uah_excl_vat * d.volume_tcm) / d3.sum(v, d => d.volume_tcm),
  d => d.date.toISOString().slice(0, 10)
).map(([dateStr, gas_market_uah]) => ({
  date: new Date(dateStr),
  gas_market_uah,
}))

// Forward-fill gaps: carry last known UEEX price forward for days with no trades
const ueex_map = (() => {
  const sorted = ueex_daily.slice().sort((a, b) => d3.ascending(a.date, b.date))
  const map = new Map()
  if (!sorted.length) return map
  const raw = new Map(sorted.map(d => [d.date.toISOString().slice(0, 10), d]))
  const end = sorted[sorted.length - 1].date
  let lastKnown = null
  const cur = new Date(sorted[0].date)
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    const entry = raw.get(key)
    if (entry) lastKnown = entry
    if (lastKnown) map.set(key, lastKnown)
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return map
})()
```

```js
// Monthly gas price aggregation

const gas_monthly_agg = d3.flatRollup(
  ueex_daily.flatMap(d => {
    const dateKey = d.date.toISOString().slice(0, 10)
    const ttf = ttf_map.get(dateKey)
    if (!ttf) return []
    return [{
      month: d3.utcMonth.floor(d.date),
      ueex_eur: d.gas_market_uah / HEAT_VAL / ttf.rate_eur,
      ttf_parity_eur: ttf.price_no_vat / HEAT_VAL / ttf.rate_eur,
      ttf_spot_eur: ttf.price_eur_mwh,
    }]
  }),
  v => ({
    ueex_eur: d3.mean(v, d => d.ueex_eur),
    ttf_parity_eur: d3.mean(v, d => d.ttf_parity_eur),
    ttf_spot_eur: d3.mean(v, d => d.ttf_spot_eur),
  }),
  d => d.month
).map(([month, vals]) => ({date: month, ...vals}))
```

```js
// Long format for gas price time series chart

const gas_monthly_long = gas_monthly_agg.flatMap(d => [
  {date: d.date, series: "UEEX (domestic)",     price_eur: d.ueex_eur},
  {date: d.date, series: "TTF import-parity",   price_eur: d.ttf_parity_eur},
])
```

```js
// Monthly UEEX discount vs TTF import-parity

const gas_discount_monthly = gas_monthly_agg.map(d => ({
  date: d.date,
  discount_pct: (d.ueex_eur - d.ttf_parity_eur) / d.ttf_parity_eur,
}))
```

```js
// Hourly prices for all countries with gas costs joined

const prices_all = prices_hourly_DAM.map(d => {
  const dateKey = d.date.toISOString().slice(0, 10)
  const ttf = ttf_map.get(dateKey) ?? {}
  const eua = eua_map.get(dateKey) ?? {}
  const isUA = d.country === "UA"
  const ttf_price = ttf.price_eur_mwh ?? NaN
  const eua_price = eua.price_eur ?? NaN
  const fuel_cost = ttf_price * HEAT_RATE_CCGT
  const spark_spread = d.price_dam - fuel_cost
  const clean_spark_spread = isUA ? spark_spread : spark_spread - EMISSION_FACTOR * eua_price
  return {...d, ttf_price, eua_price, fuel_cost, spark_spread, clean_spark_spread}
}).filter(d => !isNaN(d.clean_spark_spread))
```

```js
// Weekly spark spreads by country

const spark_weekly_raw = d3.flatRollup(
  prices_all,
  v => d3.mean(v, d => d.clean_spark_spread),
  d => d.country,
  d => d3.utcWeek.floor(d.date)
).map(([country, week, value]) => ({country, week, value}))
```

```js
// Moving average on weekly spark spreads

const sparkWindowSize_weeks = sparkWindowSize ?? 8
const spark_weekly_by_country = d3.group(spark_weekly_raw, d => d.country)

const spark_weekly_ma = Array.from(spark_weekly_by_country, ([country, rows]) => {
  rows.sort((a, b) => d3.ascending(a.week, b.week))
  return rows.map((d, i) => {
    const window = rows.slice(Math.max(0, i - sparkWindowSize_weeks + 1), i + 1)
    return {...d, ma: d3.mean(window, w => w.value)}
  })
}).flat()
```

```js
// UA hourly prices with break-even for both gas scenarios

const ua_hourly_with_be = priceUA.map(d => {
  const dateKey = d.hour.toISOString().slice(0, 10)
  const ttf = ttf_map.get(dateKey)
  const ueex = ueex_map.get(dateKey)
  const be_engine_ttf = ttf
    ? (ttf.price_no_vat + GTS_ADDER + DSO_ADDER) / HEAT_VAL / EFF_ENGINE
    : NaN
  const be_engine_mkt = ueex
    ? (ueex.gas_market_uah + GTS_ADDER + DSO_ADDER) / HEAT_VAL / EFF_ENGINE
    : NaN
  return {
    date: new Date(d.hour.toISOString().slice(0, 10)),
    hour: +d.hour.getUTCHours(),
    price_uah: +d.price_uah,
    be_engine_ttf,
    be_engine_mkt,
    spread_ttf: isNaN(be_engine_ttf) ? NaN : Math.max(0, +d.price_uah - be_engine_ttf),
    spread_mkt: isNaN(be_engine_mkt) ? NaN : Math.max(0, +d.price_uah - be_engine_mkt),
    profitable_ttf: !isNaN(be_engine_ttf) && +d.price_uah > be_engine_ttf,
    profitable_mkt: !isNaN(be_engine_mkt) && +d.price_uah > be_engine_mkt,
  }
}).filter(d => !isNaN(d.price_uah))
```

```js
// Hourly prices + break-even for selected date (dispatch chart)

const hourly_ua_for_date = (() => {
  const sel = ua_hourly_with_be.filter(d => d.date.getTime() === new Date(selectedDatePeaker).getTime())
    .sort((a, b) => a.hour - b.hour)
  return sel.length > 0
    ? [...sel, {...sel[sel.length - 1], hour: 24}]
    : sel
})()

const be_engine_mkt_day = hourly_ua_for_date.length > 0 ? hourly_ua_for_date[0].be_engine_mkt : NaN
const be_engine_ttf_day = hourly_ua_for_date.length > 0 ? hourly_ua_for_date[0].be_engine_ttf : NaN
```

```js
// Profitable hours heatmap: % hours per (hour of day, year) with positive gross margin

const profitable_heatmap = d3.flatRollup(
  ua_hourly_with_be.map(d => ({
    ...d,
    year: String(d.date.getFullYear()),
  })),
  v => ({
    pct_profitable: d3.mean(v, d => d.profitable_mkt ? 1 : 0),
    year: v[0].year,
  }),
  d => d.hour,
  d => d.year
).map(([hour, year, vals]) => ({hour, year, ...vals}))
```

```js
// Monthly profitable hours count

const profitable_monthly = d3.flatRollup(
  ua_hourly_with_be,
  v => ({
    profitable_hours_mkt: d3.sum(v, d => d.profitable_mkt ? 1 : 0),
    profitable_hours_ttf: d3.sum(v, d => d.profitable_ttf ? 1 : 0),
    avg_margin_mkt: d3.mean(v.filter(d => d.profitable_mkt), d => d.spread_mkt) ?? 0,
    avg_margin_ttf: d3.mean(v.filter(d => d.profitable_ttf), d => d.spread_ttf) ?? 0,
  }),
  d => d3.utcMonth.floor(d.date)
).map(([month, vals]) => ({month, ...vals}))
  .sort((a, b) => d3.ascending(a.month, b.month))
```

```js
// Monthly gross margin for top-N hours dispatch per day

const monthly_margin_top_n = d3.flatRollup(
  ua_hourly_with_be,
  v => {
    const days = d3.group(v, d => d.date.toISOString().slice(0, 10))
    const daily_margins = Array.from(days, ([, hours]) => {
      const sorted = hours.filter(h => h.spread_mkt > 0)
        .sort((a, b) => b.spread_mkt - a.spread_mkt)
        .slice(0, operatingHours)
      const sorted_ttf = hours.filter(h => h.spread_ttf > 0)
        .sort((a, b) => b.spread_ttf - a.spread_ttf)
        .slice(0, operatingHours)
      return {
        avg_margin_mkt: d3.mean(sorted, d => d.spread_mkt) ?? 0,
        avg_margin_ttf: d3.mean(sorted_ttf, d => d.spread_ttf) ?? 0,
      }
    })
    return {
      avg_margin_mkt: d3.mean(daily_margins, d => d.avg_margin_mkt),
      avg_margin_ttf: d3.mean(daily_margins, d => d.avg_margin_ttf),
    }
  },
  d => d3.utcMonth.floor(d.date)
).map(([month, vals]) => ({month, ...vals}))
  .sort((a, b) => d3.ascending(a.month, b.month))
```


```js
// Gas and carbon price data

const ttf_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/res-yield-data/refs/heads/main/data/data_raw/ttf_daily_yahoo.csv",
  d3.autoType
)
```

```js
const eua_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/res-yield-data/refs/heads/main/data/data_raw/eua_daily_yahoo.csv",
  d3.autoType
)
```

```js
// UEEX Ukrainian gas exchange prices — from data_raw/
// TODO: ensure ueex_gas_UA.csv is published to res-yield-data repo

const ueex_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/res-yield-data/refs/heads/main/data/data_raw/ueex_gas_UA.csv",
  d3.autoType
)
```



```js
// Electricity price data

const priceUA = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/DAM_UA.csv",
  d3.autoType
)
```

```js
const priceEU = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/DAM_EU.csv",
  d3.autoType
)
```

```js
const prices_hourly_DAM = [
  ...priceUA.map(d => ({
    country: d.country,
    date: new Date(d.hour.toISOString().slice(0, 10)),
    hour: +d.hour.getUTCHours(),
    price_dam: +d.price_eur_mwh,
  })),
  ...priceEU.map(d => ({
    country: d.country,
    date: new Date(d.hour.toISOString().slice(0, 10)),
    hour: +d.hour.getUTCHours(),
    price_dam: +d.price_eur,
  })),
]
```

```js
// Import libraries

import * as aq from "npm:arquero"
import {op} from "npm:arquero"
```

```js
import {countries} from "./components/countries.js"
```
