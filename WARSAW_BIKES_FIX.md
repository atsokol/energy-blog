# Warsaw bikes flow map — diagnosis & fix plan

## The error

```
TypeError: undefined is not an object (evaluating 'e.prototype')
```

This fires whenever a `FlowMapLayer` instance is added to a deck.gl `Deck`.

---

## Root cause

**deck.gl version mismatch between our code and the flowmap.gl CDN bundle.**

jsDelivr's `+esm` endpoint for `@flowmap.gl/core@7` hard-codes its deck.gl dependency URLs at build time. The actual bundle (verified by fetching `https://cdn.jsdelivr.net/npm/@flowmap.gl/core@7/+esm`) imports:

```js
import { Layer, CompositeLayer, ... } from "/npm/@deck.gl/core@8.6.3/+esm";
import { GeoJsonLayer }               from "/npm/@deck.gl/layers@8.6.3/+esm";
import { Model, Geometry }            from "/npm/@luma.gl/core@8.5.10/+esm";
```

Our `flowmap.js` was importing `"npm:@deck.gl/core@8.9.36"`.

Because ES modules are cached by URL, the browser loads **two separate copies** of `@deck.gl/core`:

| Who imports it | Version | CDN URL |
|---|---|---|
| `@flowmap.gl/core` (jsDelivr bundle) | 8.6.3 | `/npm/@deck.gl/core@8.6.3/+esm` |
| Our explicit import | 8.9.36 | `/npm/@deck.gl/core@8.9.36/+esm` |

`FlowMapLayer` extends `CompositeLayer` from **8.6.3**.  
Our `Deck` validates layers using `Layer` from **8.9.36**.  
`FlowMapLayer.prototype instanceof Layer` → `false` → deck.gl throws `e.prototype` error.

---

## Fix — one file: `src/components/flowmap.js`

### 1. Pin deck.gl to 8.6.3 (match flowmap.gl's CDN bundle)

```diff
-import { Deck } from "npm:@deck.gl/core@8.9.36";
+import { Deck } from "npm:@deck.gl/core@8.6.3";
```

### 2. Restore FlowMapLayer (currently replaced by ArcLayer/ScatterplotLayer workaround)

```diff
-import { ArcLayer, ScatterplotLayer } from "npm:@deck.gl/layers@8.9.36";
+import FlowMapLayer from "npm:@flowmap.gl/core@7";
```

### 3. Restore buildLayer() and tick()

Replace the current `buildLayers()` function with:

```js
function buildLayer(sliceFlows, isAnimated) {
  return new FlowMapLayer({
    id: "flowmap",
    locations,
    flows: sliceFlows,
    getLocationId: (l) => l.id,
    getLocationCentroid: (l) => l.centroid,
    getFlowOriginId: (f) => String(f.from),
    getFlowDestId:   (f) => String(f.to),
    getFlowMagnitude: (f) => +f.count,
    maxTopFlowsDisplayed: maxFlows,
    showTotals: true,
    showLocationAreas: false,
    locationTotalsExtent: totalsExtent,
    animate: isAnimated,
    animationCurrentTime: Date.now() / 1000,
    colorScheme: isDark ? "Teal" : "Blue",
  });
}
```

Restore `tick()`:

```js
function tick() {
  if (deck) deck.setProps({ layers: [buildLayer(currentFlows, true)] });
  raf = requestAnimationFrame(tick);
}
```

Restore `update()`:

```js
update(newFlows, isAnimated = false) {
  currentFlows   = newFlows;
  currentAnimate = isAnimated;
  cancelAnimationFrame(raf);
  raf = null;
  if (deck) {
    deck.setProps({ layers: [buildLayer(newFlows, isAnimated)] });
    if (isAnimated) raf = requestAnimationFrame(tick);
  }
},
```

### What to keep from the current rewrite

Keep the **standalone `Deck` + MapLibre camera sync** layout that was already applied:
- Two stacked `div` elements (MapLibre below, deck.gl canvas on top)
- `map.on("move", syncCamera)` to sync cameras
- `deck.finalize()` + `map.off("move", syncCamera)` in `destroy()`
- Do **NOT** bring back `@deck.gl/mapbox`

---

## Current state of `src/components/flowmap.js`

The file currently has the ArcLayer/ScatterplotLayer workaround applied (from an attempted fix before the root cause was found). The workaround renders correctly but loses FlowMapLayer's animated arcs, auto-sizing, and flow-direction coloring.

---

## Verification after fix

1. `npm run dev`, open the Warsaw bikes page
2. No `e.prototype` error in the browser console
3. Flow arcs and station circles render on the map (hour 8 by default)
4. Toggling "Animate flows" makes arcs animate
5. Changing the hour/day/month control updates the map
