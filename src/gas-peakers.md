---
title: Economics of gas peakers in Ukraine
---

# Economics of gas peakers in Ukraine

Gas-fired capacity is the primary source of dispatchable generation in Ukraine's power system. After Russian attacks destroyed most of Ukraine's pre-war flexible generation, the remaining gas fleet has shifted from a supplementary role to a system-critical one, covering evening demand peaks and absorbing residual load not served by nuclear, hydro, and renewables.

The economics of a gas peaker hinges on the **spark spread**: the margin between the electricity price earned and the cost of gas consumed per MWh of output. When spreads are wide and persistent, investment in new gas capacity is attractive; when price caps constrain electricity revenues below the gas break-even, plants are compelled to stay idle or run at a loss.

## Gas prices in Ukraine

Gas prices in Ukraine are determined by three forces acting simultaneously:
 - European wholesale prices set the import parity ceiling - the cost of sourcing gas at the European gas hubs such as the TTF. 
 - Domestic production, operated primarily by Naftogaz/Ukrgasvydobuvannya, historically kept gas prices well below import parity. Russian strikes on gas infrastructure since 2024 have reduced domestic output, compressing this structural discount. 
 - Growing demand from gas-fired plants replacing destroyed thermal capacity has added further pressure on prices.

The figure below shows monthly average gas prices on the Ukrainian Energy Exchange (UEEX) against the TTF import parity price, which reflects the TTF spot price plus transit cost to the Ukrainian border and injection into the GTS, converted at the prevailing UAH/EUR exchange rate.

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
      tip: {format: {y: d3.format(".1f"), strokeWidth: false}},
    }),
  ],
})
```

The discount between UEEX and TTF import-parity has historically ranged from 20–40% reflecting the stabilising role of domestic gas production. As the figure below shows, this discount narrowed sharply in 2025 as domestic production fell and generator gas demand rose. By early 2026, UEEX prices have converged to within 10–15% of import-parity on a monthly basis, significantly compressing the fuel-cost advantage. In March 2026, renewed fighting in the Middle East pushed European gas prices higher on supply-security concerns, while Ukrainian domestic prices have remained relatively stable so far.

```js
Plot.plot({
  title: "UEEX domestic gas discount vs TTF import-parity",
  caption: "Sources: UEEX, Yahoo Finance (TTF)",
  marginLeft: 60,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {line: true, label: null, ticks: d3.utcMonth.every(3), tickFormat: d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)},
  y: {nice: true, grid: true, label: "↑ premium\n↓ discount", tickFormat: d3.format(".0%")},
  color: {scheme: "RdYlGn", reverse: true},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.barY(gas_discount_monthly.filter(d => d.date >= new Date(startDateGas)), {
      x: "date",
      y: "discount_pct",
      fill: (d) => d.discount_pct > 0,
      channels: {diff: {value: "discount_pct", label: "diff"}},
      tip: {format: {y: false, fill: false, diff: d3.format(".1%")}},
      curve: "catmull-rom",
    }),
  ],
})
```

## Spark spread: Ukraine vs EU neighbours

The spark spread measures a gas plant's gross profit margin. For EU markets operating under the EU Emissions Trading System, the relevant measure is the clean spark spread (CSS): electricity price minus fuel and carbon costs. For Ukraine, which is not yet part of the EU ETS, no material carbon costs to generation apply and are therefore excluded from the spark spread calculation.

```js
const sparkWindowSize = view(Inputs.range([4, 12], {value: 4, step: 4, label: "Moving average window (weeks)"}))
```
```js
const startDateSpark = view(Inputs.date({label: "Start date", value: "2023-01-01"}))
```
```js
const allSparkCountries = [...new Set(spark_weekly_ma.map(d => d.country))].sort()
const selectedSparkCountries = view(Inputs.checkbox(allSparkCountries, {
  label: "Countries",
  value: allSparkCountries,
  format: d => countries.get(d) ?? d,
}))
```

```js
Plot.plot({
  title: "Weekly spark spread: Ukraine vs EU neighbours",
  subtitle: `EU: clean spark spread (fuel + EUA carbon); UA: simple spread (fuel only)`,
  caption: "Sources: ENTSO-E, Market Operator JSC, Yahoo Finance (TTF, EUA)",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 320,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "EUR / MWh"},
  color: {legend: true, domain: colorDomain, range: colorRange},
  marks: [
    Plot.ruleY([0], {stroke: "#aaa", strokeDasharray: "4,4"}),
    Plot.lineY(spark_weekly_ma.filter(d => d.week >= new Date(startDateSpark) && selectedSparkCountries.includes(d.country)), {
      x: "week", y: "ma",
      stroke: d => countries.get(d.country),
      strokeWidth: d => d.country === "UA" ? 2.5 : 1.5,
      curve: "catmull-rom",
      channels: {country: {value: d => countries.get(d.country), label: "country"}},
      tip: {format: {y: d3.format(".1f"), stroke: false, strokeWidth: false, z: false, country: true}},
    }),
  ],
})
```

EU neighbours (Hungary, Romania, Slovakia) maintained positive clean spark spreads for most of 2023–2025 as gas prices normalised from their 2022 crisis peaks, with spreads stabilising in the EUR 10–30/MWh range for a gas engine reference plant (~45% efficiency). Ukraine's spread, calculated using TTF import-parity gas costs, showed a more volatile path: deeply negative in 2022–2023 when electricity price caps prevented any gas cost pass-through, recovering sharply through 2024–2025 as caps were raised and electricity prices converged toward European levels. 

## Daily dispatch economics

The figure below shows hourly day-ahead electricity prices in Ukraine for a selected date alongside the break-even price for a gas reciprocating engine reference plant (~45% efficiency) based on the prevailing UEEX price. Hours where the electricity price exceeds the break-even are shaded green; below it, the plant would generate at a variable loss.

```js
const selectedDatePeaker = view(Inputs.date({label: "Select date", value: lastDayPrevMonth}))
```

```js
Plot.plot({
  title: `Day-ahead electricity prices vs gas break-even in Ukraine`,
  subtitle: new Date(selectedDatePeaker).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}),
  caption: "Sources: Market Operator JSC, UEEX, Yahoo Finance (TTF). Break-even: gas reciprocating engine, heat rate 2.2",
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
    Plot.ruleY([0]),
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

