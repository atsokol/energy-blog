---
title: Ukraine port sector cargo flows and terminal ownership
---

# Ukraine port sector: cargo flow analysis

Ukraine's seaport complex — concentrated on the Black Sea and Sea of Azov — handles the bulk of the country's commodity exports. Grain, iron ore, and steel semi-finished products have historically dominated throughput, but the sector's ownership and operational structure have shifted considerably since 2021 as foreign trade routes were severed and then partially restored. The analysis below traces cargo volumes by type, port, and terminal operator, and maps the structural flow of goods from commodity class through facility to operating entity.

## Volumes by cargo type

The stacked bars show annual throughput by commodity group. Click any coloured segment to isolate that category and see how its contribution compares across years; click again to restore the full stacked view.

```js
const topCargosInput = Inputs.range([1, 10], {label: "Top cargo types to show", step: 1, value: 7})
const selectTopCargos = view(topCargosInput)
```

```js
const cargoColorOrder = withOtherLast(d3.groupSort(
  volumes.filter(d => d.unit === "тис. тонн"),
  v => -d3.sum(v, d => d.volume),
  d => otherCargoesMap.get(d.cargo_type)
))
```

```js
// Colour legend for cargo chart
html`<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin-bottom:4px">
  ${cargoColorOrder.map(cat => html`<span style="white-space:nowrap">
    <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:middle;margin-right:3px"><rect width="12" height="12" rx="2" fill="${colorOfCargo(cat)}"/></svg>${cat}
  </span>`)}
</div>`
```

```js
DrilldownBarChart(cargoLevelData, {
  width: Math.min(width, 800),
  colorOrder: cargoColorOrder,
  colors: cargoColorOrder.map(colorOfCargo),
  ytdKeys: sharedYtdKeys,
  yLabel: "'000 tonnes",
})
```

Grain and grain legumes account for by far the largest share of seaport throughput, reflecting Ukraine's position as one of the world's top five wheat and corn exporters. Iron ore and pellets form the second-largest commodity bloc, routed almost entirely through Pivdennyi (formerly Yuzhne) and Chornomorsk. The 2022 exclusion is visible as a discontinuity in the series; volumes began recovering from mid-2023 once the grain corridor and subsequent interim arrangements allowed resumed export sailings.

## Volumes by port

The chart below breaks the same throughput totals down by port of handling. Adjust the number of ports displayed via the control.

```js
// Master "top ports" input — the Sankey section renders a second copy bound
// to this one. Same control drives the port bar chart and the Sankey ranking.
const topPortsInput = Inputs.range([1, 10], {label: "Top ports to show", step: 1, value: 6})
const selectTopPorts = view(topPortsInput)
```

```js
const portColorOrder = withOtherLast(d3.groupSort(
  volumes.filter(d => d.unit === "тис. тонн"),
  v => -d3.sum(v, d => d.volume),
  d => otherPortsMap.get(d.port_name)
))
```

```js
html`<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin-bottom:4px">
  ${portColorOrder.map(port => html`<span style="white-space:nowrap">
    <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:middle;margin-right:3px"><rect width="12" height="12" rx="2" fill="${colorOfPort(port)}"/></svg>${port}
  </span>`)}
</div>`
```

```js
DrilldownBarChart(portLevelData, {
  width: Math.min(width, 800),
  colorOrder: portColorOrder,
  colors: portColorOrder.map(colorOfPort),
  ytdKeys: sharedYtdKeys,
  yLabel: "'000 tonnes",
})
```

Pivdennyi and Chornomorsk together account for roughly two-thirds of total seaport throughput. Mykolaiv's sharp post-2021 decline reflects its proximity to the front line and the destruction of port infrastructure; its volumes have not recovered to pre-war levels. Odesa port retained operational capacity throughout most of the conflict period, though with reduced utilisation.

## Volumes by terminal

The treemap below resolves each port into individual terminals, with area proportional to handled volume. The colour grouping identifies the parent port.

```js
const yearInput = Inputs.select(availableYears, {label: "Year", format: d => String(d), value: d3.max(availableYears)})
const selectYear = view(yearInput)
const cargoInput = Inputs.select(["All", ...topCargos, OTHER], {label: "Cargo type", value: "All"})
const selectCargo = view(cargoInput)
```

