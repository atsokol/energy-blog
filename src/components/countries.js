// Shared country lookup used across pages
export const countries = new Map([
  ["HU", "Hungary"],
  ["PL", "Poland"],
  ["RO", "Romania"],
  ["SK", "Slovakia"],
  ["UA", "Ukraine"],
]);

// Fixed color palette — Ukraine is yellow; others use Tableau-derived hues
export const countryColors = new Map([
  ["HU", "#e15759"],
  ["PL", "#4e79a7"],
  ["RO", "#76b7b2"],
  ["SK", "#59a14f"],
  ["UA", "#f59e0b"],
]);

// Convenience arrays for Plot color scale: domain = country names, range = hex colors
export const colorDomain = [...countries.keys()].map(k => countries.get(k));
export const colorRange  = [...countries.keys()].map(k => countryColors.get(k));
