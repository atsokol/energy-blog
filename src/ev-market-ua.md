---
title: EV market in Ukraine
---

# EV market in Ukraine

Ukraine now operates the largest battery electric vehicle fleet in Central and Eastern Europe (roughly 250,000 BEVs by end-2025) despite fighting a full-scale war since February 2022. The market was supported by tax incentives for BEVs (0% VAT and import duty rates) applicable until 1 Jan 2026, which reduced all-in import costs by 25–35% relative to equivalent ICE vehicles. 

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

```js
const EU_data_raw = await d3.csv("https://raw.githubusercontent.com/atsokol/ukraine-EV-data-update/refs/heads/main/output-data/EU_EV_data.csv", d3.autoType)
const EU_data_cee = EU_data_raw.filter(d => CEE.includes(d.country))
```

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

```js
const last_year = d3.max(ukr_cars, d => d.date.getFullYear())
const months_per_year = d3.rollup(ukr_cars, v => new Set(v.map(d => d.date.getMonth())).size, d => d.date.getFullYear())
const yearTickFormat = d => d === last_year ? `${d} (${months_per_year.get(d)}m)` : d.toString()
```

## Market growth

EV registrations grew from ~9,000 units in 2021 to ~110,200 in 2025, a 12x increase over four years. The 2022 car market decline that cut total sales by 63% barely slowed BEV momentum: the tax incentives kept EVs competitively priced even as overall purchasing power fell. December 2025 alone recorded 32,800 BEV registrations, the surge driven by buying ahead of the tax incentives expiry. In 2026 EV registrations have undergone an immediate correction, the full extent of which is still unfolding.

```js
(() => {
  const chart1 = Plot.plot({
    title: "...of which BEV and PHEV",
    width: Math.min(width, 800),
    height: 300,
    y: {grid: true},
    marginLeft: 50,
    color: {domain: ["BEV", "PHEV"], range: ['#59A14F','steelblue'], legend: true},
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
    title: "Total first-time car registrations: Ukraine",
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

## EV share in car sales

Ukraine's BEV share of first-time car registrations rose from 3% in 2022 to 30% in 2025 — a ten-fold increase in three years. This exceeded levels in other CEE countries by a factor of 3x–5x.

```js
const ev_share_yearly = aq.from(ukr_cars.map(d => ({...d, year: d.date.getFullYear()})))
  .groupby("fuel", "year")
  .rollup({count: d => op.sum(d.count)})
  .groupby("year")
  .pivot("fuel", "count")
  .derive({BEV: d => d.BEV === undefined ? 0 : d.BEV})
  .derive({PHEV: d => d.PHEV === undefined ? 0 : d.PHEV})
  .derive({
    BEV_share: d => d.BEV / (d.BEV + d.PHEV + d.ICE),
    PHEV_share: d => d.PHEV / (d.BEV + d.PHEV + d.ICE),
    BEV_PHEV_share: d => (d.BEV + d.PHEV) / (d.BEV + d.PHEV + d.ICE),
  })
  .objects()
```

```js
const ev_share_stacked = aq.from(ev_share_yearly)
  .select("year", "BEV_share", "PHEV_share")
  .fold(["BEV_share", "PHEV_share"])
  .objects()
```

```js
const fuel_type = view(Inputs.radio(["BEV", "PHEV", "Both"], {value: "Both", label: "Show"}))
```

```js
const ev_share_display = fuel_type === "Both"
  ? ev_share_stacked
  : ev_share_stacked.filter(d => d.key === (fuel_type === "BEV" ? "BEV_share" : "PHEV_share"))
const ev_text_field = fuel_type === "BEV" ? "BEV_share" : fuel_type === "PHEV" ? "PHEV_share" : "BEV_PHEV_share"
```

```js
Plot.plot({
  title: "EV share in first-time registrations: Ukraine",
  width: Math.min(width, 800),
  height: 300,
  y: {grid: true, tickFormat: d3.format(".0%"), label: null},
  x: {label: null, tickFormat: yearTickFormat},
  color: {
    domain: ["BEV_share", "PHEV_share"],
    range: ["#59A14F", "steelblue"],
    legend: true,
    tickFormat: d => d === "BEV_share" ? "BEV" : "PHEV"
  },
  marginLeft: 50,
  marks: [
    Plot.ruleY([0]),
    Plot.barY(ev_share_display, Plot.stackY({
      x: "year",
      y: "value",
      fill: "key",
      tip: {format: {x: d => d.toString(), y: d3.format(".0%"), fill: d => d === "BEV_share" ? "BEV" : "PHEV"}}
    })),
    Plot.text(ev_share_yearly, {
      x: "year",
      y: d => d[ev_text_field],
      text: d => d3.format(".0%")(d[ev_text_field]),
      dy: -8,
      textAnchor: "middle",
      fill: "black",
      fontSize: 11
    })
  ]
})
```

```js
const eu_years_avail = new Set(EU_data_cee.map(d => d.year))
const ukr_years_avail = new Set(ev_share_yearly.map(d => d.year))
const common_years = [...eu_years_avail].filter(y => ukr_years_avail.has(y)).sort((a, b) => a - b)
const cee_year = view(Inputs.select(common_years, {value: d3.max(common_years), label: "Select year", format: d => d.toString()}))
```

```js
const ukr_share_cee = ev_share_yearly.find(d => d.year === cee_year) ?? {}
const all_share_cee_rows = [
  {Country: "Ukraine", fuel: "BEV",  value: ukr_share_cee.BEV_share  ?? 0},
  {Country: "Ukraine", fuel: "PHEV", value: ukr_share_cee.PHEV_share ?? 0},
  ...EU_data_cee.filter(d => d.year === cee_year).flatMap(d => [
    {Country: d.country, fuel: "BEV",  value: d.EU_share_BEV  / 100},
    {Country: d.country, fuel: "PHEV", value: d.EU_share_PHEV / 100}
  ])
]
const all_share_cee = fuel_type === "Both"
  ? all_share_cee_rows
  : all_share_cee_rows.filter(d => d.fuel === fuel_type)
