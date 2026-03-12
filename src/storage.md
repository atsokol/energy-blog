---
title: Economics of energy storage in Ukraine
---

# Economics of energy storage in Ukraine

Ukraine's energy system is operating under extreme stress. Repeated russian attacks on generation and grid infrastructure have made the system highly sensitive to shocks, increasing the risk of outages and forcing rapid rebalancing. As a result, intraday electricity prices fluctuate sharply as the system responds to sudden changes in supply and demand.

```js
Plot.plot({
  title: "Increasing intra-day price volatility on the day-ahead market (DAM)",
  subtitle: "Median and P10-P90 range",
  caption: "Market Operator JSC",
  marginLeft: 50,
  marginRight: 30,
  width: 800,
  height: 300,
  x: { line: true, label: "hour of day" },
  y: { nice: true, grid: true, label: "EUR / MWh" },
  fx: { label: null },
  color: { legend: true },
  marks: [
    Plot.areaY(prices_DAM_quantiles, {
      x: "hour",
      y1: "p10",
      y2: "p90",
      fx: "year",
      curve: "catmull-rom",
      fill: "#bae4bc",
      fillOpacity: 0.4,
    }),
    Plot.lineY(prices_DAM_quantiles, {
      x: "hour",
      y: "p50",
      fx: "year",
      stroke: "steelblue",
      strokeWidth: 2,
      curve: "catmull-rom",
      tip: true,
    }),
  ],
})
```

In this environment, flexibility becomes crucial. Energy storage can shift power from surplus to deficit hours and respond rapidly during stress events, helping keep the system balanced. Storage earns revenues from two main sources: (1) **energy arbitrage** from moving electricity from low-priced to high-priced hours either through owner-controlled dispatch in the day-ahead or intraday markets, or through system-operator-controlled activations in the balancing market; and (2) **availability revenues**, paid by the system operator in exchange for keeping capacity ready to respond, providing a stable and recurring income stream.

The figure below illustrates the **day-ahead market (DAM) arbitrage** using the **TB4 (top-4 / bottom-4)** measure. TB4 is calculated as the difference between the average price of the four most expensive hours (typically the evening peak) and the average price of the four cheapest hours (often at night or mid-day), capturing the price spread.

```js
const selectedDate = view(Inputs.date({label: "Select date", value: lastDayPrevMonth}))
```

```js
const selectedCountry = view(Inputs.select(
  ["UA", "HU", "PL", "RO", "SK"],
  {label: "Select country", value: "UA", format: x => countries.get(x)}
))
```

```js
const storageDuration = view(Inputs.range([2, 8], {label: "Storage duration, hours", step: 2, value: 4}))
```

```js
(() => {
  const sorted = [...hourly_prices_for_date].sort((a, b) => a.price_dam - b.price_dam);
  const bottom = sorted.slice(0, storageDuration);
  const bottom_avg = d3.mean(bottom.map(d => d.price_dam));
  const top = sorted.slice(-storageDuration);
  const top_avg = d3.mean(top.map(d => d.price_dam));

  return Plot.plot({
    title: `Illustration of arbitrage on the day-ahead market - ${countries.get(selectedCountry)}`,
    subtitle: new Date(selectedDate).toLocaleDateString("en-US", {year: "numeric", month: "long", day: "numeric"}),
    caption: "Source: ENTSO-E, Market Operator JSC",
    marginLeft: 60,
    width: 800,
    height: 300,
    x: {label: "Hour of Day", domain: [0, 24], ticks: 24},
    y: {label: "Price (EUR/MWh)", grid: true, domain: [-30, 320]},
    marks: [
      Plot.rect([{x1: 0, x2: 24, y1: bottom_avg, y2: top_avg}], {
        x1: "x1", x2: "x2", y1: "y1", y2: "y2",
        fill: "lightyellow", fillOpacity: 0.3,
      }),
      Plot.ruleY([bottom_avg], {stroke: "red", strokeDasharray: "4,4"}),
      Plot.ruleY([top_avg], {stroke: "green", strokeDasharray: "4,4"}),
      Plot.link([{x: 1, y1: bottom_avg, y2: top_avg}], {
        x: 12, y1: "y1", y2: "y2",
        stroke: "gray", strokeWidth: 1.5,
        markerStart: "arrow-reverse", markerEnd: "arrow",
      }),
      Plot.text([{x: 12, y: (bottom_avg + top_avg) / 2, label: `TB${storageDuration}`}], {
        x: "x", y: "y", text: "label",
        textAnchor: "start", dx: 5, fill: "currentColor", fontSize: 14,
      }),
      Plot.lineY(hourly_prices_for_date, {
        x: "hour", y: "price_dam",
        stroke: "steelblue", strokeWidth: 2, curve: "step-after",
      }),
      Plot.ruleY(top, {
        x1: "hour", x2: d => d.hour + 1, y: d => d.price_dam,
        stroke: "green", strokeWidth: 4, tip: true,
      }),
      Plot.ruleY(bottom, {
        x1: "hour", x2: d => d.hour + 1, y: d => d.price_dam,
        stroke: "red", strokeWidth: 4, tip: true,
      }),
      Plot.text([{x: 12, y: top_avg, label: `average of top ${storageDuration} hours`}], {
        x: "x", y: "y", text: "label", dy: -15, fill: "currentColor", fontSize: 14,
      }),
      Plot.text([{x: 12, y: bottom_avg, label: `average of bottom ${storageDuration} hours`}], {
        x: "x", y: "y", text: "label", dy: 15, fill: "currentColor", fontSize: 14,
      }),
    ],
  });
})()
```