```js
// Treemap legend: ports that clear the same 0.5% de-minimis threshold the
// treemap uses for its own labels, under the current year + cargo filters.
// Sorted by volume so the dominant ports come first.
const treemapPortOrder = (() => {
  const filt = volumes
    .filter(d => d.unit === "тис. тонн")
    .filter(d => d.date.getUTCFullYear() === selectYear)
    .filter(d => selectCargo === "All" ? true
              : selectCargo === OTHER ? !topCargos.includes(d.cargo_type)
              : d.cargo_type === selectCargo);
  const total = Math.max(1, d3.sum(filt, d => d.volume));
  return d3.rollups(filt, v => d3.sum(v, d => d.volume), d => d.port_name)
    .filter(([, v]) => v / total >= 0.005)
    .sort((a, b) => b[1] - a[1])
    .map(([port]) => port);
})()
```

```js
html`<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin-bottom:4px">
  ${treemapPortOrder.map(port => html`<span style="white-space:nowrap">
    <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:middle;margin-right:3px"><rect width="12" height="12" rx="2" fill="${colorOfPort(port)}"/></svg>${port}
  </span>`)}
</div>`
```

```js
{
  const data_filt = volumes
    .filter(d => d.unit === "тис. тонн")
    .map(d => ({...d, year: d.date.getUTCFullYear()}))
    .filter(d => selectCargo === "All" ? true
              : selectCargo === OTHER ? !topCargos.includes(d.cargo_type)
              : d.cargo_type === selectCargo)
    .filter(d => d.year === selectYear)
    .map(d => ({...d, name: `${d.port_name}~${toTerminal(d.port_operator)}`}));

  const data_treemap = d3.rollups(data_filt,
    v => d3.sum(v, d => d.volume),
    d => d.name
  ).map(([name, amount]) => ({name, amount}));

  const total = Math.max(1, d3.sum(data_treemap, d => d.amount));

  display(Treemap(data_treemap, {
    path: d => d.name.replaceAll("~", "/"),
    label: (d, n) => (n.value / total) >= 0.01
      ? [d.name.split("~").pop(), d3.format(",.0f")(n.value)].join("\n")
      : "",
    group: d => d.name.split("~")[0],
    value: d => d.amount,
    title: (d, n) => [n.id, n.value.toLocaleString("en")].join("\n"),
    width: Math.min(width, 800),
    height: 320,
    zDomain: portNamesAll,
    colors: portNamesAll.map(colorOfPort),
    fillOpacity: 0.75,
  }));
}
```

Terminal ownership is highly concentrated. A small number of operators — typically vertically integrated industrial groups — control the facilities that handle the majority of bulk cargo. The structure has been relatively stable since 2021 despite the war, reflecting the capital-intensive and illiquid nature of port infrastructure.

## Volumes breakdown: cargo → port → operator

The Sankey diagram traces how volume flows from commodity class through port to terminal operator group for a selected year. Node width is proportional to handled volume.

```js
// Year, top-cargo and top-port inputs are bound copies of the masters defined
// earlier (yearInput, topCargosInput, topPortsInput).
display(Inputs.bind(Inputs.select(availableYears, {label: "Year", format: d => String(d)}), yearInput))
display(Inputs.bind(Inputs.range([1, 10], {label: "Top cargo types", step: 1}), topCargosInput))
display(Inputs.bind(Inputs.range([1, 10], {label: "Top ports",       step: 1}), topPortsInput))
```

```js
// Top-N cargo types by lifetime volume, restricted to English-named bulk
// categories. Drives both the Sankey ranking and the cargo dropdown options.
const topCargos = cargoTypes
  .map(c => [c, d3.sum(volumes.filter(d => d.unit === "тис. тонн" && d.cargo_type === c), d => d.volume)])
  .sort((a, b) => b[1] - a[1])
  .slice(0, selectTopCargos)
  .map(([c]) => c)
```

```js
// Second copy of the cargo-type input, bound to the treemap's master copy
// (cargoInput). Either widget can drive the shared `selectCargo` value.
display(Inputs.bind(Inputs.select(["All", ...topCargos, OTHER], {label: "Cargo type"}), cargoInput))
```

