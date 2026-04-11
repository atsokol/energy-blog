export default {
  root: "src",
  title: "Infra and Energy Data",
  style: "style.css",
  head: `<link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>`,
  pages: [
    {name: "Economics of gas peakers", path: "/gas-peakers"},
    {name: "Economics of energy storage", path: "/energy-storage"},
    {name: "Renewables price capture", path: "/res-price-capture"},
    {name: "EV market in Ukraine", path: "/ev-market-ua"},
    {name: "Cross-border electricity trade", path: "/cross-border-flows"},
  ]
};
