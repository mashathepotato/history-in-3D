# History in 3D — Walk Through Your City

An interactive 3D journey through centuries of a city's history, rendered
procedurally in the browser. Two cities so far:

- **Kyiv** (default, or `?city=kyiv`): from the legendary founding by Kyi,
  Shchek, Khoryv and Lybid, through the golden age of Kyivan Rus, the Mongol
  catastrophe, Cossack Baroque, the imperial boomtown, Soviet demolitions and
  war, to independence, the Maidan, and the city that held in 2022.
- **Dnipro** (`?city=dnipro`): the river rapids and the island monastery of
  legend, Kodak fortress and the Cossack Wild Fields, Potemkin's failed
  imperial dream, the "Ukrainian Manchester" steel boom, the secret Soviet
  rocket city closed to foreigners until 1987, and today's frontline
  resilience hub.
- **London** (`?city=london`): Roman Londinium and Boudica's fire, Alfred
  reclaiming the walls, the medieval bridge with houses on it, Shakespeare's
  Bankside, the Great Fire and Wren's dome, the world's first Underground,
  Tower Bridge, the Blitz, and the glass skyline from Canary Wharf to the
  Shard.

**No build step.** Open it and walk through history.

## One city, one scroll wheel, a thousand years

![Auto-playing through fifteen centuries of Kyiv — the story panel follows along era by era](docs/demo.gif)

One auto-play run through the whole Kyiv timeline: the fortified hamlet of
the founding legend, St. Sophia rising in unplastered pink-striped *plinfa*
brick inside Yaroslav's ramparts, its Cossack Baroque re-dressing in white
and gold, the imperial boomtown, the Soviet century — until the present-day
basin reads like a street map, boulevards, traffic and all. Every era stop
opens an educational panel (including the honest scholarly disputes), and
it stays with you as you travel between stops.


## Run it

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Or deploy the repo as-is to GitHub Pages.

## Controls

| Input | Action |
|---|---|
| **Drag** | Look around the current moment |
| **Scroll** | Travel through time (buildings rise and fall around you) |
| **W A S D** (+ Q/E, Shift) | Walk/fly freely through the scene |
| **← →** | Jump between era stops |
| **Space** | Toggle the story panel |
| **▶** | Auto-play the whole timeline |

At each era stop an educational panel explains what was built, what was
destroyed, and how the moment fits the larger history of Kyiv and Ukraine.
Scrubbing time while standing still (after walking somewhere with WASD) lets
you watch a single spot transform across centuries — try standing beside
St. Sophia in 1030 and scrolling forward.

## What's simulated

- **Era-accurate architecture**: the 11th-century St. Sophia appears as it
  originally was — unplastered pink-striped *plinfa* brick with 13 lead-grey
  helmet domes — and is re-dressed before your eyes into its white-and-gold
  Ukrainian Baroque form (1690–1707). The Church of the Tithes rises in 996
  and collapses in the siege of 1240. St. Michael's is dynamited in 1937 and
  resurrected in 1999. Khreshchatyk burns in 1941 and returns as a Stalinist
  boulevard with chestnut trees.
- **Living fabric**: dugouts → log huts → townhouses → panelky → glass towers,
  scattered deterministically per district and era; boats on the Dnipro
  (longships → sails → barges), era-gated crowds (the Baptism of 988, the
  Maidan of 2014), fires and smoke for the sack of 1240 and the war years.
- **Environment**: sky, sun, fog and water are keyframed per era — the amber
  haze of the Mongol sack, the grey of 1943, the clear light of independence.
- **A full street map**: every district generates its capillary street
  network procedurally (seeded, deterministic) — medieval lanes with wobble,
  Georgian and imperial grids, Soviet microdistrict blocks — era-gated like
  everything else, so the modern city reads like a proper map. London's
  lanes are rebuilt on the same lines after the Great Fire, because that is
  what actually happened. Buildings and trees settle into the blocks between
  streets.
- **Street life**: a connected road network (junction pads, sidewalks, dashed
  centerlines), gas lamps that become tall streetlights, ground-floor
  storefronts, and era-gated traffic — horse carts, the 1892 electric tram
  (the empire's first), then cars and buses following the actual streets.
  District buildings and trees respect the road network instead of spawning
  on it. Deep links: `?year=1964` opens straight into an era.
- **The ground itself urbanizes**: meadows turn to dusty medieval town and
  then to pavement as each district's urbanization year passes; dirt tracks
  become cobbled streets and squares, then asphalt boulevards, bridge
  approaches and left-bank avenues — the terrain by 2026 reads as a paved
  city, the terrain of 900 as a green riverside.

Historical facts were researched against sources (Encyclopedia of Ukraine,
UNESCO, academic reconstructions); where history is genuinely uncertain (the
482 founding date, St. Sophia's 1011 vs 1037 founding, the appearance of the
Church of the Tithes) the story panels say so honestly.

## Add your own city

The engine is city-agnostic; each city is one data file, and the tooling
holds every city to the same quality bar:

1. **Copy the template**: `cp src/cities/_template.js src/cities/yourcity.js`
   — a small working city (preview at `?city=template`) with every feature
   demonstrated and commented.
2. **Read [CITY_GUIDE.md](CITY_GUIDE.md)** — the full recipe that produced
   Kyiv, Dnipro and London: research first, geography as a height function,
   landmarks as life-story phases, districts + street grids, life systems,
   and 14–18 educational era stops.
3. **Register it** in `src/cities/index.js` and open `?city=yourcity`.
4. **Pass the validator**: `node scripts/check-city.mjs yourcity` (it also
   runs in the browser console on every load). Errors mean broken;
   warnings are the gap to the reference-city bar. Ship at zero of both.

New building types (a pagoda, a minaret, an aqueduct…) are added as
generator functions in `src/engine/buildings.js` and immediately usable
from any city config.

## Tech

Vanilla [three.js](https://threejs.org) (via CDN import map), custom GLSL for
sky/water/fire, canvas-generated facade textures, instanced meshes for crowds,
trees and palisades. No frameworks, no bundler, no assets to download.
