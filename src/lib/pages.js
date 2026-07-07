import { PLANETS, MOON, SUN_DATA } from '../components/SolarSystem/planetData'

export const PAGE = {
  EARTH_HERO:    'earth-hero',
  NATION:        'nation',
  SURFACE:       'surface',
  EARTH_SURFACE: 'earth-surface',
  HDI:           'hdi',
  WORLD:         'world',
  MOON:          'Moon',
  SUN:           'Sun',
}

// All non-Earth planet + moon + sun page names (used for header-hide logic)
export const PLANET_PAGE_NAMES = [...PLANETS.filter(p => !p.isEarth), MOON, SUN_DATA].map(b => b.name)
