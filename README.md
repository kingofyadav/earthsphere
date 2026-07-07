# EarthSphere

**A 3D digital world.** Fly through a physically-modelled Solar System, land on
Earth, create your **Human Digital Identity (HDI)**, found nations, claim
territory, and take part in a small on-globe economy and governance layer — all
in the browser.

> EarthSphere — Digital World. Explore an interactive 3D Solar System and create
> your Human Digital Identity.

## Highlights

- **Real Solar System** — planets on true J2000 Keplerian orbits (`lib/orbitalMechanics.js`),
  the Sun, Saturn's rings, a Milky Way backdrop, orbit paths, and an auto-tour.
- **Light-speed travel** — pick a planet and warp to it with a HUD-tracked transit.
- **Earth up close** — a MapLibre-backed surface view, atmosphere and cloud shells,
  hoverable territory zones, and claimable land.
- **Human Digital Identity** — sign in and build an HDI profile pinned to the globe.
- **Nations & territory** — found a nation, claim zones, and manage it from a panel;
  deep-link straight to one with `?nation=<id>`.
- **World systems** — community, governance, relations, and a `rupeecoin` economy,
  each backed by its own store and synced through a systems bridge.
- **PWA + theming** — installable, offline-aware, light/dark theme, and a dev overlay.

## Run

```sh
pnpm install
pnpm dev        # vite dev server
```

Scripts: `pnpm build` (production build → `dist/`), `pnpm preview`, `pnpm lint`.

Requires a WebGL-capable browser. Deploys via `vercel.json`.

## Stack

React 19 · React Three Fiber 9 + drei · Three.js 0.184 · Zustand · Framer Motion ·
MapLibre GL · Vite 8 · vite-plugin-pwa.

## Structure

```
src/
  scenes/SolarSystemScene.jsx    the always-on 3D scene root
  components/
    SolarSystem/                 planets, sun, orbits, Milky Way, travel + tour controllers
    Earth/                       globe, atmosphere, clouds, territory zones, profile pins
    Starfield/  Atmosphere/  Clouds/
    UI/                          pages, modals, HUDs, header, overlays, dev tools
  store/                         zustand stores: auth, earth, nation, territory,
                                 governance, community, relation, travel, tour
  travel/travelState.js          frame-rate mutable travel singleton
  lib/                           orbitalMechanics, hdiUtils, rupeecoin, syncEngine, …
  hooks/                         theme, dev mode, keyboard shortcuts, systems bridge
  shaders/                       atmosphere + matrix GLSL
```

The 3D scene is always mounted (behind an error boundary against WebGL crashes);
heavy pages are lazy-loaded and layered over it. App flow moves through a
`landing → explore` stage machine, with pages/modals selected from `lib/pages.js`.

See [`guide.txt`](./guide.txt) for a walkthrough of exploring, travelling, and
claiming territory.
