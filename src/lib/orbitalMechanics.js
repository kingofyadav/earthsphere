// J2000 mean orbital elements + century rates (per Julian century)
// Source: JPL – Keplerian Elements for Approximate Positions of Major Planets
// https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf  (accuracy ~1° for 1800–2050)
const J2K = {
  Mercury: { a:0.38709927,  e:0.20563593, I:7.00497902,   L:252.25032350,  w:77.45779628,  Om:48.33076593,  da:0.00000037,  de:0.00001906,  dI:-0.00594749, dL:149472.67411175, dw:0.16047689,  dOm:-0.12534081 },
  Venus:   { a:0.72333566,  e:0.00677672, I:3.39467605,   L:181.97909950,  w:131.60246718, Om:76.67984255,  da:0.00000390,  de:-0.00004107, dI:-0.00078890, dL:58517.81538729,  dw:0.00268329,  dOm:-0.27769418 },
  Earth:   { a:1.00000261,  e:0.01671123, I:-0.00001531,  L:100.46457166,  w:102.93768193, Om:0.0,          da:0.00000562,  de:-0.00004392, dI:-0.01294668, dL:35999.37244981,  dw:0.32327364,  dOm:0.0        },
  Mars:    { a:1.52371034,  e:0.09339410, I:1.84969142,   L:-4.55343205,   w:-23.94362959, Om:49.55953891,  da:0.00001847,  de:0.00007882,  dI:-0.00813131, dL:19140.30268499,  dw:0.44441088,  dOm:-0.29257343 },
  Jupiter: { a:5.20288700,  e:0.04838624, I:1.30439695,   L:34.39644051,   w:14.72847983,  Om:100.47390909, da:-0.00011607, de:-0.00013253, dI:-0.00183714, dL:3034.74612775,   dw:0.21252668,  dOm:0.20469106  },
  Saturn:  { a:9.53667594,  e:0.05386179, I:2.48599187,   L:49.95424423,   w:92.59887831,  Om:113.66242448, da:-0.00125060, de:-0.00050991, dI:0.00193609,  dL:1222.49362201,   dw:-0.41897216, dOm:-0.28867794 },
  Uranus:  { a:19.18916464, e:0.04725744, I:0.77263783,   L:313.23810451,  w:170.95427630, Om:74.01692503,  da:-0.00196176, de:-0.00004397, dI:-0.00242939, dL:428.48202785,    dw:0.40805281,  dOm:0.04240589  },
  Neptune: { a:30.06992276, e:0.00859048, I:1.77004347,   L:-55.12002969,  w:44.96476227,  Om:131.78422574, da:0.00026291,  de:0.00005105,  dI:0.00035372,  dL:218.45945325,    dw:-0.32241464, dOm:-0.00508664 },
}

function normDeg(d) { return ((d % 360) + 360) % 360 }

function solveKepler(Mdeg, e) {
  const M = Mdeg * (Math.PI / 180)
  let E = M
  for (let i = 0; i < 100; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E))
    E += dE
    if (Math.abs(dE) < 1e-11) break
  }
  return E // radians
}

function helioPos(name, T) {
  const el = J2K[name]
  if (!el) return null

  const a  = el.a  + el.da  * T
  const e  = el.e  + el.de  * T
  const I  = el.I  + el.dI  * T
  const L  = normDeg(el.L  + el.dL  * T)
  const w  = el.w  + el.dw  * T
  const Om = el.Om + el.dOm * T
  const wp = w - Om                  // argument of perihelion
  const M  = normDeg(L - w)         // mean anomaly

  const E  = solveKepler(M, e)
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const r  = Math.sqrt(xp * xp + yp * yp)
  const nu = Math.atan2(yp, xp)     // true anomaly (rad)

  const wpR = wp  * (Math.PI / 180)
  const OmR = Om  * (Math.PI / 180)
  const IR  = I   * (Math.PI / 180)
  const th  = wpR + nu

  return {
    x: r * (Math.cos(OmR) * Math.cos(th) - Math.sin(OmR) * Math.sin(th) * Math.cos(IR)),
    y: r * (Math.sin(OmR) * Math.cos(th) + Math.cos(OmR) * Math.sin(th) * Math.cos(IR)),
    r, a, e,
  }
}

export function calcPlanetLiveData(name) {
  const JD = Date.now() / 86400000 + 2440587.5
  const T  = (JD - 2451545.0) / 36525

  /* ── Moon ── */
  if (name === 'Moon') {
    const CYCLE    = 29.53058867
    const KNOWN_NM = 2451550.1   // JD of 2000-01-06 new moon
    const phase    = ((JD - KNOWN_NM) % CYCLE + CYCLE) % CYCLE
    const pFrac    = phase / CYCLE
    // illumination: 0 at new moon, 100 at full moon
    const illumination = Math.round((1 - Math.cos(2 * Math.PI * pFrac)) / 2 * 100)
    const phaseName =
      pFrac < 0.02 || pFrac > 0.98 ? 'New Moon'
      : pFrac < 0.23 ? 'Waxing Crescent'
      : pFrac < 0.27 ? 'First Quarter'
      : pFrac < 0.48 ? 'Waxing Gibbous'
      : pFrac < 0.52 ? 'Full Moon'
      : pFrac < 0.73 ? 'Waning Gibbous'
      : pFrac < 0.77 ? 'Last Quarter'
      : 'Waning Crescent'
    // distance varies 356,500–406,700 km with orbital eccentricity
    const distKm    = 384400 + 21000 * Math.cos(2 * Math.PI * pFrac)
    const daysToFull = ((CYCLE * 0.5 - phase) % CYCLE + CYCLE) % CYCLE
    return {
      isMoon: true,
      phaseName,
      pFrac,
      phase,
      illumination,
      daysToFull,
      distEarthKm: distKm,
      lightSecs: distKm / 299792.458,
    }
  }

  /* ── Sun ── */
  if (name === 'Sun') {
    const earth = helioPos('Earth', T)
    if (!earth) return null
    // Sun's apparent geocentric ecliptic longitude = Earth's longitude + 180°
    const sunLon = normDeg(Math.atan2(-earth.y, -earth.x) * (180 / Math.PI))
    return {
      isSun: true,
      distEarth: earth.r,
      lightMins: earth.r * 8.317,
      eclipticLon: sunLon,
    }
  }

  /* ── Regular planets ── */
  const planet = helioPos(name, T)
  const earth  = helioPos('Earth', T)
  if (!planet || !earth) return null

  const dx        = planet.x - earth.x
  const dy        = planet.y - earth.y
  const distEarth = Math.sqrt(dx * dx + dy * dy)

  // vis-viva equation: v (km/s) relative to Earth's orbital speed
  const orbSpeed    = 29.785 * Math.sqrt(2 / planet.r - 1 / planet.a)
  const eclipticLon = normDeg(Math.atan2(planet.y, planet.x) * (180 / Math.PI))

  // Elongation: angle at Earth between directions to Sun and Planet
  const dot  = (-earth.x) * dx + (-earth.y) * dy
  const cosEl = dot / (earth.r * distEarth)
  const elongation = Math.acos(Math.max(-1, Math.min(1, cosEl))) * (180 / Math.PI)

  return {
    distSun: planet.r,
    distEarth,
    orbSpeed,
    elongation,
    eclipticLon,
    lightFromSun: planet.r * 8.317,
    lightFromEarth: distEarth * 8.317,
  }
}
