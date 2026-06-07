import * as d3 from "npm:d3";
import {sankey, sankeyLinkHorizontal, sankeyJustify} from "npm:d3-sankey";

/**
 * PortFlowSankey — three-layer flow diagram (cargo → port → operator group)
 * with cargo-colored bands at every layer.
 *
 * Each record is a single observation: {cargo, port, group, value}. Items
 * outside the top-N per layer are collapsed into `otherLabel`. Link bands at
 * each node are ordered by the vertical position of the opposite end (target
 * for outgoing, source for incoming) to minimise visual crossings.
 *
 * @param {Array}  data   Flat array of {cargo, port, group, value}.
 * @param {Object} opts
 * @param {number}   opts.width
 * @param {number}   opts.height
 * @param {number}   opts.marginTop
 * @param {number}   opts.marginRight
 * @param {number}   opts.marginBottom
 * @param {number}   opts.marginLeft
 * @param {number}   opts.topCargos  How many cargo nodes to keep before "other"
 * @param {number}   opts.topPorts
 * @param {number}   opts.topGroups
 * @param {string}   opts.otherLabel  Label used for the residual bucket.
 * @param {Map}      opts.cargoColors Map(cargo name → hex). Cargoes outside
 *                                    the map (including `otherLabel`) get
 *                                    `otherColor`.
 * @param {string}   opts.otherColor  Colour for cargoes/ports/groups not in
 *                                    the map and for the residual bucket.
 * @param {string}   opts.valueLabel  Tooltip unit suffix.
 */
export function PortFlowSankey(data, {
  width        = 800,
  height       = 560,
  marginTop    = 20,
  marginRight  = 185,
  marginBottom = 10,
  marginLeft   = 150,
  topCargos    = 5,
  topPorts     = 5,
  topGroups    = 10,
  otherLabel   = "Other",
  cargoColors  = new Map(),
  otherColor   = "#C7C7C7",
  valueLabel   = "kt",
} = {}) {
  // Top-N per layer; everything else folds into `otherLabel`
  const topCList = d3.groupSort(data, v => -d3.sum(v, d => d.value), d => d.cargo)
    .filter(c => c !== otherLabel).slice(0, topCargos);
  const topPList = d3.groupSort(data, v => -d3.sum(v, d => d.value), d => d.port)
    .filter(p => p !== otherLabel).slice(0, topPorts);
  const topGList = d3.groupSort(data, v => -d3.sum(v, d => d.value), d => d.group)
    .filter(g => g !== otherLabel).slice(0, topGroups);

  const cargoOf = d => topCList.includes(d.cargo) ? d.cargo : otherLabel;
  const portOf  = d => topPList.includes(d.port)  ? d.port  : otherLabel;
  const groupOf = d => topGList.includes(d.group) ? d.group : otherLabel;

  // cargo → port links
  const cpLinks = d3.flatRollup(
    data, v => d3.sum(v, d => d.value),
    d => `c:${cargoOf(d)}`, d => `p:${portOf(d)}`
  ).map(([source, target, value]) => ({source, target, value, cargo: source.slice(2)}));

  // port → operator links split by cargo so they can be coloured independently
  const poLinks = d3.flatRollup(
    data, v => d3.sum(v, d => d.value),
    d => `p:${portOf(d)}`, d => `o:${groupOf(d)}`, d => cargoOf(d)
  ).map(([source, target, cargo, value]) => ({source, target, value, cargo}));

  const allLinks = [...cpLinks, ...poLinks].filter(d => d.value > 0);
  const usedNodes = new Set([...allLinks.map(d => d.source), ...allLinks.map(d => d.target)]);
  const sankeyNodes = [...usedNodes].map(id => ({id, name: id.slice(2)}));
  const sankeyLinks = allLinks.map(({source, target, value, cargo}) => ({source, target, value, cargo}));

  // Sort bands by cargo so the colour stack is consistent across all nodes
  const cargoOrder = new Map([...topCList, otherLabel].map((c, i) => [c, i]));

  const sk = sankey()
    .nodeId(d => d.id)
    .nodeAlign(sankeyJustify)
    .nodeWidth(14)
    .nodePadding(8)
    .linkSort((a, b) => (cargoOrder.get(a.cargo) ?? 99) - (cargoOrder.get(b.cargo) ?? 99))
    .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]]);

  const {nodes, links} = sk({nodes: sankeyNodes, links: sankeyLinks});

  // Fixed mapping — cargo name → colour. Unknown / "other" → otherColor.
  const cargoColor = name => cargoColors.get(name) ?? otherColor;
  const linkColor = l => l.cargo ? cargoColor(l.cargo) : otherColor;

  const svg = d3.create("svg")
    .attr("width", width).attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("style", "max-width:100%;height:auto;font-family:sans-serif;");

  const linkPath = svg.append("g").attr("fill", "none")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke", linkColor)
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("stroke-opacity", 0.35);

  linkPath.append("title")
    .text(d => `${d.source.name} → ${d.target.name}\n${d3.format(",.0f")(d.value)} ${valueLabel}`);

  const nodeG = svg.append("g");

  const nodeRect = nodeG.selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", d => d.x0).attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => Math.max(1, d.y1 - d.y0))
    .attr("fill", d => d.id.startsWith("c:") ? cargoColor(d.name) : "#888")
    .attr("fill-opacity", 0.85)
    .style("cursor", "pointer")
    .on("mouseenter", function(_, d) {
      const downstreamPorts = d.id.startsWith("c:")
        ? new Set(links.filter(l => l.source === d).map(l => l.target))
        : null;
      linkPath.attr("stroke-opacity", l => {
        if (l.source === d || l.target === d) return 0.7;
        if (downstreamPorts && downstreamPorts.has(l.source) && l.cargo === d.name) return 0.7;
        return 0.05;
      });
    })
    .on("mouseleave", () => linkPath.attr("stroke-opacity", 0.35));

  nodeRect.append("title")
    .text(d => `${d.name}\n${d3.format(",.0f")(d.value)} ${valueLabel}`);

  // Total flow per layer is identical; use the cargo layer as the denominator
  // for port/operator shares. Cargo nodes show absolute volume instead.
  const totalFlow = d3.sum(nodes.filter(d => d.id.startsWith("c:")), d => d.value);
  const truncName = name => name.length > 30 ? name.slice(0, 28) + "…" : name;
  const nodeMetric = d => d.id.startsWith("c:")
    ? d3.format(",.0f")(d.value)
    : d3.format(".0%")(d.value / totalFlow);

  const nodeText = nodeG.selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .attr("font-size", "11px")
    .attr("fill", "#333");

  nodeText.append("tspan").text(d => truncName(d.name));
  nodeText.append("tspan")
    .text(d => `  ${nodeMetric(d)}`);

  return svg.node();
}
