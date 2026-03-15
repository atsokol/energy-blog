---
title: Renewables price capture in Ukraine and neighbouring EU markets
---

# Renewables price capture in Ukraine and neighbouring EU markets

Electricity is traded in short time blocks, typically hourly or 15-minute intervals. The main reference is the day-ahead market (DAM), where bids are matched for each delivery period on the following day. Because supply and demand shift constantly, prices can vary significantly throughout the day, with peaks during high demand and lows when consumption drops or renewable output is strong.

To compare across such volatile prices, analysts often reference the **baseload price** — the average day-ahead price across all intervals in a day. It serves as a benchmark for what a generator running continuously would earn.

## Baseload electricity prices

```js
const selectCountries = view(Inputs.checkbox(
  [...countries.keys()],
  {label: "Select countries to show", value: [...countries.keys()]}
))
```

```js
Plot.plot({
  title: "Baseload electricity prices in Ukraine and neighbouring EU markets",
  subtitle: "Monthly averages and trend",
  caption: "Sources: ENTSO-E, Market Operator JSC",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {label: null},
  y: {nice: true, grid: true, label: "EUR / MWh"},
  color: {legend: true},
  marks: [
    Plot.dot(
      monthly_baseload.filter(d => d.date >= new Date("2023-01-01") && selectCountries.includes(d.country)),
      {x: "date", y: "price", r: 2, stroke: d => countries.get(d.country), strokeOpacity: 0.4, tip: true}
    ),
    Plot.line(
      baseload_smooth.filter(d => d.date >= new Date("2023-01-01") && selectCountries.includes(d.country)),
      {
        x: "date", y: "price",
        stroke: d => countries.get(d.country),
        strokeWidth: d => d.country == "UA" ? 2 : 1.5,
        curve: "catmull-rom",
      }
    ),
  ],
})
```

Since mid-2023, Ukraine's average baseload prices have moved broadly in line with those in neighbouring EU markets. However, daily and monthly averages mask the significant intraday volatility. While hourly price variation has increased across all markets, the effect is most pronounced in Ukraine, driven by unprecedented Russian attacks on energy infrastructure and the resulting loss of flexible generation capacity, which in turn has created acute shortages during peak hours.

```js
Plot.plot({
  title: "Hourly variation of electricity prices",
  subtitle: "Monthly median price for each hour relative to the daily average",
  caption: "Sources: ENTSO-E, Market Operator JSC",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {line: true, label: "hour of day"},
  y: {nice: true, grid: true, tickFormat: d3.format(".0%")},
  fx: {label: null},
  color: {legend: true},
  marks: [
    Plot.lineY(
      prices_relative.filter(d => selectCountries.includes(d.country)),
      {x: "hour", y: "price", fx: d => countries.get(d.country), stroke: "year", curve: "catmull-rom", tip: true}
    ),
  ],
})
```

## Renewable price capture

For renewables like solar and wind, what matters in addition to the baseload price is the **capture factor** — the technology's weighted average price, calculated over the hours when it actually generates, weighted by the volume produced in each hour. A capture factor >100% means the technology generates when prices are above baseload (favourable). A capture factor <100% signals that production is concentrated in lower-priced hours, reducing revenue potential.

```js
Plot.plot({
  title: "Renewable price capture in Ukraine vs neighbouring EU markets",
  subtitle: "Level of 100% represents the baseload price",
  caption: "Sources: ENTSO-E, Market Operator JSC, Guaranteed Buyer",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {label: null, ticks: 4},
  y: {nice: true, grid: true, tickFormat: d3.format(".0%")},
  fx: {label: null, fontWeight: "bold"},
  color: {
    domain: ["Solar", "Wind onshore"],
    range: ["#f59e0b", "#3b82f6"],
    legend: true,
  },
  marks: [
    Plot.dot(
      capture_monthly.filter(d => selectCountries.includes(d.country)),
      {x: "date", y: "cap_factor", r: 2, fx: d => countries.get(d.country), stroke: "tech", strokeOpacity: 0.4, tip: true}
    ),
    Plot.line(
      capture_monthly_smooth.filter(d => selectCountries.includes(d.country)),
      {x: "date", y: "value", fx: d => countries.get(d.country), stroke: "tech", strokeWidth: 2, curve: "catmull-rom"}
    ),
    Plot.ruleY([1], {strokeDasharray: "2,2"}),
  ],
})
```