The next figure shows the evolution of TB4 measure for Ukraine's day-ahead market over time. Each dot represents the daily price spread, while the moving average highlights the trend in arbitrage opportunities on the day-ahead market.

```js
const startDate = view(Inputs.date({label: "Select start date", value: "2024-01-01"}))
```

```js
(() => {
  const data_filt = arbitrage_revenues
    .filter(d => d.date >= new Date(startDate))
    .filter(d => d.country == "UA");

  return Plot.plot({
    title: "Energy arbitrage potential in Ukraine",
    subtitle: `Daily top-${storageDuration} / bottom-${storageDuration} spreads on the day-ahead market, ${windowSize}-day moving average`,
    caption: "Source: Market Operator JSC",
    marginLeft: 50,
    marginRight: 50,
    width: 800,
    height: 300,
    x: {line: true, label: null},
    y: {nice: true, grid: true, label: "EUR / MWh / day"},
    marks: [
      Plot.dot(data_filt, {
        x: "date", y: "value",
        stroke: d => countries.get(d.country),
        r: 2, strokeOpacity: 0.3, tip: true,
      }),
      Plot.lineY(data_filt, {
        x: "date", y: "ma",
        stroke: d => countries.get(d.country),
        strokeWidth: 2,
      }),
    ],
  });
})()
```

Comparing Ukraine against neighbouring EU markets highlights shared regional drivers. However, from H2 2025 a clear divergence emerges: Ukraine's spreads rise sharply, exceeding EUR 200/MWh/day, while neighbouring EU markets remain within a lower cyclical range.

```js
const windowSize = view(Inputs.range([30, 90], {value: 60, step: 30, label: "Select moving average window (days)"}))
```

```js
Plot.plot({
  title: `Arbitrage potential in Ukraine vs. EU countries`,
  subtitle: `Daily top-${storageDuration} / bottom-${storageDuration} spreads on the day-ahead market, ${windowSize}-day moving average`,
  caption: "Source: ENTSO-E, Market Operator JSC",
  marginLeft: 50,
  marginRight: 30,
  width: 800,
  height: 300,
  x: {line: true, label: null},
  y: {nice: true, grid: true, label: "EUR / MWh"},
  color: {legend: true},
  marks: [
    Plot.lineY(arbitrage_revenues.filter(d => d.date >= new Date(startDate)), {
      x: "date", y: "ma",
      stroke: d => countries.get(d.country),
      strokeWidth: d => d.country == "UA" ? 2.5 : 1.5,
      tip: true,
    }),
  ],
})
```

One important feature of Ukraine's electricity market is the strong influence of regulated price caps. As the figure shows, market prices frequently hit both the upper and lower caps, especially during periods of system stress or oversupply. This means that observed prices are often constrained by regulation rather than pure supply–demand balance, and the true intrinsic value of storage is likely higher.

