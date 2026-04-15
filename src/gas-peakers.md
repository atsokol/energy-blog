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

The figure below shows weekly average gas prices on the Ukrainian Energy Exchange (UEEX) against the TTF import parity price, which reflects the TTF spot price plus transit cost to the Ukrainian border and injection into the GTS, converted at the prevailing UAH/EUR exchange rate.

```js
const startDateGas = view(Inputs.date({label: "Start date", value: "2023-01-01"}))
```

```js
Plot.plot({
  title: "Gas prices in Ukraine vs TTF import-parity",
  subtitle: "Weekly averages, EUR / MWh thermal",
  caption: "Sources: UEEX, Yahoo Finance (TTF)",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "EUR / MWh_th"},
  color: {legend: true},
  marks: [
    Plot.lineY(gas_weekly_long.filter(d => d.date >= new Date(startDateGas) && d.date <= lastFullWeek), {
      x: d => d3.utcDay.offset(d.date, 6), y: "price_eur",
      stroke: "series",
      strokeWidth: d => d.series === "UEEX (domestic)" ? 2.5 : 1.5,
      strokeDasharray: d => d.series === "TTF spot" ? "4,4" : null,
      curve: "catmull-rom",
      tip: {format: {y: d3.format(".1f"), strokeWidth: false}},
    }),
  ],
})
```

The discount between UEEX and TTF import-parity has historically ranged from 20–40% reflecting the stabilising role of domestic gas production. As the figure below shows, this discount narrowed sharply in 2025 as domestic production fell and generator gas demand rose. By early 2026, UEEX prices have converged to within 10–15% of import-parity on a weekly basis, significantly compressing the fuel-cost advantage. In March 2026, renewed fighting in the Middle East pushed European and Ukrainian gas prices higher on supply-security concerns. 

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
    Plot.rectY(gas_discount_weekly.filter(d => d.date >= new Date(startDateGas) && d.date <= lastFullWeek), {
      x1: "date",
      x2: d => d3.utcMonday.offset(d.date, 1),
      y: "discount_pct",
      fill: d => d.discount_pct > 0,
      channels: {
        diff: {value: "discount_pct", label: "diff"},
        end: {value: d => d3.utcDay.offset(d.date, 6), label: "week ending"},
      },
      tip: {format: {y: false, fill: false, x1: false, x2: false, diff: d3.format(".1%"), end: d3.utcFormat("%d %b %Y")}},
    }),
  ],
})
```

## Spark spread: Ukraine vs EU neighbours

The spark spread measures a gas plant's gross profit margin. For EU markets operating under the EU Emissions Trading System, the relevant measure is the clean spark spread (CSS): electricity price minus fuel and carbon costs. For Ukraine, which is not yet part of the EU ETS, no material carbon costs to generation apply and are therefore excluded from the spark spread calculation.

```js
const sparkWindowSize = view(Inputs.range([4, 16], {value: 4, step: 4, label: "Trend smoothing window (weeks)"}))
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
  subtitle: `EU: clean spark spread (fuel + EUA carbon); UA: simple spread (UEEX fuel cost)`,
  caption: "Sources: ENTSO-E, Market Operator JSC, UEEX, Yahoo Finance (TTF, EUA)",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 320,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "EUR / MWh"},
  color: {legend: true, domain: colorDomain, range: colorRange},
  marks: [
    Plot.ruleY([0], {stroke: "#aaa", strokeDasharray: "4,4"}),
    Plot.lineY(spark_weekly_ma.filter(d => d.week >= new Date(startDateSpark) && d.week <= lastFullWeek && selectedSparkCountries.includes(d.country)), {
      x: d => d3.utcDay.offset(d.week, 6), y: "ma",
      stroke: d => countries.get(d.country),
      strokeWidth: d => d.country === "UA" ? 2.5 : 1.5,
      strokeOpacity: d => d.country === "UA" ? 1 : 0.6,
      curve: "catmull-rom",
      channels: {country: {value: d => countries.get(d.country), label: "country"}},
      tip: {format: {y: d3.format(".1f"), stroke: false, strokeWidth: false, z: false, country: true}},
    }),
  ],
})
```

EU neighbours (Hungary, Romania, Slovakia) maintained positive clean spark spreads for most of 2023–2025 as gas prices normalised from their 2022 crisis peaks, with spreads stabilising in the EUR 10–30/MWh range for a gas engine reference plant (~45% efficiency). Ukraine's spread, calculated using UEEX domestic gas prices, showed a more volatile path: deeply negative in 2022–2023 when electricity price caps prevented any gas cost pass-through, recovering sharply through 2024–2025 as caps were raised and electricity prices converged toward European levels. Following the gas spike price in March 2026, spark spreads have declined across the board, with European spreads turning firmly negative. 

## Dispatch economics

The figure below shows hourly day-ahead electricity prices in Ukraine alongside the break-even price for a gas reciprocating engine reference plant (~45% efficiency) based on the prevailing UEEX price. Hours where the electricity price exceeds the break-even are shaded green; the orange dashed line marks the day-ahead maximum price cap.

```js
const dispatchViewMode = view(Inputs.radio(["Day", "Week"], {value: "Week", label: "View"}))
```

```js
const selectedDatePeaker = view(Inputs.date({label: dispatchViewMode === "Day" ? "Select date" : "Select week (any day)", value: lastDayPrevMonth}))
```

```js
const weekStartPeaker = d3.utcMonday.floor(new Date(selectedDatePeaker))
const weekEndPeaker = d3.utcMonday.offset(weekStartPeaker, 1)

