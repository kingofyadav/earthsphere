// Module-level mutable singleton — written at 60fps from R3F, read by HUD via rAF
export const liveTravel = {
  x: 0, y: 0, z: 0,
  distance: 0,
  progress: 0,
  traveling: false,
  targetName: null,
}

// Planet ref registry: name → { ref: MutableRefObject<THREE.Group> }
export const planetRefs = {}

export function registerPlanet(name, ref) {
  planetRefs[name] = ref
}

export function unregisterPlanet(name) {
  delete planetRefs[name]
}
