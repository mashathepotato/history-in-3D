# City Authoring Guide

This is the recipe that produced Kyiv, Dnipro and London. Follow it and your
city will come out at the same level. The engine does the rendering; **your
job is geography, phases, and honest history.**

Quick start:

```bash
cp src/cities/_template.js src/cities/yourcity.js
# register it in src/cities/index.js, then iterate:
python3 -m http.server 8000        # open http://localhost:8000/?city=yourcity
node scripts/check-city.mjs yourcity   # the quality gate
```

The template renders a small working town out of the box
(`docs/screenshots/template.png` shows its 1890 stop) — replace it piece by
piece with your city.

The validator also runs in the browser console on every load. **Errors mean
broken; warnings are the gap between "works" and the reference bar.** A
finished city has zero of both.

---

## 0. Research first (this is most of the quality)

Before writing any code, collect:

- **Dates** for every landmark: built, re-styled, destroyed, rebuilt.
- **Materials and colors** by era — the single biggest realism win. (Kyiv's
  St. Sophia is *pink striped brick with grey domes* in 1037 and
  *white-and-gold baroque* after 1707. Getting this right IS the product.)
- **Catastrophes**: fires, sieges, bombings — with month-level dates if
  possible, so destruction lands at the right scroll position.
- **The street story**: when did dirt become cobble, cobble become asphalt?
  When did street lighting, trams, cars arrive?
- **Population figures** per era for the stories.
- **What's legend vs fact.** The stories must say so. ("The founding date is
  commemorative, not archaeological.") This honesty is a core feature.

Cross-check numbers against at least two sources. If sources disagree,
present the dispute in the story panel — that's more interesting anyway.

## 1. Geography — `terrain`

```js
terrain: {
  size: 2600,            // world span in metres (1 unit = 1 m)
  segments: 230,
  heightAt,              // (x, z) => metres — THE map. Deterministic only.
  waterLevel: 2,
  grassColor, dirtColor, sandColor,     // era-neutral ground palette
  waterDeep, waterShallow,              // your river's actual color
  urbanZones: [ { x, z, rx, rz, year, strength } ],
}
```

- North is `-z`, east is `+x`. Center the historic core near the origin.
- Build `heightAt` from parts: river bed dipping below `waterLevel`,
  plateaus via smoothstep, hills as gaussians, low-amplitude noise.
  **No `Math.random()`** — everything must be reproducible.
- Islands: add a gaussian bump inside the channel.
- `urbanZones` drive the meadow→pavement ground tint. Give a district two
  zones for two-stage urbanization (dusty medieval town from 900, paved
  city from 1850).

## 2. Landmarks — `structures`

Each structure is an id, a position, and **phases** — its life story:

```js
{ id: 'cathedral', pos: [x, z], rotY, phases: [
  { from: 1037, to: 1700, build: 'church', params: {...}, rise: 26 },
  { from: 1700, to: 9999, build: 'church', params: {...baroque...}, rise: 10 },
]}
```

- `from` is the **completion** year; `rise` is construction time — the
  building rises during the `rise` years *before* `from`. Don't let a
  postwar building start rising during the war.
- `fall` is demolition speed. **Violent ends are fast**: collapse `0.3`,
  dynamite `0.5`, fire `0.2`. The default slow fade is for abandonment.
- Destroyed? Add a `ruin` phase for the gap years, then the rebuild phase.
- Generators available (see `src/engine/buildings.js` for params):
  churches (plinthite/baroque walls, helmet/pear/onion/tent/flat domes),
  gate, bellTower, rampart, palisade, woodCastle, classical, townhouse,
  stalinka, panelka, glassTower, factory, bridge, housedBridge, towerBridge,
  ferrisWheel, stadium, column, motherland, menorah, rocket, idol, flag,
  hedgehogs, ruin… **Need a new type? Add a generator** — it becomes
  available to every city.

## 3. Roads, squares, streetlights

- **Arterials** as `road` structures with era phases:
  dirt (`0x84714f`) → cobble (`0x8d8578`, `sidewalk: true`) → asphalt
  (`0x4f5257`, `sidewalk: true, line: true`). Reuse named path constants
  so lamps and traffic follow the same lines.