```js
(() => {
  const price_day = aq.from(priceUA.filter(d => d.date >= new Date(startDate)))
    .groupby("date")
    .rollup({
      price_min: d => op.min(d.price_uah),
      price_max: d => op.max(d.price_uah),
      price_avg: d => op.mean(d.price_uah),
    })
    .orderby("date")
    .fold(["price_min", "price_max", "price_avg"], {as: ["type", "price"]});

  const cap_day = aq.from(price_cap.filter(d => d.date >= new Date(startDate)))
    .groupby("date")
    .rollup({
      price_min: d => op.min(d.price_min),
      price_max: d => op.max(d.price_max),
    });

  const vars = new Map([
    ["price_avg", "average"],
    ["price_min", "min"],
    ["price_max", "max"],
  ]);

  return Plot.plot({
    title: "Electricity prices vs caps on the day-ahead market in Ukraine",
    caption: "Sources: Market Operator JSC",
    marginLeft: 50,
    marginRight: 60,
    width: 800,
    height: 300,
    x: {line: true, label: null},
    y: {nice: true, grid: true, label: "UAH / MWh"},
    color: {legend: true},
    marks: [
      Plot.areaY(cap_day, {
        x: "date", y1: "price_min", y2: "price_max",
        curve: "step-after", fill: "#bae4bc", fillOpacity: 0.4,
      }),
      Plot.dot(price_day, {
        x: "date", y: "price",
        stroke: d => vars.get(d.type),
        r: 2, strokeOpacity: 0.3, tip: true,
      }),
    ],
  });
})()
```

The **balancing market (BM)** also presents arbitrage opportunities. The figure below shows volume-weighted price spreads between the day-ahead and balancing markets, separately for downward regulation (excess supply) and upward regulation (supply deficit). It points to growing opportunities in the balancing market and cross-market arbitrage as an additional source of revenue, complementing the trading on the day-ahead markets.

```js
(() => {
  const regGen1 = d3reg.regressionLoess()
    .x(d => d.date)
    .y(d => d.spread)
    .bandwidth(bandwidth);

  const spread_trend = Array.from(
    d3.group(spread_BM_DAM_daily, d => d.direction),
    ([direction, rows]) => {
      rows.sort((a, b) => d3.ascending(a.x, b.x));
      return regGen1(rows).map(([x, y]) => ({date: x, value: y, direction}));
    }
  ).flat();

  return Plot.plot({
    title: "Price spreads between balancing (BM) and day-ahead (DAM) markets - Ukraine",
    subtitle: "Volume-weighted daily average spreads",
    caption: "Source: Ukrenergo, Market Operator JSC",
    marginLeft: 50,
    marginRight: 50,
    width: 800,
    height: 300,
    x: {line: true, label: null},
    y: {nice: true, grid: true, label: "EUR / MWh"},
    fx: {label: null},
    color: {legend: true},
    marks: [
      Plot.dot(spread_BM_DAM_daily, {
        x: "date", y: "spread", fx: "direction",
        stroke: "direction", r: 2, strokeOpacity: 0.2, tip: true,
      }),
      Plot.lineY(spread_trend, {
        x: "date", y: "value", fx: "direction",
        stroke: "direction", strokeWidth: 2.5,
      }),
    ],
  });
})()
```

One of the largest balancing needs today is associated with absorbing excess energy during periods of strong solar generation (mid-day) and low demand (night-time). Data shows that downward regulation volumes are higher and more concentrated than upward regulation pointing to a growing role of energy storage in absorbing surplus electricity during predictable oversupply windows, reducing curtailment and alleviating balancing pressure, while positioning storage to later discharge during deficit hours.

```js
const selectYear = view(Inputs.checkbox(["2022", "2023", "2024", "2025"], {label: "Select years", value: ["2024", "2025"]}))
```

```js
(() => {
  const spread_year = spread_BM_DAM_hourly.map(d => ({
    ...d,
    year: new Date(d.date).getFullYear().toString(),
  }));

  const data = d3.flatRollup(
    spread_year.filter(d => selectYear.includes(d.year)),
    v => d3.median(v, d => d.volume_bm),
    d => d.year,
    d => d.hour,
    d => d.direction,
  ).map(([year, hour, direction, volume]) => ({year, hour, direction, volume}));

  return Plot.plot({
    title: "Volumes traded on the balancing market - Ukraine",
    caption: "Source: Ukrenergo",
    subtitle: "Median hourly volumes by year",
    marginLeft: 50,
    marginRight: 30,
    width: 800,
    height: 300,
    x: {line: true, label: "hour of day"},
    y: {nice: true, grid: true, label: "MWh / hour / day"},
    fx: {label: null},
    color: {legend: true},
    marks: [
      Plot.lineY(data, {
        x: "hour", y: "volume", fx: "direction",
        stroke: "year", curve: "catmull-rom", tip: true,
      }),
    ],
  });
})()
```

