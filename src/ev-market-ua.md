---
title: EV market in Ukraine
---

# EV market in Ukraine

```js
import {Treemap} from "./components/treemap.js"
import * as aq from "npm:arquero"
import {op} from "npm:arquero"
// import {fetchp} from "npm:@tomlarkworthy/fetchp"
```

```js
const ukr_cars = await d3.csv("https://raw.githubusercontent.com/atsokol/ukraine-EV-data-update/main/output-data/Ukraine_cars.csv", d3.autoType);

const ev_cars = await d3.csv("https://raw.githubusercontent.com/atsokol/ukraine-EV-data-update/main/output-data/Ukraine_EV_cars.csv", d3.autoType);

const CEE = ["Bulgaria","Croatia","Czech Republic","Estonia","Hungary","Latvia","Lithuania","Poland","Romania","Slovakia","Slovenia"];

const ukr_m1 = 12000000
```

<!-- fetchp blocks commented out until package is available
```js
const EU_share = await fetchp(
    "https://alternative-fuels-observatory.ec.europa.eu/sites/default/files/csv/european-union-eu27/market_share_of_new_af_passenger_car_and_van_registrations_m1_n1.csv?token=1764150777",
    { method: "GET" })
  .then(response => response.text())
  .then(text => d3.csvParse(text, d => ({
      Country: d.Country,
      BEV: +d.BEV,
      PHEV: +d.PHEV})))
  .then(data => data.filter(d => CEE.includes(d.Country))
        .map(d => ({Country: d.Country, BEV: d.BEV / 100, BEV_PHEV: (d.BEV + d.PHEV) / 100})))

const EU_fleet = await fetchp(
    "https://alternative-fuels-observatory.ec.europa.eu/sites/default/files/csv/european-union-eu27/fleet_overview_of_af_passenger_cars_and_vans_m1_n2.csv?token=1764150777",
    { method: "GET" })
  .then(response => response.text())
  .then(text => d3.csvParse(text, d => ({
      Country: d.Country,
      BEV: +d.BEV,
      PHEV: +d.PHEV})))
  .then(data => data.filter(d => CEE.includes(d.Country))
        .map(d => ({Country: d.Country, BEV: d.BEV, BEV_PHEV: (d.BEV + d.PHEV)})))

const EU_fleet_share = await fetchp(
    "https://alternative-fuels-observatory.ec.europa.eu/sites/default/files/csv/european-union-eu27/fleet_percentage_of_passenger_car_and_van_total_fleet_m1_n1.csv?token=1764150777",
    { method: "GET" })
  .then(response => response.text())
  .then(text => d3.csvParse(text, d => ({
      Country: d.Country,
      BEV: +d.BEV,
      PHEV: +d.PHEV})))
  .then(data => data.filter(d => CEE.includes(d.Country))
        .map(d => ({Country: d.Country, BEV: d.BEV / 100, BEV_PHEV: (d.BEV + d.PHEV) / 100})))
```
-->

```js
const ukr_cars_cum = aq.from(ukr_cars.map(d => ({...d, year: d.date.getFullYear()})))
  .filter(d => d.fuel !== "ICE")
  .groupby("fuel", "year")
  .rollup({count: d => op.sum(d.count)})
  .groupby('fuel')
  .derive({count_cum: aq.rolling(d => op.sum(d.count)) })
  .orderby("year", "fuel")
  .objects()
```

<br>

📈 EVs are taking a rapidly growing share of the car market in Ukraine

```js
(() => {
  const chart1 = Plot.plot({
    title: "...of which BEV and PHEV",
    width: Math.min(width, 800),
    height: 300,
    y: {grid: true},
    marginLeft: 50,
    color: {range: ['#59A14F','steelblue'], legend: true},
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(
        ukr_cars,
        Plot.binX(
          { y: "sum" },
          { x: "date",
            y: "count",
            filter: d => d.fuel !== "ICE" ? d.fuel : null,
            stroke: "fuel",
            interval: "1 month",
            curve: "catmull-rom",
            tip: {format: {x: d => d3.utcFormat("%b %Y")(d)}}
          }
        )
      )
    ]
  })

  const chart2 = Plot.plot({
    title: "First-time car registrations: Ukraine",
    width: Math.min(width, 800),
    marginLeft: 50,
    height: 300,
    y: {grid: true},
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(
        ukr_cars,
        Plot.binX(
          { y: "sum" },
          { x: "date", y: "count",
           stroke: "#9d5bf3", interval: "1 month",
           curve: "catmull-rom",
          tip: {format: {x: d => d3.utcFormat("%b %Y")(d)}}
          }
        )
      )
    ]
  })

  return html`${chart2}${chart1}`;
})()
```

