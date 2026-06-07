import * as d3 from "npm:d3";

/**
 * DrilldownBarChart — stacked bar chart with animated category focus.
 *
 * Click any bar segment to animate all other categories to zero height and
 * slide the selected one down to the baseline (y=0). Click again or the
 * breadcrumb to restore the full stacked view.
 *
 * @param {Array}  data   Flat array of {x, cat, volume}. x is the period
 *                        label (year string or YTD label like "5m2025").
 * @param {Object} opts
 * @param {number}   opts.width
 * @param {number}   opts.height
 * @param {number}   opts.marginLeft
 * @param {number}   opts.marginRight
 * @param {number}   opts.marginTop
 * @param {number}   opts.marginBottom
 * @param {string}   opts.yLabel
 * @param {string[]} opts.colorOrder  Category order (largest first).
 * @param {string[]} opts.colors      Colour array parallel to colorOrder.
 * @param {number}   opts.padding     Band scale inner padding.
 * @param {number}   opts.align       Band scale alignment.
 * @param {string[]} opts.ytdKeys     x values that belong to the YTD panel
 *                                    (get a pink background rectangle).
 * @param {Function} opts.valueFormat Formatter for segment/total labels and
 *                                    hover titles. Defaults to integer
 *                                    thousands; pass d3.format(".0%") for
 *                                    share/percentage data.
 */