```js
// Group1 covers ownership ≤2021; Group2 covers 2023+ (2022 excluded from data)
const sankeyGroupMap = selectYear <= 2021 ? terminalGroup1Map : terminalGroup2Map
const sankeyRecords = volumes
  .filter(d => d.unit === "тис. тонн" && d.date.getUTCFullYear() === selectYear)
  .filter(d => selectCargo === "All" ? true
            : selectCargo === OTHER ? !topCargos.includes(d.cargo_type)
            : d.cargo_type === selectCargo)
  .map(d => ({
    cargo: d.cargo_type,
    port:  d.port_name,
    group: sankeyGroupMap.get(d.port_operator) || OTHER,
    value: d.volume,
  }))

// The named operator groups the Sankey actually shows = top-N by value in
// this (year, cargo) slice; everything else is folded into OTHER. Mirrors
// PortFlowSankey's internal topGroups slicing exactly, so the bar chart
// below can reuse `sankeyOperatorSet` and list the identical operators.
const SANKEY_TOP_GROUPS = 10
const sankeyOperators = d3.groupSort(sankeyRecords, v => -d3.sum(v, d => d.value), d => d.group)
  .filter(g => g !== OTHER)
  .slice(0, SANKEY_TOP_GROUPS)
const sankeyOperatorSet = new Set(sankeyOperators)
```

```js
PortFlowSankey(sankeyRecords, {
  width:       Math.min(width, 800),
  height:      560,
  topCargos:   selectTopCargos,
  topPorts:    selectTopPorts,
  topGroups:   SANKEY_TOP_GROUPS,
  cargoColors: cargoColors,
})
```

The flow diagram makes visible the degree to which throughput is routed through a concentrated set of facilities and operators. Grain dominates the cargo layer and is handled across most of the top ports, while iron ore and pellet flows are more port-specific. The operator layer on the right reveals that a handful of entities collectively handle the majority of national port throughput.

## Operator throughput over time

The stacked bars track each terminal-operator group's annual throughput of the selected cargo. Switch between absolute volume and percentage share, and use the cargo selector to isolate a single commodity. Click any segment to focus a single operator across years. The named operators are the same set broken out in the Sankey above — the largest groups for the selected year — with all smaller operators aggregated into Other. The owner→group mapping reflects the pre-2021 ownership snapshot through 2021 and the 2023-onward snapshot thereafter; 2022 is omitted as no statistics were published.

```js
// Third copy of the cargo-type selector, bound to the shared master
// (cargoInput) so it stays in sync with the treemap and Sankey controls.
display(Inputs.bind(Inputs.select(["All", ...topCargos, OTHER], {label: "Cargo type"}), cargoInput))
```

```js
const operatorMode = view(Inputs.radio(["Volume", "Percentage"], {value: "Volume", label: "Show"}))
```

```js
// Cargo-filtered handling rows tagged with the year-appropriate operator
// group (≤2021 vs 2023+ ownership snapshot); 2022 dropped (no reporting).
const operatorFiltered = volumes
  .filter(d => d.unit === "тис. тонн")
  .map(d => ({...d, year: d.date.getUTCFullYear(), month: d.date.getUTCMonth() + 1}))
  .filter(d => d.year >= 2019 && d.year !== 2022)
  .filter(d => selectCargo === "All" ? true
            : selectCargo === OTHER ? !topCargos.includes(d.cargo_type)
            : d.cargo_type === selectCargo)
  .map(d => ({
    ...d,
    rawGroup: (d.year <= 2021 ? terminalGroup1Map : terminalGroup2Map).get(d.port_operator) || OTHER,
  }))
```

```js
// Reuse the exact operator list the Sankey shows (sankeyOperators — top-N by
// volume in the selected year + cargo), so both charts list the same groups.
// Anything outside that set folds into OTHER, which always sits last in the
// stack/legend and keeps its grey colour.
const operatorOrder = [...sankeyOperators, OTHER]
const keptOperators = sankeyOperatorSet
const operatorColors = operatorOrder.map((g, i) => g === OTHER ? OTHER_COLOR : tableau10[i % tableau10.length])
```

```js
// Colour legend for the operator chart — only groups that actually appear as
// a non-zero segment under the current cargo filter, in stack order.
const operatorColorOf = new Map(operatorOrder.map((g, i) => [g, operatorColors[i]]))
const presentOperators = new Set(operatorLevelData.filter(d => d.volume > 0).map(d => d.cat))
```

```js
html`<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;margin-bottom:4px">
  ${operatorOrder.filter(g => presentOperators.has(g)).map(g => html`<span style="white-space:nowrap">
    <svg width="12" height="12" viewBox="0 0 12 12" style="vertical-align:middle;margin-right:3px"><rect width="12" height="12" rx="2" fill="${operatorColorOf.get(g)}"/></svg>${g}
  </span>`)}
</div>`
```