<br>

📊 Ukraine stands out with a substantially higher EV share in car sales (25%) compared to its CEE peers (5-10%). To a large extent, this is driven by VAT and import duty exemptions for BEVs in Ukraine, which are due to expire in 2025.

```js
(() => {
  const ev_share = aq.from(ukr_cars.map(d => ({...d, year: d.date.getFullYear()})))
    .groupby("fuel", "date")
    .rollup({count: d => op.sum(d.count)})
    .groupby("date")
    .pivot("fuel", "count")
    .derive({BEV: d => d.BEV === undefined ? 0 : d.BEV})
    .derive({BEV_PHEV_share: d => (d.BEV + d.PHEV) / (d.BEV + d.PHEV + d.ICE),
             BEV_share: d => d.BEV / (d.BEV + d.PHEV + d.ICE),
            })
    .fold(['BEV_PHEV_share', 'BEV_share'])
    .objects()

  const legendMap = {
    BEV_share: "BEV",
    BEV_PHEV_share: "BEV+PHEV"
  }

  return Plot.plot({
    title: "EV share in first-time registrations: Ukraine",
    width: Math.min(width, 800),
    height: 300,
    y: {grid: true, tickFormat: d3.format(".0%"), label: "percentage"},
    color: {range: ["steelblue", "#59A14F"],
            legend: true,
            tickFormat: d => legendMap[d]
           },
    marginLeft: 50,
    marks: [
      Plot.ruleY([0]),
      Plot.lineY(ev_share, {
        x: "date",
        y: "value",
        interval: "1 month",
        curve: "catmull-rom",
        stroke: "key",
        tip: {format: {x: d => d3.utcFormat("%b %Y")(d)}}
      })
    ]
  })
})()
```

<!-- EU comparison charts commented out (depend on fetchp data)
```js
(() => {
  const Ukr_share = aq.from(ukr_cars.map(d => ({...d, year: d.date.getFullYear()})))
    .groupby("fuel", "year")
    .rollup({count: d => op.sum(d.count)})
    .groupby("year")
    .pivot("fuel", "count")
    .derive({BEV: d => d.BEV === undefined ? 0 : d.BEV})
    .derive({BEV_PHEV: d => (d.BEV + d.PHEV) / (d.BEV + d.PHEV + d.ICE),
             BEV: d => d.BEV / (d.BEV + d.PHEV + d.ICE),
            })
    .filter(d => d.year == d3.max(d.year))
    .objects()

  const All_share = aq.from([
    ...Ukr_share.map(d => ({Country: "Ukraine", BEV: d.BEV, BEV_PHEV: d.BEV_PHEV})),
    ...EU_share
  ])
    .fold(['BEV_PHEV', 'BEV'])
    .objects()

  const legendMap = {
    BEV: "BEV",
    BEV_PHEV: "BEV+PHEV"
  }

  return Plot.plot({
    title: `EV share in first-time registrations: Ukraine vs. CEE in ${d3.max(Ukr_share.map(d => d.year))}`,
    marginLeft: 90,
    marginRight: 50,
    x: { axis: null},
    y: { label: null },
    fx: {label: null, tickFormat: d => legendMap[d]},
    color: {domain: ["BEV_PHEV", "BEV"],
            range: ["steelblue", "#59A14F"]},
    marks: [
      Plot.barX(All_share, {
        x: "value",
        y: "Country",
        fx: "key",
        fill: "key",
        sort: { y: "x", reverse: true }
      }),
      Plot.barX(All_share, {
        filter: d => d.Country == "Ukraine",
        x: "value",
        y: "Country",
        fx: "key",
        fill: "#F28E2B",
        sort: { y: "x", reverse: true }
      }),
      Plot.text(All_share, {
        text: d => d3.format(".0%")(d.value),
        x: "value",
        y: "Country",
        fx: "key",
        textAnchor: "start",
        dx: 3,
        fill: "black"
      })
    ]
  })
})()
```
-->

<br>

🚗 Total EV fleet in Ukraine has crossed 200k (BEVs) and 300k (BEVs+PHEVs) in 2025, the highest number in Central & Eastern Europe.