Capture factors for solar and wind in Ukraine are broadly in line with EU trends. A clear pattern is the decline in solar capture factors as PV penetration rises: peak solar hours increasingly align with lower wholesale prices, pushing realised revenues below baseload. This is the well-known **"cannibalisation effect"** — high simultaneous solar output depresses prices in the very hours when solar generates most. Solar price capture is lowest in the summer, when generation is at its highest.

For now, wind capture factors are more resilient in both Ukraine and the EU, thanks to more diverse and less peaked generation profiles and less overlap with low-price periods.

## Seasonal patterns

```js
Plot.plot({
  title: "Seasonal variation in capture factors",
  subtitle: "Median of daily price capture",
  caption: "Sources: ENTSO-E, Market Operator JSC, Guaranteed Buyer",
  marginLeft: 50,
  marginRight: 80,
  width: Math.min(width, 800),
  height: 400,
  x: {ticks: [1, 4, 7, 10], tickFormat: d => d3.utcFormat("%b")(new Date(2000, d)), label: "month of year"},
  y: {nice: true, grid: true, tickFormat: d3.format(".0%")},
  fx: {label: null, fontWeight: "bold"},
  fy: {label: null},
  color: {legend: true},
  marks: [
    Plot.ruleY([1], {strokeDasharray: "2,2"}),
    Plot.dot(
      capture_seas.filter(d => selectCountries.includes(d.country)),
      {x: "month", y: "cap_factor", r: 2, fx: d => countries.get(d.country), fy: "tech", stroke: "year", strokeOpacity: 0.3, tip: true}
    ),
    Plot.line(
      capture_seas_smooth.filter(d => selectCountries.includes(d.country)),
      {x: "month", y: "value", fx: d => countries.get(d.country), fy: "tech", stroke: "year", curve: "catmull-rom"}
    ),
  ],
})
```

## Ukraine: the 2022 price cap anomaly

A notable point is that in 2022, Ukraine's solar capture factor stood ~20% above baseload, an unusually high premium by EU market standards. This likely reflected the impact of price caps, which created a narrow two-tier pricing structure: a higher daytime range (coinciding with solar output) and a lower night-time range. This setup pushed the solar capture factor above 100%, creating a temporary premium. After the shift to wider caps from July 2023, with minimum prices close to zero, this anomaly disappeared.

```js
Plot.plot({
  title: "Hourly variation of electricity prices in Ukraine",
  subtitle: "Median hourly DAM price as % of daily average",
  caption: "Sources: Market Operator JSC",
  marginLeft: 50,
  marginRight: 30,
  width: Math.min(width, 800),
  height: 300,
  x: {line: true, label: "hour of day"},
  y: {nice: true, tickFormat: d3.format(".0%")},
  color: {type: "ordinal", scheme: "Observable10", legend: true},
  marks: [
    Plot.ruleY([1], {strokeDasharray: "2,2"}),
    Plot.lineY(
      prices_relative.filter(d => d.country == "UA"),
      {x: "hour", y: "price", stroke: "year", curve: "catmull-rom", tip: true}
    ),
    Plot.arrow([{x1: 12, y1: 1.6, x2: 14, y2: 1.25}], {
      x1: "x1", y1: "y1", x2: "x2", y2: "y2",
      stroke: "grey", strokeWidth: 1.5, bend: 20,
    }),
    Plot.text([{x: 12, y: 1.6, label: "flat two-tier pricing in 2022"}], {
      x: "x", y: "y", text: "label", dy: -10, fontSize: 14, fill: "grey",
    }),
    Plot.arrow([{x1: 15, y1: 0.5, x2: 13, y2: 0.5}], {
      x1: "x1", y1: "y1", x2: "x2", y2: "y2",
      stroke: "grey", strokeWidth: 1.5, bend: 20,
    }),
    Plot.arrow([{x1: 19, y1: 0.6, x2: 20, y2: 1.4}], {
      x1: "x1", y1: "y1", x2: "x2", y2: "y2",
      stroke: "grey", strokeWidth: 1.5, bend: 20,
    }),
    Plot.text([{x: 19, y: 0.45, label: "increasing daily variation from 2023"}], {
      x: "x", y: "y", text: "label", dy: -10, fontSize: 14, fill: "grey",
    }),
  ],
})
```

