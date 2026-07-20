// City registry. To add a city, create ./yourcity.js exporting a default
// async factory that returns a city config (see kyiv.js for the schema),
// then register it here. Load with ?city=yourcity.
export const cities = {
  kyiv: async () => (await import('./kyiv.js')).buildConfig(),
  dnipro: async () => (await import('./dnipro.js')).buildConfig(),
  london: async () => (await import('./london.js')).buildConfig(),
  // starter kit for new cities — copy src/cities/_template.js (hidden from
  // the in-app switcher; preview at ?city=template)
  template: async () => (await import('./_template.js')).buildConfig(),
};

// cities hidden from the in-app "visit …" links
export const hiddenCities = new Set(['template']);
