// @flowmap.gl/layers 8 + deck.gl 8 pre-bundled approach.
// Mapbox GL provides basemap tiles; deck.gl (controller:true) owns interaction.
// Cameras sync via deck.gl's onViewStateChange → map.jumpTo().
//
// The bundle (flowmap-bundle.js) is produced by:
//   npm run bundle-flowmap
// This sidesteps the CDN CJS→ESM conversion that fails for luma.gl 8.x:
//   jsDelivr — missing `getBrowser` from probe.gl
//   esm.sh   — missing `getVertexFormatFromAttribute` from @luma.gl/webgl
//
// mapboxgl is passed as a parameter — loaded as UMD global via observablehq.config.js head.
import { Deck, MapView, FlowmapLayer, getViewStateForLocations } from "./flowmap-bundle.js";

/**
 * createFlowMap(stations, flows, options)
 *
 * Renders origin–destination flows as a FlowmapLayer overlaid on a Mapbox GL basemap.
 * Includes zoom +/− controls and a play/pause animation button.
 *
 * @param {Array<{uid, lat, lon}>} stations  — pass a stable reference (built once)
 * @param {Array<{from, to, count}>} flows   — initial time slice
 * @param {object} options
 *   mapboxgl    {object}   required — pass window.mapboxgl
 *   mapboxToken {string}   required
 *   allFlows    {Array}    all flows across all slices — used for constant-scale normalisation
 *   width       {number}   default 640
 *   height      {number}   default 480
 *
 * @returns {{ element, update(flows), setSlices(slices), destroy() }}
 *   setSlices — array of { label: string, flows: Array } for animation cycling
 *   update    — manual slice update; no-op while animation is playing
 */