```js
(() => {
  const totals = d3.rollups(
    ukr_cars_cum,
    v => d3.sum(v, d => d.count_cum),
    d => d.year
  ).map(([year, total]) => ({ year, total }));

  return Plot.plot({
    title: "Total EV car fleet in Ukraine",
    width: Math.min(width, 800),
    marginLeft: 50,
    height: 300,
    y: { grid: true, label: "count" },
    x: { label: null, tickFormat: x => x.toFixed(0) },
    color: { range: ["#59A14F", "steelblue"], legend: true },
    marks: [
      Plot.ruleY([0]),
      Plot.barY(
        ukr_cars_cum,
        Plot.stackY({ x: "year", y: "count_cum", fill: "fuel", opacity: 0.8, tip: true })
      ),
      Plot.text(totals, {
        x: "year",
        y: "total",
        text: d => (d.total > 10000 ? `${d3.format(".0f")(d.total / 1000)}k` : ""),
        dy: -6,
        textAnchor: "middle",
        fill: "black"
      })
    ]
  })
})()
```

<!-- CEE fleet comparison charts commented out (depend on fetchp data)
```js
(() => {
  const Ukr_fleet = aq.from(ukr_cars_cum)
    .filter(d => d.year == d3.max(d.year))
    .pivot("fuel", "count_cum")
    .derive({BEV_PHEV: d => (d.BEV + d.PHEV)})
    .objects()

  const All_fleet = aq.from([
    ...Ukr_fleet.map(d => ({Country: "Ukraine", BEV: d.BEV, BEV_PHEV: d.BEV_PHEV})),
    ...EU_fleet
  ])
    .fold(['BEV_PHEV', 'BEV'])
    .objects()

  const legendMap = {
    BEV: "BEV",
    BEV_PHEV: "BEV+PHEV"
  }

  return Plot.plot({
    title: `Total EV fleet: Ukraine vs CEE in ${d3.max(ukr_cars_cum.map(d => d.year))}`,
    marginLeft: 90,
    marginRight: 50,
    x: { axis: null},
    y: { label: null },
    fx: {label: null, tickFormat: d => legendMap[d]},
    color: {domain: ["BEV_PHEV", "BEV"],
            range: ["steelblue", "#59A14F"]},
    marks: [
      Plot.barX(All_fleet, {
        x: "value",
        y: "Country",
        fx: "key",
        fill: "key",
        sort: { y: "x", reverse: true }
      }),
      Plot.barX(All_fleet, {
        filter: d => d.Country == "Ukraine",
        x: "value",
        y: "Country",
        fx: "key",
        fill: "#F28E2B",
        sort: { y: "x", reverse: true }
      }),
      Plot.text(All_fleet, {
        text: d => `${d3.format(".0f")(d.value / 1000)}k`,
        x: "value",
        y: "Country",
        fx: "key",
        textAnchor: "start",
        dx: 3,
        fill: "black"
      })
    ]
  })
})()
```

```js
(() => {
  const Ukr_fleet = aq.from(ukr_cars_cum)
    .filter(d => d.year == d3.max(d.year))
    .pivot("fuel", "count_cum")
    .derive({BEV_PHEV: d => (d.BEV + d.PHEV)})
    .objects()

  const All_fleet = aq.from([
    ...Ukr_fleet.map(d => ({Country: "Ukraine", BEV: d.BEV / ukr_m1, BEV_PHEV: d.BEV_PHEV / ukr_m1})),
    ...EU_fleet_share
  ])
    .fold(['BEV_PHEV', 'BEV'])
    .objects()

  const legendMap = {
    BEV: "BEV",
    BEV_PHEV: "BEV+PHEV"
  }

  return Plot.plot({
    title: `EV share in total fleet: Ukraine* vs CEE in ${d3.max(ukr_cars_cum.map(d => d.year))}`,
    caption: "* Estimate of EV share in Ukraine is based on approx. passenger + LCV fleet of 12 mln",
    marginLeft: 90,
    marginRight: 50,
    x: { axis: null},
    y: { label: null },
    fx: {label: null, tickFormat: d => legendMap[d]},
    color: {domain: ["BEV_PHEV", "BEV"],
            range: ["steelblue", "#59A14F"]},
    marks: [
      Plot.barX(All_fleet, {
        x: "value",
        y: "Country",
        fx: "key",
        fill: "key",
        sort: { y: "x", reverse: true }
      }),
      Plot.barX(All_fleet, {
        filter: d => d.Country == "Ukraine",
        x: "value",
        y: "Country",
        fx: "key",
        fill: "#F28E2B",
        sort: { y: "x", reverse: true }
      }),
      Plot.text(All_fleet, {
        text: d => d3.format(".1%")(d.value),
        x: "value",
        y: "Country",
        fx: "key",
        textAnchor: "start",
        dx: 3,
        fill: "black"
      })
    ]
  })
})()
```
-->

<br>

♻️ Most of EVs brought to Ukraine are used vehicles. Median age at first registration is 3 years for BEVs and 1 year for PHEVs. In recent years the share of vehicles over 5 years old has increased to almost 30%.