- **Connect them.** Roads must share endpoints; put `plaza` junction pads
  at the meeting points to hide seams. Squares are plazas too.
- **`lampline`** along major streets: `style: 'gas'` from your city's gas
  era, `'modern'` postwar.
- **`streetGrid` per district** — this is what makes the modern city read
  like a map: `{ area: [x, z, rx, rz], angle, spacing, seed, w, color }`.
  Same `seed` + `area` across phases = same street lines resurfaced (that's
  historically right more often than not). `wobble: 0.4` for medieval
  tangles. Spacing: ~55 for old cores, ~90+ for panel districts (big
  buildings need big blocks). Streets auto-avoid water and landmarks;
  buildings auto-avoid streets.

## 4. Fabric — `districts`

Generic buildings per era. Same `seed` across phases = buildings replaced
in place. Use `gridAngle` to align a planned town with its street grid.
Counts: reference districts run 30–80 per phase. Match the architecture to
the era and place: dugouts → huts → townhouses (they grow shopfronts on
their own) → stalinka/panelka → glassTower.

## 5. Life — `effects`

- `fires`: catastrophes (with month precision: `1666.67`), plus
  `smokeOnly: true` for industrial chimneys.
- `boats`: longship/sail/barge on a path down your river.
- `traffic`: cart → tram (your city's real tram year!) → car/bus/
  doubledecker along the named road paths. `offset` for lanes, reversed
  path arrays for two-way traffic.
- `crowds`: at least one historic gathering, placed at the right spot and
  year (a baptism, a charter fair, a revolution).
- `groves`: oak/poplar/pine/chestnut areas; they avoid streets on their own.

## 6. Era stops — the actual product

14–18 stops. Each one:

```js
{
  year, major,            // major: true on 4-8 pivots (timeline labels)
  title, kicker, caption, transitTitle,
  camera: { pos: [x,y,z], look: [x,y,z] },   // aerial vantage FRAMING THE STAR
  env: { skyTop, skyBottom, sunDir, sunColor, sunIntensity,
         ambient, fogColor, fogDensity, haze },
  story: `<p>…two short paragraphs…</p>`,
  context: `…the bigger-picture tie-in…`,
}
```

- **Camera**: put the era's star two-thirds into frame, elevated 60–160 m.
  The validator checks you're not underground.
- **Env**: this is the emotional register. Dawn golds for origins, clear
  light for golden ages, red-brown smoke for catastrophes, grey for wars,
  heavy haze for coal eras. Look at the reference cities' values.
- **Story**: concrete nouns, real numbers, bold the key facts. Two
  paragraphs, not five.
- **Context**: connect the moment to the bigger history — and flag
  legends/disputes honestly.

## 7. QA loop

```bash
node scripts/check-city.mjs yourcity          # zero errors, zero warnings
```

Then screenshot every stop (works headless, `&snap=1` skips the loader fade):

```bash
# macOS example; any headless Chromium works
for y in 1015 1520 1890 1965 2026; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless --enable-unsafe-swiftshader --window-size=1400,900 \
    --virtual-time-budget=40000 --screenshot=$y.png \
    "http://localhost:8000/?city=yourcity&year=$y&snap=1"
done
```

Look at each one and ask: *is the era's star framed? does the ground look
right for the year? is anything floating, buried, or anachronistic?* Walk
around at ground level with WASD too. Debug with
`&skip=roads,lamps,traffic,districts` to isolate layers.

## Quality bar (what "done" means)

- [ ] Researched dates/materials, disputes flagged in the stories
- [ ] 14–18 stops, each with camera + env mood + story + context
- [ ] Landmarks with full life stories (build → restyle → destroy → rebuild)
- [ ] Destruction is fast (`fall` ≤ 1 for violence), construction leads `from`
- [ ] Connected arterials with era phases + junction pads + squares
- [ ] A `streetGrid` per district — the modern map test
- [ ] `urbanZones` covering every built-up area
- [ ] Lamplines, traffic, boats, crowds, groves, at least one fire/smoke event
- [ ] `node scripts/check-city.mjs yourcity` → no errors, no warnings
- [ ] Screenshot pass of every stop, plus WASD ground-level spot checks