```js
// Annual operator data, mirroring the cargo/port FY + YTD layout. In
// Percentage mode each period (incl. YTD columns) is normalised to its own
// total so the bars fill to 100%.
const operatorLevelData = (() => {
  const base = operatorFiltered.map(d => ({
    cat: keptOperators.has(d.rawGroup) ? d.rawGroup : OTHER,
    year: d.year, month: d.month, volume: d.volume,
  }))

  const fy = d3.flatRollup(
    base.filter(d => d.year < fyMaxYearExclusive),
    v => d3.sum(v, d => d.volume),
    d => d.cat, d => String(d.year)
  ).map(([cat, x, volume]) => ({cat, x, volume}))

  const ytdRows = (yr) => d3.flatRollup(
    base.filter(d => d.year === yr && d.month <= maxMonth),
    v => d3.sum(v, d => d.volume),
    d => d.cat
  ).map(([cat, volume]) => ({cat, x: `${maxMonth}m${yr}`, volume}))

  const annual = showYTD ? [...fy, ...ytdRows(maxYear - 1), ...ytdRows(maxYear)] : fy

  if (operatorMode === "Volume") return annual
  const totalByX = d3.rollup(annual, v => d3.sum(v, d => d.volume), d => d.x)
  return annual.map(d => ({...d, volume: d.volume / (totalByX.get(d.x) || 1)}))
})()
```

```js
DrilldownBarChart(operatorLevelData, {
  width:       Math.min(width, 800),
  colorOrder:  operatorOrder,
  colors:      operatorColors,
  ytdKeys:     sharedYtdKeys,
  yLabel:      operatorMode === "Volume" ? "'000 tonnes" : "share of throughput",
  valueFormat: operatorMode === "Volume" ? d3.format(",.0f") : d3.format(".0%"),
})
```

In percentage mode the bars strip out the overall volume swings and expose the competitive dynamics directly: where a single group's share widens at the expense of others, consolidation is underway; where the mix holds steady, the operator structure is stable despite the wartime disruption to absolute volumes.

---
*Data update: this page reflects the most recently published monthly port statistics. 2022 and 2023 are excluded from data panels due to interruption in reporting.*


```js
// Data loading
// Handling volumes — from ukraine-port-data repo. Ukrainian cargo_type and
// port_name are translated to English at parse time; port_operator stays
// raw so it can be looked up against the terminal table in port-labels.js.
const volumes = d3.csvParse(
  await d3.text("https://raw.githubusercontent.com/atsokol/ukraine-port-data/refs/heads/main/data/handling%20volumes.csv"),
  row => {
    const portRaw = row.port_name === "Морський порт \"Южний\""
      ? "Морський порт \"Південний\""
      : row.port_name;
    return {
      port_name:     toPort(portRaw),
      date:          d3.utcParse("%Y-%m-%d")(row.date),
      port_operator: row.port_operator,
      berth_no:      row.berth_no,
      cargo_type:    toCargo(row.cargo_type),
      direction:     row.direction,
      volume:        +row.volume,
      unit:          row.unit,
    };
  }
)
```

```js
// Reference lookups
const portNamesAll = Array.from(new Set(volumes.map(d => d.port_name)))

// Cargo types for the dropdowns: only categories with a non-zero volume in
// the bulk "тис. тонн" stream and a known English translation, sorted A→Z.
const englishCargoNames = new Set(cargoNames.values())
const cargoTypes = Array.from(new Set(
  volumes
    .filter(d => d.unit === "тис. тонн" && d.volume > 0)
    .map(d => d.cargo_type)
)).filter(c => englishCargoNames.has(c)).sort()
const availableYears = [...new Set(
  volumes
    .filter(d => d.unit === "тис. тонн" && d.date.getUTCFullYear() !== 2022)
    .map(d => d.date.getUTCFullYear())
)].sort()
```

```js
// Top-N cargo map (depends on selectTopCargos)
const topNCargoes = d3.groupSort(
  volumes.filter(d => d.unit === "тис. тонн"),
  v => -d3.sum(v, d => d.volume),
  d => d.cargo_type
).slice(0, selectTopCargos)

const otherCargoesMap = new Map(
  cargoTypes.map(d => [d, topNCargoes.includes(d) ? d : OTHER])
)
```

```js
// Top-N port map (depends on selectTopPorts)
const topNPorts = d3.groupSort(
  volumes.filter(d => d.unit === "тис. тонн"),
  v => -d3.sum(v, d => d.volume),
  d => d.port_name
).slice(0, selectTopPorts)

const otherPortsMap = new Map(
  portNamesAll.map(d => [d, topNPorts.includes(d) ? d : OTHER])
)
```