The day-ahead market price cap — currently set at UAH 15,000/MWh — is clearly visible as a ceiling on hourly prices. During the evening peak, when gas generators are most needed, prices frequently hit the cap. The break-even electricity price is the minimum the plant must earn per MWh sold to cover its gas bill: total delivered gas cost (commodity price plus transmission and distribution charges) multiplied by the plant's efficiency. Full calculation logic and assumptions are documented in the [source code](https://github.com/atsokol/energy-blog/blob/main/src/gas-peakers.md). 

## Profitability profile: hours and margins

The heatmap below shows, for each hour of day and each year, the share of hours in which a gas reciprocating engine reference plant would have earned a positive gross margin on the day-ahead market.

```js
Plot.plot({
  title: "Profitable hours for gas reciprocating engine reference plant in Ukraine",
  subtitle: "% of hours with positive gross margin (UEEX gas pricing)",
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
    ...(width > 400 ? [Plot.text(profitable_heatmap, {
      x: "hour", y: "year",
      text: d => d3.format(".0%")(d.pct_profitable),
      fill: d => d.pct_profitable < 0.25 || d.pct_profitable > 0.8 ? "white" : "#333",
      fontSize: 9,
    })] : []),
  ],
})
```

The heatmap reveals a structural shift in profitability. In 2022–2023, low price caps kept the reference plant below break-even for most of the day. By 2024–2025, the evening peak window (hours 17–22) reached near-100% profitability as caps were raised. In early 2026, profitable hours expanded across most of the day, driven by tighter system balance following generation capacity losses.

