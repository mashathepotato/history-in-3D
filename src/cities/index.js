// City registry. To add a city, create ./yourcity.js exporting a default
// async factory that returns a city config (see kyiv.js for the schema),
// then register it here. Load with ?city=yourcity.
export const cities = {
  kyiv: async () => (await import('./kyiv.js')).buildConfig(),
  dnipro: async () => (await import('./dnipro.js')).buildConfig(),
};