```js
(() => {
  // Pre-aggregate the data by fuel and then by year.
  const groupedData = [];

  // Group by fuel first.
  const groupedByFuel = d3.group(ev_cars, d => d.fuel);
  for (const [fuel, fuelRecords] of groupedByFuel) {
    // Then group within each fuel type by year.
    const groupedByYear = d3.group(fuelRecords, d => d.year);
    for (const [year, records] of groupedByYear) {
      // Filter records to include only ages between 0 and 15 and sort them.
      const filteredRecords = records.filter(d => d.age >= 0 && d.age <= 15)
                                     .sort((a, b) => a.age - b.age);
      // Create bins with a fixed domain [0,15] and thresholds at every integer.
      const binGenerator = d3.bin()
        .domain([0, 15])
        .thresholds(d3.range(0, 16));  // bins at 0, 1, 2, ... 15
      const bins = binGenerator(filteredRecords.map(d => d.age));
      // Compute cumulative proportion for each bin.
      let cumulative = 0;
      const total = filteredRecords.length;
      bins.forEach(bin => {
        cumulative += bin.length;
        groupedData.push({
          fuel,           // Fuel type for faceting
          year,           // Registration year for line grouping/color
          age: bin.x0,    // Left edge of the bin as x
          proportion: total ? cumulative / total : 0
        });
      });
    }
  }

  // Sort the aggregated data by fuel, then year, then age.
  groupedData.sort((a, b) =>
    a.fuel.localeCompare(b.fuel) || a.year - b.year || a.age - b.age
  );

  // Plot the data, faceting by fuel.
  return Plot.plot({
    title: "Vehicle age distribution at registration (CDF)",
    width: Math.min(width, 800),
    marginLeft: 100,
    height: 500,
    x: { label: "age, years", domain: [0, 15] },
    y: { tickFormat: d3.format(".0%"), label: null },
    fy: {label: null},
    color: { scheme: "GnBu", legend: true, tickFormat: d => d.toString() },
    marks: [
      Plot.line(groupedData.filter(d => d.year >= 2014), {
        x: "age",
        y: "proportion",
        fy: "fuel",
        stroke: "year",       // One line per registration year
        curve: "catmull-rom",
        tip: true
      }),
      Plot.ruleX([5], {stroke: "red", strokeDasharray: "2,2" }),
      Plot.ruleY([0,1], {stroke: "grey"})
    ]
  });
})()
```

⚡ Tesla is the leading BEV brand in 2025, with BYD rapidly climbing into second place and Volkswagen among the top three. Toyota continues to lead PHEV registrations.

### Most popular car brands

```js
const year = view(Inputs.select(["2021","2022","2023","2024", "2025"], {value: "2025", label: "Select year"}))
```

```js
const cars_treemap = d3.rollups(
  ukr_cars.filter(d => d.date.getFullYear() === +year).map(d => ({...d, name: `${d.fuel}.${d.brand}`})),
  v => d3.sum(v, d => d.count),
  d => d.name
).map(([name, count]) => ({name, count}))
```

```js
const treemap_chart = Treemap(cars_treemap, {
  path: (d) => d.name.replaceAll(".", "/"),
  label: (d, n) => n.value >= 500 ? [...d.name.split(".").pop().split(/(?=[A-Z][a-z])/g),
                    d3.format(",.0f")(n.value)].join("\n") : "",
  group: (d) => d.name.split(".")[0],
  value: (d) => d?.count,
  title: (d, n) => [n.id, n.value.toLocaleString("en")].join("\n"),
  width: Math.min(width, 800),
  height: 400,
  colors: ['#4E79A7','#59A14F','#F28E2B'],
  zDomain: ['ICE', 'BEV', 'PHEV']
})
```

```js
html`<div style="display:flex;gap:1em;margin:0.5em 0;font-size:13px">
  <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;background:#4E79A7;border-radius:2px"></div><span>ICE</span></div>
  <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;background:#59A14F;border-radius:2px"></div><span>BEV</span></div>
  <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;background:#F28E2B;border-radius:2px"></div><span>PHEV</span></div>
</div>`
```

```js
treemap_chart
```

### Annex: data and calculations

This page updates automatically based on the most recent data from:

- [Register of Vehicles and Owners](https://data.gov.ua/dataset/06779371-308f-42d7-895e-5a39833375f0) by the Ministry of Interior of Ukraine — data processing is done [here](https://github.com/atsokol/ukraine-EV-data-update)
- [Alternative Fuels Observatory](https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27/country-comparison#chart-html-kxuqidhktzm) by the European Commission