export function createFlowMap(stations, flows, {
  mapboxgl,
  mapboxToken,
  allFlows = flows,
  width = 640,
  height = 480,
} = {}) {
  if (!mapboxgl)    throw new Error("createFlowMap: mapboxgl is required");
  if (!mapboxToken) throw new Error("createFlowMap: mapboxToken is required");

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Convert stations to FlowmapLayer location format once
  const locations = stations.map((s) => ({
    id:   String(s.uid),
    lat:  +s.lat,
    lon:  +s.lon,
    name: s.name ?? String(s.uid),
  }));

  // Global max for constant visual scale across all time slices.
  // FlowmapLayer normalises internally against the current frame's max, so we
  // anchor every frame by injecting an invisible self-loop (origin === dest)
  // with count = globalMaxCount. Self-loops don't render as arcs but ARE
  // included in the layer's internal scale computation, fixing the ceiling.
  const globalMaxCount = allFlows.reduce((m, f) => Math.max(m, +f.count), 1);
  const anchorFlowId   = locations[0]?.id ?? "0";
  const locationById   = new Map(locations.map((l) => [l.id, l]));

  // Compute initial view state from station bounding box, then bump zoom by 1
  const _vs = getViewStateForLocations(
    locations,
    (loc) => [loc.lon, loc.lat],
    [width, height],
    { pad: 0.3 }
  );
  const initialViewState = { ..._vs, zoom: _vs.zoom + 1 };

  // ── DOM ────────────────────────────────────────────────────────────────────
  const container = document.createElement("div");
  container.style.cssText =
    `position:relative;width:${width}px;height:${height}px;border-radius:4px;overflow:hidden`;

  const mapDiv = document.createElement("div");
  mapDiv.style.cssText = "position:absolute;inset:0";
  container.appendChild(mapDiv);

  const deckCanvas = document.createElement("canvas");
  deckCanvas.width  = width;
  deckCanvas.height = height;
  // deck.gl owns interaction, so the canvas must receive pointer events
  deckCanvas.style.cssText = "position:absolute;inset:0";
  container.appendChild(deckCanvas);

  // ── Zoom controls (top-right) ─────────────────────────────────────────────
  const zoomBtnBase = [
    "position:absolute", "right:10px", "z-index:2", "width:30px", "height:30px",
    "border:1px solid rgba(0,0,0,.20)", "border-radius:4px",
    "background:rgba(255,255,255,0.92)", "color:#333", "cursor:pointer",
    "font-size:18px", "line-height:1", "box-shadow:0 1px 4px rgba(0,0,0,.25)",
    "display:flex", "align-items:center", "justify-content:center",
  ].join(";");
  const btnZoomIn  = document.createElement("button");
  btnZoomIn.textContent = "+";
  btnZoomIn.style.cssText = zoomBtnBase + ";top:10px";
  const btnZoomOut = document.createElement("button");
  btnZoomOut.textContent = "\u2212";
  btnZoomOut.style.cssText = zoomBtnBase + ";top:46px";
  container.appendChild(btnZoomIn);
  container.appendChild(btnZoomOut);

  // ── Animation bar (bottom-centre) ─────────────────────────────────────────
  const animBar = document.createElement("div");
  animBar.style.cssText = [
    "position:absolute", "bottom:28px", "left:50%", "transform:translateX(-50%)",
    "z-index:2", "display:none",   // hidden until setSlices() is called
    "align-items:center", "gap:8px",
    "background:rgba(0,0,0,0.60)", "color:#fff",
    "border-radius:20px", "padding:4px 14px 4px 8px",
    "font-size:12px", "font-family:sans-serif", "white-space:nowrap",
    "user-select:none",
  ].join(";");
  const btnPlay = document.createElement("button");
  btnPlay.textContent = "▶";
  btnPlay.style.cssText =
    "background:none;border:none;color:#fff;cursor:pointer;font-size:14px;padding:0 4px;line-height:1";
  const frameLabel = document.createElement("span");
  animBar.appendChild(btnPlay);
  animBar.appendChild(frameLabel);
  container.appendChild(animBar);

  // ── Mapbox GL ──────────────────────────────────────────────────────────────
  mapboxgl.accessToken = mapboxToken;
  const map = new mapboxgl.Map({
    container: mapDiv,
    style: isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
    center:    [initialViewState.longitude, initialViewState.latitude],
    zoom:       initialViewState.zoom,
    bearing:    initialViewState.bearing ?? 0,
    pitch:      initialViewState.pitch   ?? 0,
    interactive: false,   // deck.gl owns all pan/zoom/navigation
    attributionControl: false,
  });
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

  // ── State ──────────────────────────────────────────────────────────────────
  let currentFlows = flows;
  let deck         = null;
  let currentVS    = { ...initialViewState };

  // animation
  let slices     = [];
  let sliceIdx   = 0;
  let playing    = false;
  let animTimer  = null;

  // ── Layer builder ──────────────────────────────────────────────────────────
  function buildLayer(sliceFlows) {
    return new FlowmapLayer({
      id: "flowmap",
      data: {
        locations,
        flows: [
          // Invisible anchor: self-loop pins the internal colour/width scale
          // to globalMaxCount for every frame, making slices visually comparable.
          { origin: anchorFlowId, dest: anchorFlowId, count: globalMaxCount },
          ...sliceFlows.map((f) => ({
            origin: String(f.from),
            dest:   String(f.to),
            count:  +f.count,
          })),
        ],
      },
      getLocationId:    (loc)  => loc.id,
      getLocationLat:   (loc)  => loc.lat,
      getLocationLon:   (loc)  => loc.lon,
      getFlowOriginId:  (flow) => flow.origin,
      getFlowDestId:    (flow) => flow.dest,
      getFlowMagnitude: (flow) => flow.count,
      getLocationName:  (loc)  => loc.name,
      pickable: true,
      darkMode: isDark,
    });
  }

  // ── Camera sync: deck.gl → Mapbox ──────────────────────────────────────────
  // deck.gl is the authoritative controller (controller:true). On every view
  // state change we push the new state back into deck.gl (required for
  // controlled mode to keep responding to user interaction) and sync Mapbox.
  function syncCamera({ viewState }) {
    currentVS = viewState;
    if (deck) deck.setProps({ viewState });   // keeps controlled mode live
    map.jumpTo({
      center:  [viewState.longitude, viewState.latitude],
      zoom:     viewState.zoom,
      bearing:  viewState.bearing,
      pitch:    viewState.pitch,
    });
  }

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  function changeZoom(delta) {
    currentVS = { ...currentVS, zoom: currentVS.zoom + delta };
    if (deck) deck.setProps({ viewState: currentVS });
    map.jumpTo({
      center:  [currentVS.longitude, currentVS.latitude],
      zoom:     currentVS.zoom,
      bearing:  currentVS.bearing,
      pitch:    currentVS.pitch,
    });
  }
  btnZoomIn .addEventListener("click", () => changeZoom(+1));
  btnZoomOut.addEventListener("click", () => changeZoom(-1));

  // ── Animation helpers ─────────────────────────────────────────────────────
  function showFrame(idx) {
    if (!slices.length) return;
    sliceIdx = ((idx % slices.length) + slices.length) % slices.length;
    const s = slices[sliceIdx];
    frameLabel.textContent = s.label;
    if (deck) deck.setProps({ layers: [buildLayer(s.flows)] });
  }

  function stopAnim() {
    playing = false;
    btnPlay.textContent = "▶";
    clearInterval(animTimer);
    animTimer = null;
  }

  function startAnim() {
    if (!slices.length) return;
    playing = true;
    btnPlay.textContent = "⏸";
    animTimer = setInterval(() => showFrame(sliceIdx + 1), 800);
  }

  btnPlay.addEventListener("click", () => { if (playing) stopAnim(); else startAnim(); });

  // ── Init ───────────────────────────────────────────────────────────────────
  map.on("load", () => {
    map.resize();
    deck = new Deck({
      canvas: deckCanvas,
      width,
      height,
      views: [new MapView({ id: "map" })],
      initialViewState,
      controller: true,
      onViewStateChange: syncCamera,
      layers: [buildLayer(currentFlows)],
      getTooltip({ object }) {
        if (!object) return null;
        // Flow arc — has origin/dest fields
        if (object.origin != null && object.dest != null) {
          if (object.origin === object.dest) return null; // anchor self-loop
          const from = locationById.get(object.origin)?.name ?? object.origin;
          const to   = locationById.get(object.dest)?.name   ?? object.dest;
          return {
            html: `<b>${from}</b> → <b>${to}</b><br>${Math.round(object.count).toLocaleString()} trips`,
            style: { fontSize: "12px", padding: "6px 10px", borderRadius: "4px" },
          };
        }
        // Location circle — has id/name fields
        if (object.id != null) {
          return {
            html: `<b>${object.name ?? object.id}</b>`,
            style: { fontSize: "12px", padding: "6px 10px", borderRadius: "4px" },
          };
        }
        return null;
      },
    });
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    element: container,

    /** Manual slice update. No-op while animation is playing. */
    update(newFlows) {
      currentFlows = newFlows;
      if (!playing && deck) deck.setProps({ layers: [buildLayer(newFlows)] });
    },

    /**
     * Set the ordered list of animation frames.
     * Each entry: { label: string, flows: Array<{from, to, count}> }
     * Resets to paused at frame 0.
     */
    setSlices(newSlices) {
      stopAnim();
      slices   = newSlices ?? [];
      sliceIdx = 0;
      if (slices.length) {
        animBar.style.display = "flex";
        frameLabel.textContent = slices[0].label;
      } else {
        animBar.style.display = "none";
      }
    },

    destroy() {
      stopAnim();
      if (deck) deck.finalize();
      map.remove();
    },
  };
}