// Price cap lookup: "YYYY-MM-DD-H" → price_max, with day-level forward-fill
// Cap varies by hour within a day (off-peak vs peak) and changes over time
const cap_map = (() => {
  const raw = new Map(
    price_caps_raw.map(d => [
      `${d.date.toISOString().slice(0, 10)}-${d.hour}`,
      d.price_max
    ])
  )
  if (!raw.size) return raw
  const dates = [...new Set([...raw.keys()].map(k => k.slice(0, 10)))].sort()
  const map = new Map()
  const end = new Date()
  let lastDayCaps = null
  const cur = new Date(dates[0])
  while (cur <= end) {
    const ds = cur.toISOString().slice(0, 10)
    if (raw.has(`${ds}-0`)) {
      lastDayCaps = new Map()
      for (let h = 0; h <= 24; h++) {
        const v = raw.get(`${ds}-${h}`)
        if (v !== undefined) lastDayCaps.set(h, v)
      }
    }
    if (lastDayCaps) {
      for (const [h, v] of lastDayCaps) map.set(`${ds}-${h}`, v)
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return map
})()

const hourly_ua_for_week = ua_hourly_with_be
  .filter(d => d.date >= weekStartPeaker && d.date < weekEndPeaker)
  .sort((a, b) => a.date - b.date || a.hour - b.hour)
  .map(d => ({
    ...d,
    price_cap: cap_map.get(`${d.date.toISOString().slice(0, 10)}-${d.hour}`) ?? NaN,
  }))

const be_mkt_by_day = Array.from(
  d3.rollup(hourly_ua_for_week, v => v[0].be_engine_mkt, d => d.date.toISOString().slice(0, 10)),
  ([dateStr, be_engine_mkt]) => ({date: new Date(dateStr), be_engine_mkt})
).filter(d => !isNaN(d.be_engine_mkt))

const hourly_ua_for_day = hourly_ua_for_week
  .filter(d => d.date.getTime() === new Date(selectedDatePeaker).getTime())
  .sort((a, b) => a.hour - b.hour)
```

```js
{
  const sharedMarks = (data, dayData, beData, opts = {}) => [
    Plot.rect(
      data.filter(d => d.hour < 24 && d.price_uah > d.be_engine_mkt),
      {...opts, x1: "hour", x2: d => d.hour + 1, y1: "be_engine_mkt", y2: "price_uah", fill: "#bae4bc", fillOpacity: 0.6}
    ),
    Plot.lineY(data.filter(d => d.hour < 24), {
      ...opts, x: "hour", y: "price_uah",
      stroke: "steelblue", strokeWidth: 2, curve: "step-after", tip: true,
    }),
    Plot.ruleY(beData, {
      ...opts, y: "be_engine_mkt",
      stroke: "steelblue", strokeDasharray: "4,4", strokeWidth: 1.5,
    }),
    Plot.lineY(data.filter(d => !isNaN(d.price_cap) && d.hour < 24), {
      ...opts, x: "hour", y: "price_cap",
      stroke: "orange", strokeDasharray: "4,4", strokeWidth: 1.5, curve: "step-after",
    }),
    Plot.text(
      (() => {
        const ref = dayData.find(d => d.hour === 20) ?? dayData[dayData.length - 1]
        if (!ref) return []
        return [
          {y: ref.price_cap,     label: "max price cap", color: "orange",    ...(opts.fx ? {[opts.fx]: ref.date} : {})},
          {y: ref.be_engine_mkt, label: "break-even price",          color: "steelblue", ...(opts.fx ? {[opts.fx]: ref.date} : {})},
        ].filter(d => d.y != null && !isNaN(d.y))
      })(),
      {...(opts.fx ? {fx: opts.fx} : {}), x: 23, y: "y", text: "label", fill: "color",
       textAnchor: "start", dx: 8, fontSize: 10, clip: false}
    ),
    Plot.ruleY([0]),
  ]

  const commonOpts = {
    title: "Day-ahead electricity prices vs gas break-even in Ukraine",
    caption: "Sources: Market Operator JSC, UEEX. Break-even: gas reciprocating engine, heat rate 2.2",
    marginLeft: 60,
    marginRight: 155,
    width: Math.min(width, 800),
    x: {label: "hour", domain: d3.range(0, 24), ticks: [0, 6, 12, 18, 23]},
    y: {label: "UAH / MWh", domain: [0, 16500], grid: true},
  }

  const lastDateInWeek = d3.max(hourly_ua_for_week, d => +d.date)
  const lastDayRows = hourly_ua_for_week.filter(d => +d.date === lastDateInWeek)

  dispatchViewMode === "Day"
    ? display(Plot.plot({
        ...commonOpts,
        subtitle: new Date(selectedDatePeaker).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric", timeZone: "UTC"}),
        height: 320,
        marks: sharedMarks(hourly_ua_for_day, hourly_ua_for_day,
          hourly_ua_for_day.slice(0, 1).map(d => ({be_engine_mkt: d.be_engine_mkt})),
          {}),
      }))
    : display(Plot.plot({
        ...commonOpts,
        subtitle: `Week of ${weekStartPeaker.toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric", timeZone: "UTC"})}`,
        height: 320,
        fx: {label: null, padding: 0.15, tickFormat: d => d.toLocaleDateString("en-US", {weekday: "short", day: "numeric", timeZone: "UTC"})},
        marks: sharedMarks(hourly_ua_for_week, lastDayRows, be_mkt_by_day, {fx: "date"}),
      }))
}
```

The day-ahead market price cap acts as a hard ceiling on hourly prices; during the evening peak, when gas generators are most needed, prices frequently hit it. The break-even electricity price is the minimum the plant must earn per MWh sold to cover its gas bill: total delivered gas cost (commodity price plus transmission and distribution charges) multiplied by the plant's efficiency. Full calculation logic and assumptions are documented in the [source code](https://github.com/atsokol/energy-blog/blob/main/src/gas-peakers.md). 

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

The heatmap reveals a structural shift in profitability. In 2022–2023, low price caps kept the reference plant below break-even for most of the day. By 2024–2026, the evening peak window (hours 17–22) reached near-100% profitability as caps were raised. 

The figures below show the evolution of profitable hours per week and the average gross margin per profitable hour over time, illustrating the improving but volatile economics of gas peakers in Ukraine. 

```js
// Last completed Monday–Sunday week — exclude any in-progress current week
const lastFullWeek = d3.utcMonday.offset(d3.utcMonday.floor(new Date()), -1)
```

```js
Plot.plot({
  title: "Number of profitable dispatch hours per week",
  subtitle: `Calculated for gas engine reference plant based on UEEX gas price, ${sparkWindowSize}-week moving average`,
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {line: true, label: null, ticks: d3.utcMonth.every(3), tickFormat: d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)},
  y: {nice: true, grid: true, label: "hours / week"},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.dot(profitable_weekly.filter(d => d.week <= lastFullWeek), {
      x: d => d3.utcDay.offset(d.week, 6), y: "profitable_hours_mkt",
      stroke: "#f59e0b", r: 2, strokeOpacity: 0.35, tip: true,
    }),
    Plot.lineY(profitable_weekly_ma.filter(d => d.week <= lastFullWeek), {
      x: d => d3.utcDay.offset(d.week, 6), y: "ma_hours",
      stroke: "#f59e0b", strokeWidth: 2, curve: "catmull-rom",
    }),
  ],
})
```

```js
const operatingHours = view(Inputs.range([1, 12], {label: "Daily operating hours (top hours by margin)", step: 1, value: 7}))
```

```js
Plot.plot({
  title: `Weekly average gross margin`,
  subtitle: `Calculated for gas engine reference plant based on UEEX gas price, ${sparkWindowSize}-week moving average`,
  caption: "Sources: Market Operator JSC, UEEX",
  marginLeft: 60,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 280,
  x: {line: true, label: null, ticks: d3.utcMonth.every(3), tickFormat: d => d.getUTCMonth() === 0 ? d3.utcFormat("%Y")(d) : d3.utcFormat("%b")(d)},
  y: {nice: true, grid: true, label: "UAH / MWh"},
  marks: [
    Plot.ruleY([0], {stroke: "#333"}),
    Plot.dot(weekly_margin_top_n.filter(d => d.week <= lastFullWeek), {
      x: d => d3.utcDay.offset(d.week, 6), y: "avg_margin_mkt",
      stroke: "#f59e0b", r: 2, strokeOpacity: 0.35,
      tip: {format: {y: d3.format(",.0f")}},
    }),
    Plot.lineY(weekly_margin_ma.filter(d => d.week <= lastFullWeek), {
      x: d => d3.utcDay.offset(d.week, 6), y: "ma_margin",
      stroke: "#f59e0b", strokeWidth: 2, curve: "catmull-rom",
    }),
  ],
})
```

This analysis measures market-level profitability signals for a gas reciprocating engine reference plant on the day-ahead market. Gas costs are based on market prices (UEEX exchange prices and TTF import-parity); it does not reflect subsidised PSO gas prices available to certain generators, to assess market-based economics. It also does not account for balancing market revenues, fixed costs and capital recovery. Translating gross margins into investment returns requires a full set of assumptions and a comprehensive financial model. These results should be interpreted as a directional signal of how gas peaker economics in Ukraine evolves.

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
// Monthly tariff lookup map keyed by "YYYY-MM-01" — forward-filled to current month

const tariff_map = (() => {
  const raw = new Map(
    tariffs_raw.map(d => {
      const [day, month, year] = d.date.split("/")
      return [`${year}-${month.padStart(2, "0")}-01`, d]
    })
  )
  const map = new Map()
  if (!raw.size) return map
  const keys = [...raw.keys()].sort()
  const start = new Date(keys[0])
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  let lastKnown = null
  const cur = new Date(start)
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    const entry = raw.get(key)
    if (entry) lastKnown = entry
    if (lastKnown) map.set(key, lastKnown)
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return map
})()
```