The figures below show the evolution of profitable hours per month and the average gross margin per profitable hour over time, illustrating the improving but volatile economics of gas peakers in Ukraine. The TTF import-parity scenario illustrates the hypothetical downside case of European gas prices.

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
  title: "Monthly profitable dispatch hours for gas reciprocating engine reference plant in Ukraine",
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {label: null},
  y: {nice: true, grid: true, label: "hours / month"},
  color: {legend: true, domain: ["UEEX (domestic)", "TTF import-parity"], range: ["#f59e0b", "steelblue"]},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.lineY(profitable_monthly_long, {
      x: "month", y: "hours", 
      stroke: "series", tip: true, curve: "catmull-rom"
    }),
  ],
})
```

```js
const operatingHours = view(Inputs.range([1, 12], {label: "Daily operating hours (top hours by margin)", step: 1, value: 7}))
```

```js
const monthly_margin_long = monthly_margin_top_n.flatMap(d => [
  {month: d.month, series: "UEEX (domestic)", margin: d.avg_margin_mkt},
  {month: d.month, series: "TTF import-parity", margin: d.avg_margin_ttf},
])
```

```js
Plot.plot({
  title: `Monthly average gross margin for gas reciprocating engine reference plant in Ukraine`,
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 60,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {label: null},
  y: {nice: true, grid: true, label: "UAH / MWh"},
  color: {legend: true, domain: ["UEEX (domestic)", "TTF import-parity"], range: ["#f59e0b", "steelblue"]},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.lineY(monthly_margin_long, {
      x: "month", y: "margin", 
      stroke: "series", tip: {format: {y: d3.format(",.0f")}},
      curve: "catmull-rom"
    }),
  ],
})
```

This analysis measures market-level profitability signals for a gas reciprocating engine reference plant on the day-ahead market. Gas costs are based on market prices (UEEX exchange prices and TTF import-parity); it does not reflect subsidised PSO gas prices available to certain generators, to assess market-based economics. It also does not account for balancing market revenues, which can add UAH 700–1,500/MWh at peak times under current cap structures, but carry activation and settlement risk from Ukrenergo, fixed costs and capital recovery. Translating gross margins into investment returns requires a full set of assumptions and a comprehensive financial model. These results should be interpreted as a directional signal of how gas peaker economics in Ukraine evolves.

*This notebook updates automatically based on the most recently available data.*

---

```js
// Aggregate and transform data

const lastDayPrevMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 0))
  .toISOString().split("T")[0]
```

```js
// Constants: plant and tariff parameters

const HEAT_VAL  = 10.675   // MWh_th / tcm (1,000 m³) — gas LHV, lower heating value
const TTF_TRANSPORT = 5.0  // EUR/MWh TTF-to-Ukraine border transport cost
const DA_FACTOR_DOMESTIC = 1.10    // NEURC multiplier on domestic GTS tariffs (next-day booking)
const DA_FACTOR_CROSSBORDER = 1.45 // NEURC multiplier on cross-border GTS entry tariff (next-day booking)
const HEAT_RATE = 2.2      // MWh_th / MWh_el — gas reciprocating engine reference plant (~45% efficiency)
const EMISSION_FACTOR = 0.44 // tCO₂ / MWh_el (EU ETS reference for gas engine reference plant)
```

```js
// TTF lookup map keyed by ISO date string — forward-filled to cover dates with no trading (weekends, holidays, data lag)