export function DrilldownBarChart(data, {
  width       = 650,
  height      = 380,
  marginLeft  = 50,
  marginRight = 20,
  marginTop   = 50,
  marginBottom = 55,
  yLabel      = "'000 tonnes",
  colorOrder,
  colors      = d3.schemeTableau10,
  padding     = 0.15,
  align       = 0.5,
  ytdKeys     = [],
  otherLabel  = "Other",
  valueFormat = d3.format(",.0f"),
} = {}) {
  const ANIM_MS = 1000;

  const catOrderRaw = colorOrder
    ?? d3.groupSort(data, v => -d3.sum(v, d => d.volume), d => d.cat);

  // Move `otherLabel` to the end of the stack so the "Other" band always sits
  // on top, regardless of its volume rank. When `colors` is an aligned array,
  // shuffle it in parallel so each category keeps its colour.
  const otherIdx = catOrderRaw.indexOf(otherLabel);
  const catOrder = otherIdx < 0
    ? catOrderRaw
    : [...catOrderRaw.filter(c => c !== otherLabel), otherLabel];
  const catColors = (otherIdx < 0 || !Array.isArray(colors) || colors.length <= otherIdx)
    ? colors
    : [...colors.slice(0, otherIdx), ...colors.slice(otherIdx + 1), colors[otherIdx]];

  const colorScale = d3.scaleOrdinal(catOrder, catColors);

  // x-domain: preserve insertion order, then fill any missing integer years
  // between the earliest and latest 4-digit year so data gaps (e.g. 2022)
  // render as empty slots rather than being skipped on the axis. Non-year
  // labels (e.g. "5m2025" YTD keys) keep their original relative order and
  // are appended after the year run.
  const rawDomain = [...new Set(data.map(d => d.x))];
  const isYear = x => /^\d{4}$/.test(x);
  const yearVals = rawDomain.filter(isYear).map(Number);
  const xDomain = yearVals.length >= 2
    ? [
        ...d3.range(Math.min(...yearVals), Math.max(...yearVals) + 1).map(String),
        ...rawDomain.filter(x => !isYear(x)),
      ]
    : rawDomain;
  const byX = d3.group(data, d => d.x);

  // Pre-compute stacked (y0, y1) for every segment — used both for initial
  // render and for the "go back" animation.
  const stacked = [];
  for (const x of xDomain) {
    const catMap = new Map((byX.get(x) ?? []).map(r => [r.cat, r.volume]));
    let y0 = 0;
    for (const cat of catOrder) {
      const vol = catMap.get(cat) ?? 0;
      if (vol > 0) {
        stacked.push({ x, cat, y0, y1: y0 + vol, volume: vol });
        y0 += vol;
      }
    }
  }

  // Per-x totals for the top-of-bar total labels
  const totalsByX = xDomain.map(x => ({
    x,
    total: d3.max(stacked.filter(d => d.x === x), d => d.y1) ?? 0,
  }));

  // Fixed scales — don't rescale on drilldown so bars move smoothly
  const xScale = d3.scaleBand()
    .domain(xDomain)
    .range([marginLeft, width - marginRight])
    .padding(padding).align(align);

  const maxY = d3.max(totalsByX, d => d.total) ?? 1;
  const yScale = d3.scaleLinear()
    .domain([0, maxY]).range([height - marginBottom, marginTop]).nice();

  let currentCat = null; // null = overview; string = focused category

  // ── SVG scaffold ──────────────────────────────────────────────────────
  const svg = d3.create("svg")
    .attr("width", width).attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("style", "max-width: 100%; height: auto; font-family: sans-serif;");

  // YTD highlight rectangle (rendered first so it sits behind everything)
  const ytdVisible = ytdKeys.filter(k => xDomain.includes(k));
  if (ytdVisible.length) {
    const step = xScale.step();
    const left  = xScale(ytdVisible[0]) - step * padding / 2;
    const right = xScale(ytdVisible[ytdVisible.length - 1]) + xScale.bandwidth() + step * padding / 2;
    svg.append("rect").attr("class", "ytd-bg")
      .attr("x", left).attr("y", marginTop - 4)
      .attr("width", right - left)
      .attr("height", height - marginBottom - marginTop + 4)
      .attr("fill", "#FDDDE6").attr("fill-opacity", 0.6).attr("rx", 8);
  }

  // Breadcrumb layer (above the background rect)
  const breadcrumbG = svg.append("g").attr("class", "breadcrumb");

  // Y-axis: tick labels and gridlines suppressed (each bar carries its own
  // total label). Only the unit annotation is kept to orient the reader.
  svg.append("text")
    .attr("x", marginLeft).attr("y", marginTop - 10)
    .attr("fill", "#777").attr("text-anchor", "start").attr("font-size", "10px")
    .text(`↑ ${yLabel}`);

  // X-axis (drawn once)
  const xAxisG = svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(xScale).tickSizeOuter(0));
  xAxisG.select(".domain").remove();
  xAxisG.selectAll(".tick text").attr("font-size", "11px");

  // Grey total-bar silhouettes: hidden in overview, fade in on drilldown to
  // give context for the total while the focused category sits at baseline.
  const totalBarsG = svg.append("g").attr("class", "total-bars");
  totalBarsG.selectAll(".total-bar")
    .data(totalsByX, d => d.x)
    .join("rect").attr("class", "total-bar")
    .attr("x", d => xScale(d.x)).attr("width", xScale.bandwidth())
    .attr("y", d => yScale(d.total))
    .attr("height", d => Math.max(0, yScale(0) - yScale(d.total)))
    .attr("fill", "#d8d8d8").attr("opacity", 0)
    .attr("pointer-events", "none");

  // Bars group
  const barsG = svg.append("g").attr("class", "bars");

  const bars = barsG.selectAll(".bar")
    .data(stacked, d => `${d.x}|${d.cat}`)
    .join("rect").attr("class", "bar")
    .attr("x", d => xScale(d.x)).attr("width", xScale.bandwidth())
    .attr("y", d => yScale(d.y1))
    .attr("height", d => Math.max(0, yScale(d.y0) - yScale(d.y1)))
    .attr("fill", d => colorScale(d.cat)).attr("fill-opacity", 0.85)
    .attr("cursor", "pointer")
    .on("mouseenter", (_, d) => {
      if (currentCat !== null) return;
      barsG.selectAll(".bar").filter(b => b.cat === d.cat)
        .attr("fill-opacity", 1);
    })
    .on("mouseleave", () => {
      if (currentCat !== null) return;
      barsG.selectAll(".bar").attr("fill-opacity", 0.85);
    })
    .on("click", (_, d) => { currentCat === null ? drillDown(d.cat) : drillUp(); });

  bars.append("title").text(d => `${d.cat}: ${valueFormat(d.volume)}`);

  // Total labels (above each bar)
  const labelsG = svg.append("g").attr("class", "labels");

  const fmtTotal = v => v > 0 ? valueFormat(v) : "";

  const totalLabels = labelsG.selectAll(".total-label")
    .data(totalsByX, d => d.x)
    .join("text").attr("class", "total-label")
    .attr("x", d => xScale(d.x) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.total) - 6)
    .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#333")
    .text(d => fmtTotal(d.total));

  // Per-category labels: one per x, hidden in overview; positioned and
  // populated on drilldown, then faded in. Faded out on drillup.
  const catLabels = labelsG.selectAll(".cat-label")
    .data(xDomain, d => d)
    .join("text").attr("class", "cat-label")
    .attr("x", d => xScale(d) + xScale.bandwidth() / 2)
    .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#333")
    .attr("opacity", 0)
    .text("");

  // Hint text at bottom
  const hintText = svg.append("text").attr("class", "hint")
    .attr("x", width / 2).attr("y", height - 4)
    .attr("text-anchor", "middle").attr("font-size", "10px").attr("fill", "#ccc")
    .text("Click a segment to focus  •  click again to go back");

  // ── Helpers ────────────────────────────────────────────────────────────
  function setBreadcrumb(cat) {
    breadcrumbG.selectAll("*").remove();
    if (!cat) return;
    const bc = breadcrumbG.append("text")
      .attr("x", marginLeft).attr("y", 16)
      .attr("font-size", "12px").attr("cursor", "pointer");
    bc.append("tspan").attr("fill", "#999").text("← All categories");
    bc.append("tspan").attr("fill", colorScale(cat)).attr("fill-opacity", 1).attr("dx", 6).text(`/ ${cat}`);
    bc.on("click", () => { if (currentCat) drillUp(); });
  }

  // ── Drilldown: focus one category ─────────────────────────────────────
  // Telescope collapse, two phases:
  //   Phase 1 — segments below the selected one shrink to the baseline; the
  //             selected slides down into their space; segments above slide
  //             down with it (their bottoms tracking the selected's top).
  //   Phase 2 — segments above then collapse downward into the top of the
  //             selected, ending as a zero-height line at yScale(volume).
  // Linear interp of (y, height) keeps the stack gap-free throughout both
  // phases — adjacent bars' edges interpolate between identical endpoints.
  function drillDown(cat) {
    currentCat = cat;
    setBreadcrumb(cat);
    hintText.text("Click to go back");

    const catVolumes = new Map(
      stacked.filter(d => d.cat === cat).map(d => [d.x, d.volume])
    );
    // base[x] = selected category's original y0 = sum of cats below it
    const baseByX = new Map(
      stacked.filter(d => d.cat === cat).map(d => [d.x, d.y0])
    );

    const PHASE = ANIM_MS / 2;

    barsG.selectAll(".bar").each(function(d) {
      const sel = d3.select(this).attr("cursor", "pointer");
      const base = baseByX.get(d.x) ?? 0;
      const vSel = catVolumes.get(d.x) ?? 0;

      if (d.cat === cat) {
        // Selected: slide down to baseline during phase 1, then hold
        sel.transition().duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(d.volume))
          .attr("height", Math.max(0, yScale(0) - yScale(d.volume)));
      } else if (d.y1 <= base) {
        // Below selected: collapse to baseline during phase 1
        sel.transition().duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(0))
          .attr("height", 0);
      } else {
        // Above selected: phase 1 slides down by `base` (height unchanged,
        // bottom tracks selected's top); phase 2 collapses onto top of
        // selected at y = yScale(vSel), height = 0
        const newY0 = d.y0 - base;
        const newY1 = d.y1 - base;
        sel.transition().duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(newY1))
          .attr("height", Math.max(0, yScale(newY0) - yScale(newY1)))
          .transition().duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(vSel))
          .attr("height", 0);
      }
    });

    // Fade grey total silhouettes in; fade total labels to grey; fade cat
    // labels in above the focused (slid-down) bar.
    totalBarsG.selectAll(".total-bar")
      .transition().duration(ANIM_MS).ease(d3.easeCubicInOut)
      .attr("opacity", 1);

    totalLabels.transition().duration(ANIM_MS).ease(d3.easeCubicInOut)
      .attr("fill", "#bbb");

    catLabels
      .attr("y", d => yScale(catVolumes.get(d) ?? 0) - 6)
      .text(d => fmtTotal(catVolumes.get(d) ?? 0))
      .transition().delay(ANIM_MS / 2).duration(ANIM_MS / 2).ease(d3.easeCubicInOut)
      .attr("opacity", 1);
  }

  // ── Back: restore full stacked view ──────────────────────────────────
  // Reverse telescope:
  //   Phase 1 — above-selected segments grow back from the top of the
  //             selected to their shifted positions (sitting on top of the
  //             still-at-baseline selected). Below stays collapsed.
  //   Phase 2 — selected slides up to its original y0; above and below
  //             segments grow back to original heights in lockstep.
  function drillUp() {
    const prevCat = currentCat;
    currentCat = null;
    setBreadcrumb(null);
    hintText.text("Click a segment to focus  •  click again to go back");

    const baseByX = new Map(
      stacked.filter(d => d.cat === prevCat).map(d => [d.x, d.y0])
    );

    const PHASE = ANIM_MS / 2;

    barsG.selectAll(".bar").each(function(d) {
      const sel = d3.select(this);
      const base = baseByX.get(d.x) ?? 0;

      if (d.cat === prevCat) {
        // Selected: hold during phase 1, slide up during phase 2
        sel.transition().delay(PHASE).duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(d.y1))
          .attr("height", Math.max(0, yScale(d.y0) - yScale(d.y1)));
      } else if (d.y1 <= base) {
        // Below selected: hold during phase 1, grow back during phase 2
        sel.transition().delay(PHASE).duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(d.y1))
          .attr("height", Math.max(0, yScale(d.y0) - yScale(d.y1)));
      } else {
        // Above selected: phase 1 grow to shifted position; phase 2 slide up
        const newY0 = d.y0 - base;
        const newY1 = d.y1 - base;
        sel.transition().duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(newY1))
          .attr("height", Math.max(0, yScale(newY0) - yScale(newY1)))
          .transition().duration(PHASE).ease(d3.easeCubicInOut)
          .attr("y", yScale(d.y1))
          .attr("height", Math.max(0, yScale(d.y0) - yScale(d.y1)));
      }
    });

    // Fade cat labels out; fade grey silhouettes out; restore total label colour.
    catLabels.transition().duration(ANIM_MS / 2).ease(d3.easeCubicInOut)
      .attr("opacity", 0);

    totalBarsG.selectAll(".total-bar")
      .transition().duration(ANIM_MS).ease(d3.easeCubicInOut)
      .attr("opacity", 0);

    totalLabels.transition().duration(ANIM_MS).ease(d3.easeCubicInOut)
      .attr("fill", "#333");
  }

  return svg.node();
}