```js
// FY / YTD helper
// Shared FY/YTD parameters derived from the full volumes dataset
const sharedParams = (() => {
  const data = volumes
    .filter(d => d.unit === "тис. тонн")
    .map(d => ({...d, year: d.date.getUTCFullYear(), month: d.date.getUTCMonth() + 1}))
    .filter(d => d.year >= 2019 && d.year !== 2022);

  const maxDate  = d3.max(data, d => d.date);
  const maxYear  = maxDate.getUTCFullYear();
  const maxMonth = maxDate.getUTCMonth() + 1;

  const monthsThisYear       = new Set(data.filter(d => d.year === maxYear).map(d => d.month));
  const hasIncompleteYear    = maxMonth < 12 && monthsThisYear.size < 12;
  const hasCurrentMonthThis  = data.some(d => d.year === maxYear     && d.month === maxMonth);
  const hasCurrentMonthPrev  = data.some(d => d.year === maxYear - 1 && d.month === maxMonth);
  const showYTD              = hasIncompleteYear && hasCurrentMonthThis && hasCurrentMonthPrev;

  return {maxYear, maxMonth, showYTD, fyMaxYearExclusive: showYTD ? maxYear : maxYear + 1};
})()
```

```js
const {maxYear, maxMonth, showYTD, fyMaxYearExclusive} = sharedParams
const sharedYtdKeys = showYTD ? [`${maxMonth}m${maxYear - 1}`, `${maxMonth}m${maxYear}`] : []
```

```js
// Cargo chart data (Chart 1)
const cargoLevelData = (() => {
  const base = volumes
    .filter(d => d.unit === "тис. тонн")
    .map(d => ({
      ...d,
      cat: otherCargoesMap.get(d.cargo_type),
      year: d.date.getUTCFullYear(),
      month: d.date.getUTCMonth() + 1,
    }))
    .filter(d => d.year >= 2019 && d.year !== 2022);

  const fy = d3.flatRollup(
    base.filter(d => d.year < fyMaxYearExclusive),
    v => d3.sum(v, d => d.volume),
    d => d.cat, d => String(d.year)
  ).map(([cat, x, volume]) => ({cat, x, volume}));

  if (!showYTD) return fy;

  const ytdRows = (yr) => d3.flatRollup(
    base.filter(d => d.year === yr && d.month <= maxMonth),
    v => d3.sum(v, d => d.volume),
    d => d.cat
  ).map(([cat, volume]) => ({cat, x: `${maxMonth}m${yr}`, volume}));

  return [...fy, ...ytdRows(maxYear - 1), ...ytdRows(maxYear)];
})()
```


```js
// Port chart data (Chart 2)
const portLevelData = (() => {
  const base = volumes
    .filter(d => d.unit === "тис. тонн")
    .map(d => ({
      ...d,
      cat: otherPortsMap.get(d.port_name),
      year: d.date.getUTCFullYear(),
      month: d.date.getUTCMonth() + 1,
    }))
    .filter(d => d.year >= 2019 && d.year !== 2022);

  const fy = d3.flatRollup(
    base.filter(d => d.year < fyMaxYearExclusive),
    v => d3.sum(v, d => d.volume),
    d => d.cat, d => String(d.year)
  ).map(([cat, x, volume]) => ({cat, x, volume}));

  if (!showYTD) return fy;

  const ytdRows = (yr) => d3.flatRollup(
    base.filter(d => d.year === yr && d.month <= maxMonth),
    v => d3.sum(v, d => d.volume),
    d => d.cat
  ).map(([cat, volume]) => ({cat, x: `${maxMonth}m${yr}`, volume}));

  return [...fy, ...ytdRows(maxYear - 1), ...ytdRows(maxYear)];
})()
```


```js
// Import libraries
import {DrilldownBarChart} from "./components/bar-drilldown.js"
import {Treemap} from "./components/treemap.js"
import {PortFlowSankey} from "./components/port-flow-sankey.js"
import {
  OTHER, OTHER_COLOR, tableau10,
  toCargo, toPort, toTerminal,
  cargoNames, cargoColors, portColors,
  colorOfCargo, colorOfPort,
  withOtherLast,
  terminalGroup1Map, terminalGroup2Map,
} from "./components/port-labels.js"
```