```js
// Weekly gas price aggregation

const gas_weekly_agg = d3.flatRollup(
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
      week: d3.utcMonday.floor(d.date),
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
  d => d.week
).map(([week, vals]) => ({date: week, ...vals}))
```

```js
// Long format for gas price time series chart

const gas_weekly_long = gas_weekly_agg.flatMap(d => [
  {date: d.date, series: "UEEX (domestic)",     price_eur: d.ueex_eur},
  {date: d.date, series: "TTF import-parity",   price_eur: d.ttf_parity_eur},
])
```

```js
// Weekly UEEX discount vs TTF import-parity

const gas_discount_weekly = gas_weekly_agg.map(d => ({
  date: d.date,
  discount_pct: (d.ueex_eur - d.ttf_parity_eur) / d.ttf_parity_eur,
}))
```

```js
// Hourly prices for all countries with gas costs joined
// Ukraine uses UEEX domestic gas price; EU neighbours use TTF

const prices_all = prices_hourly_DAM.map(d => {
  const dateKey = d.date.toISOString().slice(0, 10)
  const ttf = ttf_map.get(dateKey) ?? {}
  const eua = eua_map.get(dateKey) ?? {}
  const ueex = ueex_map.get(dateKey)
  const isUA = d.country === "UA"
  const ttf_price = ttf.price_eur_mwh ?? NaN
  const eua_price = eua.price_eur ?? NaN
  const rate_eur = ttf.rate_eur ?? NaN
  const ueex_eur = (ueex && !isNaN(rate_eur)) ? ueex.gas_market_uah / HEAT_VAL / rate_eur : NaN
  const gas_price_eur = (isUA && !isNaN(ueex_eur)) ? ueex_eur : ttf_price
  const fuel_cost = gas_price_eur * HEAT_RATE
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
  d => d3.utcMonday.floor(d.date)
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
// Weekly profitable hours count

const profitable_weekly = d3.flatRollup(
  ua_hourly_with_be,
  v => ({
    profitable_hours_mkt: d3.sum(v, d => d.profitable_mkt ? 1 : 0),
    profitable_hours_ttf: d3.sum(v, d => d.profitable_ttf ? 1 : 0),
    avg_margin_mkt: d3.mean(v.filter(d => d.profitable_mkt), d => d.spread_mkt) ?? 0,
    avg_margin_ttf: d3.mean(v.filter(d => d.profitable_ttf), d => d.spread_ttf) ?? 0,
  }),
  d => d3.utcMonday.floor(d.date)
).map(([week, vals]) => ({week, ...vals}))
  .sort((a, b) => d3.ascending(a.week, b.week))
```

