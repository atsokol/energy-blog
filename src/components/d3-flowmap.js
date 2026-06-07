import * as d3 from "npm:d3@7";

/**
 * flowMap({ locations, flows, project, ... }) — pure-SVG D3 flow map.
 *
 * Renders one filled <path> per directional flow (shaft + arrowhead polygon)
 * and two concentric <circle>s per location (outflow + inflow, the smaller on top).
 * Projection is caller-owned: pass any ([lon,lat]) => [x,y] function
 * (d3.geoMercator, mapbox map.project, etc.).
 *
 * No animation, no clustering. Hover tooltips and scale-domain locking are built in;
 * pass `radiusDomain` / `widthDomain` to make multiple maps visually comparable.
 *
 * Returns { node(), update(patch), destroy() }.
 *   update(patch)  shallow-merges any of {locations, flows, project,
 *                  radiusDomain, widthDomain} and re-renders.
 *   destroy()      removes the SVG + tooltip + listeners.
 */
export function flowMap({
  locations,
  flows,
  project,
  width = 640,
  height = 480,
  maxCircleRadius = 30,
  maxArrowWidth = 12,
  inColor = "#137CBD",       // inflow circle — string OR (loc, totals) => string
  outColor = "#FFC940",      // outflow circle — string OR (loc, totals) => string
  showLabels = false,        // draw loc.name as a text layer offset from each node
  labelFontSize = 12,
  labelFontWeight = 600,
  labelColor = "#495057",
  labelHaloColor = "white",
  labelHaloWidth = 3,
  labelGap = 4,              // px between circle edge and label anchor point
  arrowColor = "#888",       // string OR (flow) => string
  arrowOpacity = 0.75,
  circleStroke = "#222",
  circleStrokeWidth = 0.75,
  background = null,
  backgroundFeatures = null, // array of GeoJSON features drawn beneath flows
  geoPath = null,            // d3.geoPath instance for projecting backgroundFeatures
  backgroundFill = "#eef1f4",
  backgroundStroke = "#bcc4cc",
  backgroundStrokeWidth = 0.6,
  radiusDomain = null,       // [min, max] for sqrt circle-radius scale; omit = auto
  widthDomain = null,        // [min, max] for linear arrow-width scale;  omit = auto
  nodeTooltip = defaultNodeTooltip,
  flowTooltip = defaultFlowTooltip,
  gap = 2,                   // px between circle edge and arrow endpoint
  centerlineOffset = 0.5,    // px perpendicular gap between arrow body and S→T centerline
                             // (so reverse-direction arrows don't touch). Matches
                             // flowmap.gl's uniform `gap: 0.5` in FlowLinesLayerVertex.glsl.
} = {}) {
  const wrap = d3.create("div")
      .style("position", "relative")
      .style("display", "inline-block")
      .style("line-height", 0);

  const svg = wrap.append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("display", "block")
      .style("overflow", "visible");

  if (background) {
    svg.append("rect")
      .attr("width", width).attr("height", height)
      .attr("fill", background);
  }

  const gBackground = svg.append("g").attr("class", "background");
  const gFlows = svg.append("g").attr("class", "flows");
  const gNodes = svg.append("g").attr("class", "nodes");
  const gLabels = svg.append("g").attr("class", "labels")
      .style("pointer-events", "none")
      .style("font", `${labelFontWeight} ${labelFontSize}px sans-serif`);

  if (backgroundFeatures && geoPath) {
    const clipId = `flowmap-clip-${Math.random().toString(36).slice(2, 9)}`;
    svg.append("defs").append("clipPath")
        .attr("id", clipId)
      .append("rect")
        .attr("width", width).attr("height", height);
    gBackground.attr("clip-path", `url(#${clipId})`);
    gBackground.selectAll("path")
      .data(backgroundFeatures)
      .enter().append("path")
        .attr("d", geoPath)
        .attr("fill", backgroundFill)
        .attr("stroke", backgroundStroke)
        .attr("stroke-width", backgroundStrokeWidth)
        .style("pointer-events", "none");
  }

  const tip = wrap.append("div")
      .attr("class", "d3-flowmap-tooltip")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("z-index", 10)
      .style("background", "rgba(0,0,0,0.78)")
      .style("color", "#fff")
      .style("padding", "4px 8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .style("white-space", "nowrap")
      .style("line-height", 1.3)
      .style("display", "none");

  let state = { locations, flows, project, radiusDomain, widthDomain };

  function render() {
    const { locations, flows, project, radiusDomain, widthDomain } = state;
    const locById = new Map(locations.map(l => [l.id, l]));

    // Aggregate in/out per location. Self-loops contribute to BOTH (flowmap.gl convention).
    const totals = new Map(locations.map(l => [l.id, { in: 0, out: 0 }]));
    for (const f of flows) {
      const m = +f.magnitude;
      if (!(m > 0)) continue;
      const o = totals.get(f.origin); if (o) o.out += m;
      const d = totals.get(f.dest);   if (d) d.in  += m;
    }

    // Scales (clamped so locked domains don't blow up out-of-range values).
    const rMax = radiusDomain
      ? radiusDomain[1]
      : (d3.max(totals.values(), t => Math.max(t.in, t.out)) || 1);
    const wMax = widthDomain
      ? widthDomain[1]
      : (d3.max(flows, f => +f.magnitude) || 1);
    const rScale = d3.scaleSqrt().domain([0, rMax]).range([0, maxCircleRadius]).clamp(true);
    const wScale = d3.scaleLinear().domain([0, wMax]).range([0, maxArrowWidth]).clamp(true);

    // Project once; cache outflow radius per node (used to gap the arrows).
    const nodes = locations.map(l => {
      const [x, y] = project([l.lon, l.lat]);
      const t = totals.get(l.id);
      const rOut = rScale(t.out);
      const rIn  = rScale(t.in);
      return {
        loc: l, totals: t, x, y, rOut, rIn,
        rOuter: Math.max(rOut, rIn),   // outermost edge — used for arrow gap
      };
    });
    const nodeById = new Map(nodes.map(n => [n.loc.id, n]));

    // Build arrow path strings.
    const arrows = [];
    for (const f of flows) {
      if (f.origin === f.dest) continue;
      const s = nodeById.get(f.origin);
      const t = nodeById.get(f.dest);
      if (!s || !t) continue;
      const w = wScale(+f.magnitude);
      if (!(w > 0)) continue;
      const dx = t.x - s.x, dy = t.y - s.y;
      const len = Math.hypot(dx, dy);
      if (!(len > 0)) continue;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;            // left-perpendicular (in svg coords)
      const headLen = Math.max(2.5 * w, 7);
      const startCut = s.rOuter + gap;
      const endCut   = t.rOuter + gap;
      if (len - startCut - endCut <= headLen) continue;  // would be degenerate
      const sx = s.x + ux * startCut, sy = s.y + uy * startCut;
      const tx = t.x - ux * endCut,   ty = t.y - uy * endCut;
      const jx = tx - ux * headLen,   jy = ty - uy * headLen;  // shaft-head junction
      // Asymmetric single-sided arrow (flowmap.gl style). One edge of the body
      // sits parallel to the S→T centerline, offset by `centerlineOffset` so the
      // reverse flow (B→A, which lands on the opposite perpendicular side) has a
      // small visible gap and the two don't visually touch. The body extends a
      // further `w` (shaft) and `2w` (arrowhead wing) perpendicular on top.
      const cOff = centerlineOffset;
      const path =
        `M${sx + nx * cOff},${sy + ny * cOff}` +
        `L${sx + nx * (cOff + w)},${sy + ny * (cOff + w)}` +
        `L${jx + nx * (cOff + w)},${jy + ny * (cOff + w)}` +
        `L${jx + nx * (cOff + 2 * w)},${jy + ny * (cOff + 2 * w)}` +
        `L${tx + nx * cOff},${ty + ny * cOff}` +
        `Z`;
      const color = typeof arrowColor === "function" ? arrowColor(f) : arrowColor;
      arrows.push({ path, color, flow: f });
    }

    // ── flows ──
    const fSel = gFlows.selectAll("path").data(arrows, (_, i) => i);
    fSel.exit().remove();
    fSel.enter().append("path")
        .attr("fill-opacity", arrowOpacity)
        .on("mouseenter", function(event, d) { showTip(flowTooltip(d.flow, locById), event); })
        .on("mousemove",  moveTipHandler)
        .on("mouseleave", hideTip)
      .merge(fSel)
        .attr("d", d => d.path)
        .attr("fill", d => d.color);

    // ── nodes (outer circle behind, inner on top) ──
    const nSel = gNodes.selectAll("g.node").data(nodes, d => d.loc.id);
    nSel.exit().remove();
    const nEnter = nSel.enter().append("g").attr("class", "node")
        .on("mouseenter", function(event, d) { showTip(nodeTooltip(d.loc, d.totals), event); })
        .on("mousemove",  moveTipHandler)
        .on("mouseleave", hideTip);
    nEnter.append("circle").attr("class", "bg");
    nEnter.append("circle").attr("class", "fg");
    const nAll = nEnter.merge(nSel);
    nAll.attr("transform", d => `translate(${d.x},${d.y})`);
    // Bigger circle on the bottom, smaller on top — outColor marks outflow, inColor marks
    // inflow. Both may be functions (loc, totals) => color so callers can encode meaning
    // (e.g. flow direction relative to a hub) instead of just in-vs-out at the node.
    const resolveColor = (c, d) => typeof c === "function" ? c(d.loc, d.totals) : c;
    nAll.select("circle.bg")
        .attr("r",            d => Math.max(d.rOut, d.rIn))
        .attr("fill",         d => d.rOut >= d.rIn ? resolveColor(outColor, d) : resolveColor(inColor, d))
        .attr("stroke",       circleStroke)
        .attr("stroke-width", circleStrokeWidth);
    nAll.select("circle.fg")
        .attr("r",            d => Math.min(d.rOut, d.rIn))
        .attr("fill",         d => d.rOut >= d.rIn ? resolveColor(inColor, d) : resolveColor(outColor, d))
        .attr("stroke",       circleStroke)
        .attr("stroke-width", circleStrokeWidth);

    // ── labels (offset from each node by loc.labelDir, just outside the outer circle) ──
    const labelData = showLabels
      ? nodes.filter(d => d.loc.name)
      : [];
    const lSel = gLabels.selectAll("text").data(labelData, d => d.loc.id);
    lSel.exit().remove();
    const lEnter = lSel.enter().append("text")
        .attr("fill", labelColor)
        .attr("stroke", labelHaloColor)
        .attr("stroke-width", labelHaloWidth)
        .attr("paint-order", "stroke");
    lEnter.merge(lSel).each(function(d) {
      const dir = d.loc.labelDir || "N";
      const off = d.rOuter + labelGap;
      const p = labelPlacement(dir, off);
      d3.select(this)
        .attr("x", d.x + p.dx)
        .attr("y", d.y + p.dy)
        .attr("text-anchor", p.anchor)
        .attr("dominant-baseline", p.baseline)
        .text(d.loc.name);
    });
  }

  function showTip(html, event) {
    if (html == null || html === "") return;
    tip.html(html).style("display", "block");
    moveTip(event);
  }
  function moveTipHandler(event) { moveTip(event); }
  function moveTip(event) {
    tip.style("left", `${event.clientX + 12}px`)
       .style("top",  `${event.clientY + 12}px`);
  }
  function hideTip() { tip.style("display", "none"); }

  render();

  return {
    node: () => wrap.node(),
    update(patch = {}) {
      state = { ...state, ...patch };
      render();
    },
    destroy() {
      hideTip();
      wrap.remove();
    },
  };
}

// Returns {dx, dy, anchor, baseline} for placing a text element relative to a
// node centre, offset by `off` pixels in the given 8-way compass direction.
function labelPlacement(dir, off) {
  const s = Math.SQRT1_2;
  switch (dir) {
    case "N":  return {dx: 0,        dy: -off,    anchor: "middle", baseline: "alphabetic"};
    case "S":  return {dx: 0,        dy:  off,    anchor: "middle", baseline: "hanging"};
    case "E":  return {dx:  off,     dy:  0,      anchor: "start",  baseline: "middle"};
    case "W":  return {dx: -off,     dy:  0,      anchor: "end",    baseline: "middle"};
    case "NE": return {dx:  s * off, dy: -s * off, anchor: "start", baseline: "alphabetic"};
    case "NW": return {dx: -s * off, dy: -s * off, anchor: "end",   baseline: "alphabetic"};
    case "SE": return {dx:  s * off, dy:  s * off, anchor: "start", baseline: "hanging"};
    case "SW": return {dx: -s * off, dy:  s * off, anchor: "end",   baseline: "hanging"};
    default:   return {dx: 0,        dy: -off,    anchor: "middle", baseline: "alphabetic"};
  }
}

function defaultNodeTooltip(loc, totals) {
  const fmt = d3.format(",.1f");
  return `<b>${loc.name ?? loc.id}</b><br>in: ${fmt(totals.in)}<br>out: ${fmt(totals.out)}`;
}

function defaultFlowTooltip(flow, locById) {
  const fmt = d3.format(",.1f");
  const a = locById.get(flow.origin)?.name ?? flow.origin;
  const b = locById.get(flow.dest)?.name ?? flow.dest;
  return `<b>${a} → ${b}</b><br>${fmt(+flow.magnitude)}`;
}