This analysis focuses on market-level price signals (TB4 and BM-DAM spreads) as indicators of economic opportunity for energy storage, rather than on project-specific revenues. Translating these spreads into bankable cashflows requires a dispatch model that incorporates state-of-charge constraints, round-trip efficiency, market participation rules, etc. The results should be interpreted as a directional assessment of how storage value in Ukraine has evolved relative to neighbouring markets, not as a project-level revenue forecast.

---

## Calculations annex

#### Aggregate and transform data

```js
const lastDayPrevMonth = (() => {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
    .toISOString()
    .split("T")[0];
})()
```

```js
const bandwidth = view(Inputs.range([0, 0.3], {label: "Select smoothing bandwidth", step: 0.02, value: 0.1}))
```

```js
const arbitrage_revenues = (() => {
  let sorted = aq.from(prices_hourly_DAM)
    .params({storageDuration: storageDuration})
    .groupby("country", "date")
    .orderby("date", "price_dam");

  let bottom = sorted
    .slice(0, storageDuration)
    .rollup({bottom: op.sum("price_dam")});

  let top = sorted
    .slice(-storageDuration)
    .rollup({top: op.sum("price_dam")});

  return top
    .join(bottom)
    .derive({value: d => (d.top - d.bottom) / storageDuration})
    .groupby("country")
    .orderby("country", "date")
    .derive({
      ma: aq.rolling(op.mean("value"), [-(windowSize - 1), 0]),
    })
    .objects();
})()
```

```js
const hourly_prices_for_date = (() => {
  const filtered = prices_hourly_DAM
    .filter(d =>
      d.date.getTime() === new Date(selectedDate).getTime() &&
      d.country === selectedCountry
    )
    .sort((a, b) => a.hour - b.hour);

  if (filtered.length > 0) {
    const lastHour = filtered[filtered.length - 1];
    filtered.push({...lastHour, hour: 24});
  }
  return filtered;
})()
```

```js
const spread_BM_DAM_hourly = aq.from(
  prices_hourly_BM.map(d => ({
    ...d,
    spread_eur: d.direction === "up"
      ? d.price_bm_eur - d.price_dam_eur
      : d.price_dam_eur - d.price_bm_eur,
  }))
).objects()
```

```js
const spread_BM_DAM_daily = aq.from(spread_BM_DAM_hourly)
  .groupby("date", "direction")
  .rollup({spread: d => op.sum(d.spread_eur * d.volume_bm) / op.sum(d.volume_bm)})
  .objects()
```

#### Electricity price data

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
// Balancing market — from data_raw/ (note: geo-blocked, updated locally)
const prices_hourly_BM = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/BM_UA.csv",
  d3.autoType
)
```

```js
const price_cap = await d3.csv(
  "https://raw.githubusercontent.com/atsokol/energy-data-ua-eu/refs/heads/main/data/data_raw/UA%20price%20caps.csv",
  d3.autoType
).then(data =>
  data.filter(d =>
    ["ОЕС України", "ОЕС України (синхронізована з ENTSO-E)"].includes(d.energy_system)
  )
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
const prices_DAM_quantiles = aq.from(
  prices_hourly_DAM
    .filter(d => d.country === "UA")
    .map(d => ({...d, year: String(d.date.getFullYear())}))
)
  .groupby("hour", "year")
  .rollup({
    p50: d => op.median(d.price_dam),
    p10: d => op.quantile(d.price_dam, 0.1),
    p90: d => op.quantile(d.price_dam, 0.9),
  })
  .orderby("year", "hour")
  .objects()
```

#### Import libraries

```js
import * as aq from "npm:arquero"
import {op} from "npm:arquero"
```

```js
import * as d3reg from "npm:d3-regression"
```

```js
import {countries} from "./components/countries.js"
```