```js
// Weekly gross margin for top-N hours dispatch per day

const weekly_margin_top_n = d3.flatRollup(
  ua_hourly_with_be,
  v => {
    const days = d3.group(v, d => d.date.toISOString().slice(0, 10))
    const daily_margins = Array.from(days, ([, hours]) => {
      const profitable_mkt = hours.filter(h => h.spread_mkt > 0)
      const sorted = hours
        .sort((a, b) => b.spread_mkt - a.spread_mkt)
        .slice(0, Math.max(operatingHours, profitable_mkt.length))
      const profitable_ttf = hours.filter(h => h.spread_ttf > 0)
      const sorted_ttf = hours
        .sort((a, b) => b.spread_ttf - a.spread_ttf)
        .slice(0, Math.max(operatingHours, profitable_ttf.length))
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
  d => d3.utcMonday.floor(d.date)
).map(([week, vals]) => ({week, ...vals}))
  .sort((a, b) => d3.ascending(a.week, b.week))
```

```js
// Moving average over weekly profitable hours (reactive to weeklyTrendWindow)

const profitable_weekly_ma = profitable_weekly.map((d, i, arr) => {
  const window = arr.slice(Math.max(0, i - (sparkWindowSize ?? 4) + 1), i + 1)
  return {...d, ma_hours: d3.mean(window, w => w.profitable_hours_mkt)}
})
```

```js
// Moving average over weekly gross margin (reactive to weeklyTrendWindow)

const weekly_margin_ma = weekly_margin_top_n.map((d, i, arr) => {
  const window = arr.slice(Math.max(0, i - (sparkWindowSize ?? 4) + 1), i + 1)
  return {...d, ma_margin: d3.mean(window, w => w.avg_margin_mkt)}
})
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
// Day-ahead price caps (min/max) for Ukrainian energy systems

const price_caps_raw = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/UA_price_caps.csv",
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