const share_totals_map = d3.rollup(all_share_cee, v => d3.sum(v, d => d.value), d => d.Country)
const share_country_order = [...share_totals_map.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
const share_totals_text = share_country_order.map(c => ({Country: c, total: share_totals_map.get(c)}))
```

```js
Plot.plot({
  title: `EV share in first-time registrations: Ukraine vs. CEE in ${cee_year}`,
  width: Math.min(width, 800),
  marginLeft: 90,
  marginRight: 60,
  x: {axis: null},
  y: {label: null, domain: share_country_order},
  color: {domain: ["BEV", "PHEV"], range: ["#59A14F", "steelblue"], legend: true},
  marks: [
    Plot.barX(all_share_cee, Plot.stackX({
      x: "value",
      y: "Country",
      fill: "fuel",
      fillOpacity: d => d.Country == "Ukraine" ? 1 : 0.6,
      tip: {format: {x: d3.format(".1%"), fill: d => d}}
    })),
    Plot.text(share_totals_text, {
      x: "total",
      y: "Country",
      text: d => d3.format(".0%")(d.total),
      textAnchor: "start",
      dx: 4,
      fill: "black",
      fontSize: 11
    })
  ]
})
```

## Fleet size

By end-2025, Ukraine's cumulative EV fleet reached c. 250,000 BEVs — the largest level in Central and Eastern Europe, roughly double Poland's ~122,000. This installed base creates durable charging infrastructure demand regardless of future incentive policy.

```js
const ukr_fleet_display = fuel_type === "Both"
  ? ukr_cars_cum
  : ukr_cars_cum.filter(d => d.fuel === fuel_type)
const fleet_totals_ukr = d3.rollups(ukr_fleet_display, v => d3.sum(v, d => d.count_cum), d => d.year)
  .map(([year, total]) => ({year, total}))
```

```js
Plot.plot({
  title: "Total EV car fleet in Ukraine",
  width: Math.min(width, 800),
  marginLeft: 50,
  height: 300,
  y: {grid: true, label: null},
  x: {label: null, tickFormat: yearTickFormat},
  color: {domain: ["BEV", "PHEV"], range: ["#59A14F", "steelblue"], legend: true},
  marks: [
    Plot.ruleY([0]),
    Plot.barY(ukr_fleet_display, Plot.stackY({x: "year", y: "count_cum", fill: "fuel", tip: true})),
    Plot.text(fleet_totals_ukr, {
      x: "year",
      y: "total",
      text: d => d.total > 10000 ? `${d3.format(".0f")(d.total / 1000)}k` : "",
      dy: -6,
      textAnchor: "middle",
      fill: "black"
    })
  ]
})
```

```js
const ukr_bev_cum = ukr_cars_cum.find(d => d.fuel === "BEV"  && d.year === cee_year)?.count_cum ?? 0
const ukr_phev_cum = ukr_cars_cum.find(d => d.fuel === "PHEV" && d.year === cee_year)?.count_cum ?? 0
const all_fleet_cee_rows = [
  {Country: "Ukraine", fuel: "BEV",  value: ukr_bev_cum},
  {Country: "Ukraine", fuel: "PHEV", value: ukr_phev_cum},
  ...EU_data_cee.filter(d => d.year === cee_year).flatMap(d => [
    {Country: d.country, fuel: "BEV",  value: d.EU_fleet_BEV},
    {Country: d.country, fuel: "PHEV", value: d.EU_fleet_PHEV}
  ])
]
const all_fleet_cee = fuel_type === "Both"
  ? all_fleet_cee_rows
  : all_fleet_cee_rows.filter(d => d.fuel === fuel_type)
const fleet_totals_map = d3.rollup(all_fleet_cee, v => d3.sum(v, d => d.value), d => d.Country)
const fleet_country_order = [...fleet_totals_map.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
const fleet_totals_text = fleet_country_order.map(c => ({Country: c, total: fleet_totals_map.get(c)}))
```

```js
Plot.plot({
  title: `Total EV fleet: Ukraine vs. CEE in ${cee_year}`,
  width: Math.min(width, 800),
  marginLeft: 90,
  marginRight: 70,
  x: {axis: null},
  y: {label: null, domain: fleet_country_order},
  color: {domain: ["BEV", "PHEV"], range: ["#59A14F", "steelblue"], legend: true},
  marks: [
    Plot.barX(all_fleet_cee, Plot.stackX({
      x: "value",
      y: "Country",
      fill: "fuel",
      fillOpacity: d => d.Country == "Ukraine" ? 1 : 0.6,
      tip: {format: {x: d => `${d3.format(",.0f")(d)}`, fill: d => d}}
    })),
    Plot.text(fleet_totals_text, {
      x: "total",
      y: "Country",
      text: d => `${d3.format(".0f")(d.total / 1000)}k`,
      textAnchor: "start",
      dx: 4,
      fill: "black",
      fontSize: 11
    })
  ]
})
```

## Brand breakdown

Tesla holds 20.2% of the total Ukrainian EV fleet — a direct consequence of Tesla's ~70% share of US auction sales, dominated by Model 3 (typically 2019 vintage) and Model Y (2022–2023). Nissan at 17.4% and Volkswagen at 12.2% follow. **BYD** surged to become the leading new car brand in Ukraine by late 2025, commanding 20% of the total new car market and 46% of the new EV segment. The BEV-to-PHEV split runs at roughly 93%/7% among plug-in registrations; Toyota leads PHEV sales through the RAV4 Prime, reflecting dual-fuel appeal in a market with frequent grid outages.

### Most popular car brands

```js
const year = view(Inputs.select(d3.range(2021, last_year + 1).map(d => d.toString()), {value: (last_year - 1).toString(), label: "Select year"}))
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
  colors: ['#F28E2B','#59A14F','steelblue'],
  zDomain: ['ICE', 'BEV', 'PHEV']
})
```

```js
html`<div style="display:flex;gap:1em;margin:0.5em 0;font-size:13px">
  <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;background:#F28E2B;border-radius:2px"></div><span>ICE</span></div>
  <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;background:#59A14F;border-radius:2px"></div><span>BEV</span></div>
  <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;background:steelblue;border-radius:2px"></div><span>PHEV</span></div>
</div>`
```

```js
treemap_chart
```

## Post-exemption contraction

The January 2026 VAT reinstatement has produced an immediate and confirmed market correction. After December 2025's record 32,800 BEV registrations — driven by panic buying ahead of the deadline — monthly volumes collapsed to 2,289 in January 2026 (−36% year-on-year from 3,602 in January 2025) and then fell further to 938 in February 2026 (−79% year-on-year from 4,514 in February 2025), the steepest single-month decline on record. Combined, January–February 2026 totalled just 3,227 BEVs versus 8,116 in the same period of 2025 — a decline of 60% and the lowest Jan–Feb total since early 2023. The sequential deterioration from January to February points to a demand freeze rather than a one-month adjustment: the 20% VAT reinstatement raised all-in import costs by 25–30%, moving a used Tesla Model 3 from roughly $15,000–$25,000 to $20,000–$32,000.

Permanent incentives remain in place: zero customs duty, a nominal excise of €1/kWh of battery capacity, and zero Pension Fund fee mean BEVs still carry the lowest total import tax burden of any vehicle category. Whether domestic resales of pre-exemption inventory, declining used EV prices on international markets, and continued Chinese new EV competitiveness can arrest the decline through H1 2026 is the key variable for infrastructure investors assessing demand-side certainty.

This analysis measures first-time vehicle registrations from the Ukrainian Ministry of Interior dataset, which records the administrative registration date rather than the date of import clearance; a portion of December 2025 registrations may reflect vehicles that cleared customs earlier. Registration counts do not capture the secondary market or military vehicle acquisitions. Fleet totals represent cumulative net registrations without deregistration adjustments.

*This page updates automatically based on the most recently available data.*

---

### Annex: data sources

- [Register of Vehicles and Owners](https://data.gov.ua/dataset/06779371-308f-42d7-895e-5a39833375f0) by the Ministry of Interior of Ukraine — data processing is done [here](https://github.com/atsokol/ukraine-EV-data-update)
- [Alternative Fuels Observatory](https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27/country-comparison#chart-html-kxuqidhktzm) by the European Commission


Source code for this page: [atsokol/energy-blog](https://github.com/atsokol/energy-blog)
