import * as d3 from "npm:d3@7";

/**
 * createSpikeMap(container, data, options)
 *
 * D3 spike layer on top of a Mapbox GL JS basemap.
 * The container must already be in the DOM — call display() on it before passing it here.
 *
 * @param {HTMLElement} container  — already-displayed element (display() called by caller)
 * @param {Array<{uid, lon, lat, net}>} data  — one row per station
 * @param {object} options
 *   mapboxgl     {object}  required — pass window.mapboxgl (bare identifier triggers broken ESM auto-import)
 *   mapboxToken  {string}  required
 *   maxSpikeLen  {number}  max spike px length, default 60
 *   baseWidth    {number}  spike base px width, default 6
 *
 * @returns {{ update(data), destroy() }}
 */
export function createSpikeMap(container, data, {
  mapboxgl,
  mapboxToken,
  maxSpikeLen = 60,
  baseWidth = 6,
} = {}) {
  if (!mapboxgl)    throw new Error("createSpikeMap: mapboxgl is required");
  if (!mapboxToken) throw new Error("createSpikeMap: mapboxToken is required");

  mapboxgl.accessToken = mapboxToken;

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // ── Mapbox GL map ──────────────────────────────────────────────────────────
  // Container is already in the DOM, so Mapbox reads correct dimensions.
  const map = new mapboxgl.Map({
    container,
    style: isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
    center: [21.012, 52.229],
    zoom: 11.5,
    attributionControl: false,
  });
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  // ── D3 SVG overlay ─────────────────────────────────────────────────────────
  // Appended to Mapbox's canvas container so it sits above the tiles.
  const svg = d3.select(map.getCanvasContainer())
    .append("svg")
    .style("position", "absolute")
    .style("top", 0).style("left", 0)
    .style("width", "100%").style("height", "100%")
    .style("pointer-events", "none");

  // ── Tooltip ────────────────────────────────────────────────────────────────
  const tooltip = document.createElement("div");
  tooltip.style.cssText = [
    "position:absolute", "pointer-events:none",
    "background:rgba(255,255,255,0.93)", "color:#111",
    "font-size:12px", "padding:4px 8px", "border-radius:4px",
    "box-shadow:0 1px 4px rgba(0,0,0,0.2)", "display:none", "z-index:100",
  ].join(";");
  container.appendChild(tooltip);

  // ── State ──────────────────────────────────────────────────────────────────
  let currentData = data;

  // ── Render ─────────────────────────────────────────────────────────────────
  // Called on load, move, and data update. map.project() re-pins spikes to the
  // current viewport on every call, so pan/zoom stays in sync automatically.
  function render() {
    const maxAbs = d3.max(currentData, d => Math.abs(d.net)) || 1;

    const lengthScale = d3.scaleLinear()
      .domain([0, maxAbs]).range([0, maxSpikeLen]).clamp(true);

    const colorScale = d3.scaleDiverging(d3.interpolateRdBu)
      .domain([-maxAbs, 0, maxAbs]);

    function spikePath(d) {
      const { x, y } = map.project([+d.lon, +d.lat]);
      const h = lengthScale(Math.abs(d.net));
      const w = baseWidth / 2;
      const tipY = d.net >= 0 ? y - h : y + h;  // positive → up, negative → down
      return `M${x - w},${y} L${x},${tipY} L${x + w},${y} Z`;
    }

    svg.selectAll("path.spike")
      .data(currentData, d => d.uid)
      .join("path")
      .attr("class", "spike")
      .attr("d", spikePath)
      .attr("fill", d => colorScale(d.net))
      .attr("fill-opacity", 0.85)
      .attr("stroke", d => colorScale(d.net))
      .attr("stroke-width", 0.5)
      .style("pointer-events", "all")
      .on("mouseenter", function (_event, d) {
        tooltip.innerHTML = `<b>Station ${d.uid}</b><br>Net: ${d3.format("+,d")(d.net)} trips`;
        tooltip.style.display = "block";
      })
      .on("mousemove", function (_event) {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = `${_event.clientX - rect.left + 10}px`;
        tooltip.style.top  = `${_event.clientY - rect.top  - 28}px`;
      })
      .on("mouseleave", () => { tooltip.style.display = "none"; });
  }

  map.on("load", render);
  map.on("move", render);

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    update(newData) {
      currentData = newData;
      if (map.loaded()) render();
    },
    destroy() {
      map.off("load", render);
      map.off("move", render);
      map.remove();
    },
  };
}