```js
const cap_dates = ["2022-02-28", "2023-07-01"]
const caps = price_cap
  .filter(d => system.includes(d.energy_system))
  .filter(d => cap_dates.includes(d.date.toISOString().slice(0, 10)))
```

```js
Plot.plot({
  title: "Electricity price caps in Ukraine",
  caption: "Sources: Energy Map, Market Operator JSC",
  marginLeft: 50,
  marginRight: 100,
  width: Math.min(width, 800),
  height: 300,
  x: {line: true, label: "hour of day"},
  y: {nice: true, label: "UAH / MWh", tickFormat: d3.format(".0f")},
  color: {
    range: d3.schemeYlGnBu[5],
    type: "ordinal",
    legend: true,
    label: "Date",
    tickFormat: d3.utcFormat("%Y"),
  },
  marks: [
    Plot.areaY(caps, {
      x: d => d.hour,
      y1: "price_min",
      y2: "price_max",
      fill: "date",
      stroke: "lightgrey",
      reverse: true,
      curve: "step-before",
      tip: true,
    }),
    Plot.arrow([{x1: 4, y1: 4000, x2: 6.8, y2: 3500}], {
      x1: "x1", y1: "y1", x2: "x2", y2: "y2",
      stroke: "grey", strokeWidth: 1.5, bend: -20,
    }),
    Plot.text([{x: 4, y: 4000, label: "narrow corridor in 2022"}], {
      x: "x", y: "y", text: "label", dy: -10, fontSize: 14, fill: "grey",
    }),
    Plot.arrow([{x1: 16, y1: 7500, x2: 14, y2: 5700}], {
      x1: "x1", y1: "y1", x2: "x2", y2: "y2",
      stroke: "grey", strokeWidth: 1.5, bend: -20,
    }),
    Plot.text([{x: 16, y: 7500, label: "wider price caps introduced from July 2023"}], {
      x: "x", y: "y", text: "label", dy: -10, fontSize: 14, fill: "grey",
    }),
    Plot.ruleY([0]),
  ],
})
```