const ttf_map = (() => {
  const sorted = ttf_raw.slice().sort((a, b) => d3.ascending(a.date, b.date))
  const map = new Map()
  if (!sorted.length) return map
  const raw = new Map(sorted.map(d => [d.date.toISOString().slice(0, 10), d]))
  const end = new Date()
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
// EUA carbon price lookup — forward-filled to cover dates with no trading

const eua_map = (() => {
  const sorted = eua_raw.slice().sort((a, b) => d3.ascending(a.date, b.date))
  const map = new Map()
  if (!sorted.length) return map
  const raw = new Map(sorted.map(d => [d.date.toISOString().slice(0, 10), d]))
  const end = new Date()
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
// Monthly tariff lookup map keyed by "YYYY-MM-01"

const tariff_map = new Map(
  tariffs_raw.map(d => {
    const [day, month, year] = d.date.split("/")
    return [`${year}-${month.padStart(2, "0")}-01`, d]
  })
)
```

```js
// Monthly gas price aggregation

const gas_monthly_agg = d3.flatRollup(
  ueex_daily.flatMap(d => {
    const dateKey = d.date.toISOString().slice(0, 10)
    const ttf = ttf_map.get(dateKey)
    if (!ttf) return []
    const monthKey = dateKey.slice(0, 7) + "-01"
    const tariff = tariff_map.get(monthKey)
    if (!tariff) return []
    const cb_tariff_uah_tcm = (!isNaN(tariff.cb_tariff_entry_eur_tcm)
      ? tariff.cb_tariff_entry_eur_tcm * ttf.rate_eur
      : tariff.cb_tariff_entry_usd_tcm * ttf.rate_usd) * DA_FACTOR_CROSSBORDER
    if (isNaN(cb_tariff_uah_tcm)) return []
    const ttf_parity_uah_tcm = (ttf.price_eur_mwh + TTF_TRANSPORT) * HEAT_VAL * ttf.rate_eur + cb_tariff_uah_tcm
    return [{
      month: d3.utcMonth.floor(d.date),
      ueex_eur: d.gas_market_uah / HEAT_VAL / ttf.rate_eur,
      ttf_parity_eur: ttf_parity_uah_tcm / HEAT_VAL / ttf.rate_eur,
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
  const fuel_cost = ttf_price * HEAT_RATE
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
  const monthKey = dateKey.slice(0, 7) + "-01"
  const tariff = tariff_map.get(monthKey)
  let be_engine_ttf = NaN
  if (ttf && tariff) {
    const cb_tariff_uah = (!isNaN(tariff.cb_tariff_entry_eur_tcm)
      ? tariff.cb_tariff_entry_eur_tcm * ttf.rate_eur
      : tariff.cb_tariff_entry_usd_tcm * ttf.rate_usd) * DA_FACTOR_CROSSBORDER
    const ttf_parity_uah_tcm = (ttf.price_eur_mwh + TTF_TRANSPORT) * HEAT_VAL * ttf.rate_eur + cb_tariff_uah
    be_engine_ttf = ttf_parity_uah_tcm / HEAT_VAL * HEAT_RATE
  }
  const be_engine_mkt = (ueex && tariff)
    ? (ueex.gas_market_uah
        + tariff.gts_tariff_exit_domestic_uah_tcm * DA_FACTOR_DOMESTIC
        + tariff.dso_tariff_wavg_tcm) / HEAT_VAL * HEAT_RATE
    : NaN
  return {
    date: new Date(dateKey),
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
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/ttf_daily_yahoo.csv",
  d3.autoType
)
```

```js
const eua_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/eua_daily_yahoo.csv",
  d3.autoType
)
```

```js
const ueex_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/ueex_gas_UA.csv",
  d3.autoType
)
```

```js
// GTS and DSO tariff history — monthly rows, date format DD/MM/YYYY

const tariffs_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/gas_distib_tariffs.csv",
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
  ...priceUA.map(d => {
    const dateKey = d.hour.toISOString().slice(0, 10)
    const eur_mwh = +d.price_eur_mwh
    const fallback_rate = +d.rate || ttf_map.get(dateKey)?.rate_eur
    return {
      country: d.country,
      date: new Date(dateKey),
      hour: +d.hour.getUTCHours(),
      price_dam: !isNaN(eur_mwh) ? eur_mwh : (fallback_rate ? +d.price_uah / fallback_rate : NaN),
    }
  }),
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
import {countries, colorDomain, colorRange} from "./components/countries.js"
```
