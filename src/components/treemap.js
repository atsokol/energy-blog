import * as d3 from "npm:d3";

export function Treemap(data, {
  path,
  id = Array.isArray(data) ? d => d.id : null,
  parentId = Array.isArray(data) ? d => d.parentId : null,
  children,
  value,
  sort = (a, b) => d3.descending(a.value, b.value),
  label,
  group,
  title,
  link,
  linkTarget = "_blank",
  tile = d3.treemapBinary,
  width = 640,
  height = 400,
  margin = 0,
  marginTop = margin,
  marginRight = margin,
  marginBottom = margin,
  marginLeft = margin,
  padding = 1,
  paddingInner = padding,
  paddingOuter = padding,
  paddingTop = paddingOuter,
  paddingRight = paddingOuter,
  paddingBottom = paddingOuter,
  paddingLeft = paddingOuter,
  round = true,
  colors = d3.schemeTableau10,
  zDomain,
  fill = "#ccc",
  fillOpacity = group == null ? null : 0.6,
  stroke,
  strokeWidth,
  strokeOpacity,
  strokeLinejoin,
} = {}) {
  const stratify = data => (d3.stratify().path(path)(data)).each(node => {
    if (node.children?.length && node.data != null) {
      const child = new d3.Node(node.data);
      node.data = null;
      child.depth = node.depth + 1;
      child.height = 0;
      child.parent = node;
      child.id = node.id + "/";
      node.children.unshift(child);
    }
  });
  const root = path != null ? stratify(data)
      : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  value == null ? root.count() : root.sum(d => Math.max(0, d ? value(d) : null));

  const leaves = root.leaves();
  const G = group == null ? null : leaves.map(d => group(d.data, d));
  if (zDomain === undefined) zDomain = G;
  zDomain = new d3.InternSet(zDomain);
  const color = group == null ? null : d3.scaleOrdinal(zDomain, colors);

  const L = label == null ? null : leaves.map(d => label(d.data, d));
  const T = title === undefined ? L : title == null ? null : leaves.map(d => title(d.data, d));

  if (sort != null) root.sort(sort);

  d3.treemap()
      .tile(tile)
      .size([width - marginLeft - marginRight, height - marginTop - marginBottom])
      .paddingInner(paddingInner)
      .paddingTop(paddingTop)
      .paddingRight(paddingRight)
      .paddingBottom(paddingBottom)
      .paddingLeft(paddingLeft)
      .round(round)
    (root);

  const svg = d3.create("svg")
      .attr("viewBox", [-marginLeft, -marginTop, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10);

  const node = svg.selectAll("a")
    .data(leaves)
    .join("a")
      .attr("xlink:href", link == null ? null : (d, i) => link(d.data, d))
      .attr("target", link == null ? null : linkTarget)
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

  node.append("rect")
      .attr("fill", color ? (d, i) => color(G[i]) : fill)
      .attr("fill-opacity", fillOpacity)
      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", strokeOpacity)
      .attr("stroke-linejoin", strokeLinejoin)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0);

  if (T) {
    node.append("title").text((d, i) => T[i]);
  }

  if (L) {
    const uid = `O-${Math.random().toString(16).slice(2)}`;

    node.append("clipPath")
        .attr("id", (d, i) => `${uid}-clip-${i}`)
      .append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    node.append("text")
        .attr("clip-path", (d, i) => `url(${new URL(`#${uid}-clip-${i}`, location)})`)
      .selectAll("tspan")
      .data((d, i) => `${L[i]}`.split(/\n/g))
      .join("tspan")
        .attr("x", 3)
        .attr("y", (d, i, D) => `${(i === D.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
        .attr("fill-opacity", (d, i, D) => i === D.length - 1 ? 0.7 : null)
        .text(d => d);
  }

  return Object.assign(svg.node(), {scales: {color}});
}