This notebook updates automatically based on the most recently available data. Data and code are available on [GitHub](https://github.com/atsokol/res-yield-data).

---

## Annex: calculations

```js
const system = ["ОЕС України", "ОЕС України (синхронізована з ENTSO-E)"]
```

#### Wind and solar price capture

```js
// Processed capture factors — from data_output/
const capture_daily = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_output/capture_factors_daily.csv",
  d3.autoType
).then(data => data.filter(d => d.country !== "NA"))
```

```js
const capture_monthly = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_output/capture_factors_monthly.csv",
  d3.autoType
).then(data => data.filter(d => d.country !== "NA"))
```

```js
const capture_seas = capture_monthly.map(d => ({
  ...d,
  month: d.date.getUTCMonth(),
  year: d.date.getFullYear().toString(),
}))
```

```js
const bw1 = view(Inputs.range([0, 1], {label: "Select smoothing bandwidth", step: 0.05, value: 0.6}))
```

```js
const regGen1 = d3reg.regressionLoess()
  .x(d => d.date)
  .y(d => d.cap_factor)
  .bandwidth(bw1)
```

```js
const capture_monthly_grouped = d3.group(capture_monthly, d => d.country, d => d.tech)
const capture_monthly_smooth = Array.from(capture_monthly_grouped, ([country, techMap]) =>
  Array.from(techMap, ([tech, rows]) => {
    rows.sort((a, b) => d3.ascending(a.x, b.x));
    return regGen1(rows).map(([x, y]) => ({date: x, value: y, country, tech}));
  })
).flat(2)
```

```js
const regGen2 = d3reg.regressionLoess()
  .x(d => d.month)
  .y(d => d.cap_factor)
  .bandwidth(bw1)
```

```js
const capture_seas_grouped = d3.group(capture_seas, d => d.country, d => d.tech, d => d.year)
const capture_seas_smooth = Array.from(capture_seas_grouped, ([country, techMap]) =>
  Array.from(techMap, ([tech, yearMap]) =>
    Array.from(yearMap, ([year, rows]) => {
      rows.sort((a, b) => d3.ascending(a.month, b.month));
      return regGen2(rows).map(([x, y]) => ({month: x, value: y, country, tech, year}));
    })
  )
).flat(3)
```

#### Electricity price data

```js
const bw2 = view(Inputs.range([0, 1], {label: "Select smoothing bandwidth", step: 0.05, value: 0.2}))
```

```js
const regGen3 = d3reg.regressionLoess()
  .x(d => d.date)
  .y(d => d.price)
  .bandwidth(bw2)
```

```js
const baseload_grouped = d3.group(daily_baseload, d => d.country)
const baseload_smooth = Array.from(baseload_grouped, ([country, rows]) => {
  rows.sort((a, b) => d3.ascending(a.x, b.x));
  return regGen3(rows).map(([x, y]) => ({date: new Date(x), price: y, country}));
}).flat()
```

```js
const monthly_baseload = d3.flatRollup(
  daily_baseload.map(d => ({
    ...d,
    month: new Date(Date.UTC(d.date.getFullYear(), d.date.getUTCMonth(), 1)),
  })),
  v => d3.mean(v, d => d.price),
  d => d.country,
  d => d.month
).map(([country, date, price]) => ({country, date, price}))
```

```js
const daily_baseload_map = d3.rollup(
  prices_hourly,
  v => d3.mean(v, d => d.price_eur),
  d => d.country,
  d => d.date
)
const daily_baseload = Array.from(daily_baseload_map, ([country, dateMap]) =>
  Array.from(dateMap, ([date, price]) => ({country, date: new Date(date), price}))
).flat()
```

```js
const prices_with_year = prices_hourly.map(d => ({
  ...d,
  year: new Date(d.date).getFullYear().toString(),
}))
const daily_avg = d3.rollup(prices_with_year, v => d3.mean(v, d => d.price_eur), d => d.country, d => d.year, d => d.date)
const prices_with_relative = prices_with_year.map(d => ({
  ...d,
  price_relative: d.price_eur / daily_avg.get(d.country)?.get(d.year)?.get(d.date),
}))
const prices_relative_map = d3.rollup(prices_with_relative, v => d3.median(v, d => d.price_relative), d => d.country, d => d.year, d => d.hour)
const prices_relative = Array.from(prices_relative_map, ([country, yearMap]) =>
  Array.from(yearMap, ([year, hourMap]) =>
    Array.from(hourMap, ([hour, price]) => ({country, year, hour, price}))
  )
).flat(2)
```

```js
const prices_hourly = [
  ...priceUA.map(d => ({
    country: d.country,
    date: d.hour.toISOString().split("T")[0],
    hour: d.hour.getUTCHours(),
    price_eur: d.price_eur_mwh,
  })),
  ...priceEU.map(d => ({
    country: d.country,
    date: d.hour.toISOString().split("T")[0],
    hour: d.hour.getUTCHours(),
    price_eur: d.price_eur,
  })),
]
```

#### Wind and solar yield data

```js
// Raw yield data — from data_raw/
const wind_yield_UA = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/yield_wind_UA.csv",
  row => ({
    date: d3.utcParse("%Y-%m-%d")(row.date),
    hour: +row.hour,
    actual: +row.actual > 0 ? +row.actual : 0,
    projected: +row.projected > 0 ? +row.projected : 0,
  })
)
```

```js
const solar_yield_UA = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/yield_solar_UA.csv",
  row => ({
    date: d3.utcParse("%Y-%m-%d")(row.date),
    hour: +row.hour,
    actual: +row.actual > 0 ? +row.actual : 0,
    projected: +row.projected > 0 ? +row.projected : 0,
  })
)
```

```js
// Raw DAM prices — from data_raw/
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
const price_cap = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/UA%20price%20caps.csv",
  d3.autoType
)
```

#### Import libraries

```js
import * as d3reg from "npm:d3-regression"
```

```js
import {countries} from "./components/countries.js"
```
