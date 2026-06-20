import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, ZoomIn, ZoomOut, Crosshair } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEarthStore } from '../../../store/earthStore'
import { JARVIS_DNA } from '../../../data/jarvis.dna'
import styles from './EarthSurfacePage.module.css'
import EnvPanel from './EnvPanel'

// ── Config ────────────────────────────────────────────────────────────────────
const DEFAULT_LAT  = JARVIS_DNA.location.lat
const DEFAULT_LON  = JARVIS_DNA.location.lng
const DEFAULT_ZOOM = 16
const BASE_SPEED   = 0.000028
const PITCH_ZOOM   = 14.5
const TARGET_PITCH = 55

// ── Map style catalog ─────────────────────────────────────────────────────────
// OpenFreeMap vector styles support 3D; raster fallbacks don't
const STYLES = {
  streets: {
    label: 'Streets',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    vector: true,
  },
  light: {
    label: 'Light',
    url: 'https://tiles.openfreemap.org/styles/positron',
    vector: true,
  },
  satellite: {
    label: 'Satellite',
    vector: false,
    url: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        sat: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri',
          maxzoom: 19,
        },
      },
      layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
    },
  },
  night: {
    label: 'Night',
    vector: false,
    url: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        night: {
          type: 'raster',
          tiles: ['https://{a}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'.replace('{a}', 'a')],
          tileSize: 256,
          attribution: '© CartoDB',
          maxzoom: 20,
        },
      },
      layers: [{ id: 'night', type: 'raster', source: 'night' }],
    },
  },
}

const DIR_ARROW = { n:'↑', s:'↓', e:'→', w:'←', ne:'↗', nw:'↖', se:'↘', sw:'↙' }

// ── Inject 3D trees + buildings into a vector MapLibre style ──────────────────
function inject3DLayers(map) {
  try {
    // Guard against double-adding
    if (map.getLayer('es-tree-3d') || map.getLayer('es-bldg-3d')) return

    const style = map.getStyle()
    if (!style?.layers?.length) return

    // Find the label layer to insert our 3D layers below labels
    const firstLabel = style.layers.find(l => l.type === 'symbol')
    const beforeId   = firstLabel?.id

    // ─ Building source ─
    const bDef = style.layers.find(l => l['source-layer'] === 'building')
    if (!bDef) return
    const bSrc = bDef.source

    // Skip if style already has building extrusions (some styles include them)
    const alreadyExtruded = style.layers.some(
      l => l.type === 'fill-extrusion' && l['source-layer'] === 'building'
    )

    // ─ Vegetation source ─
    const vDef = style.layers.find(l => l['source-layer'] === 'landuse')
      || style.layers.find(l => l['source-layer'] === 'landcover')

    // Trees — inserted first (below buildings)
    if (vDef) {
      map.addLayer({
        id: 'es-tree-3d',
        type: 'fill-extrusion',
        source: vDef.source,
        'source-layer': vDef['source-layer'],
        minzoom: 13,
        filter: ['any',
          ['==', ['get', 'class'], 'wood'],
          ['==', ['get', 'class'], 'forest'],
          ['==', ['get', 'class'], 'park'],
          ['==', ['get', 'class'], 'grass'],
          ['==', ['get', 'class'], 'meadow'],
          ['==', ['get', 'class'], 'scrub'],
          ['==', ['get', 'class'], 'nature_reserve'],
          ['==', ['get', 'class'], 'village_green'],
        ],
        paint: {
          'fill-extrusion-color': [
            'match', ['get', 'class'],
            'wood',          '#2D6B1E',
            'forest',        '#285F18',
            'scrub',         '#477A30',
            'meadow',        '#5EA840',
            'grass',         '#68BB48',
            'park',          '#4FA832',
            'nature_reserve','#366B22',
            '#4A8A30',
          ],
          'fill-extrusion-height': [
            'match', ['get', 'class'],
            'forest', 18,
            'wood',   16,
            'scrub',  5,
            'meadow', 2,
            'grass',  1,
            4,
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            14.5, 0.72,
          ],
        },
      }, beforeId)
    }

    // Buildings — warm parchment tones, taller = darker
    if (!alreadyExtruded) {
      map.addLayer({
        id: 'es-bldg-3d',
        type: 'fill-extrusion',
        source: bSrc,
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'],
            ['coalesce', ['get', 'render_height'], 4],
            0,   '#F2E9DA',
            10,  '#EBE0CE',
            30,  '#D8C9B5',
            60,  '#C2AF96',
            120, '#A8937A',
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 4],
          'fill-extrusion-base':   ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            14.5, 0.9,
          ],
          'fill-extrusion-ambient-occlusion-intensity': 0.4,
          'fill-extrusion-ambient-occlusion-radius': 3,
        },
      }, beforeId)
    }
  } catch {
    // Style not fully ready — will retry on next styledata
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ walking, sprinting, dir }) {
  const faceLeft  = dir === 'w' || dir === 'nw' || dir === 'sw'
  const motionCls = sprinting ? styles.sprint : walking ? styles.walk : ''
  return (
    <div className={styles.avatarRoot}>
      {/* Name tag */}
      <div className={styles.nametag}>
        <span className={styles.nametagDot} />
        {JARVIS_DNA.identity.handle}
        {walking && <span className={styles.dirArrow}>{DIR_ARROW[dir]}</span>}
      </div>

      {/* Figure */}
      <div
        className={`${styles.figure} ${motionCls}`}
        style={faceLeft ? { transform: 'scaleX(-1)' } : undefined}
      >
        <div className={styles.head}>
          <div className={`${styles.eye} ${styles.eyeL}`} />
          <div className={`${styles.eye} ${styles.eyeR}`} />
          <div className={styles.mouth} />
        </div>
        <div className={styles.torso} />
        <div className={`${styles.arm} ${styles.armL}`} />
        <div className={`${styles.arm} ${styles.armR}`} />
        <div className={styles.legs}>
          <div className={`${styles.leg} ${styles.legL}`} />
          <div className={`${styles.leg} ${styles.legR}`} />
        </div>
      </div>

      {/* Ground shadow */}
      <div className={`${styles.shadow} ${walking ? styles.shadowWalk : ''}`} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EarthSurfacePage() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)

  const mapDivRef  = useRef(null)
  const mapRef     = useRef(null)
  const posRef     = useRef([DEFAULT_LAT, DEFAULT_LON])
  const gpsRef     = useRef(null)
  const watchIdRef = useRef(null)
  const keysRef    = useRef({})
  const rafRef     = useRef(null)
  const dirRef     = useRef('s')
  const walkRef    = useRef(false)
  const sprintRef  = useRef(false)
  const styleRef   = useRef('streets')

  const [coords,    setCoords]    = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON })
  const [walking,   setWalking]   = useState(false)
  const [sprinting, setSprinting] = useState(false)
  const [dir,       setDir]       = useState('s')
  const [mapStyle,  setMapStyle]  = useState('streets')
  const [locStatus, setLocStatus] = useState('idle')
  const [zoom,      setZoom]      = useState(DEFAULT_ZOOM)
  const [is3D,      setIs3D]      = useState(false)
  const [overlays,  setOverlays]  = useState({ rain: false, wind: false, temp: false, clouds: false })

  // ── MapLibre init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentPage !== 'earth-surface' || !mapDivRef.current) return
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style: STYLES.streets.url,
      center: [DEFAULT_LON, DEFAULT_LAT],
      zoom: DEFAULT_ZOOM,
      pitch: 0,
      bearing: -15,
      attributionControl: false,
      antialias: true,
    })

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    )

    // Inject 3D after style loads
    map.on('load',      () => inject3DLayers(map))
    map.on('styledata', () => {
      if (STYLES[styleRef.current]?.vector) inject3DLayers(map)
    })

    // Auto-pitch: enable 3D at zoom ≥ 14.5
    map.on('zoom', () => {
      const z = map.getZoom()
      setZoom(z)
      const want3D = z >= PITCH_ZOOM && STYLES[styleRef.current]?.vector
      const curr   = map.getPitch()
      if (want3D && curr < 5)  { map.easeTo({ pitch: TARGET_PITCH, duration: 600 }); setIs3D(true) }
      if (!want3D && curr > 5) { map.easeTo({ pitch: 0, duration: 600 }); setIs3D(false) }
    })

    // Click to teleport
    map.on('click', (e) => {
      const { lat, lng } = e.lngLat
      posRef.current = [lat, lng]
      map.easeTo({ center: [lng, lat], duration: 350 })
      setCoords({ lat, lon: lng })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [currentPage])

  // ── GPS — initial fix + continuous watch ─────────────────────────────────────
  useEffect(() => {
    if (currentPage !== 'earth-surface') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.geolocation) { setLocStatus('unavailable'); return }

    setLocStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        const lat = c.latitude, lon = c.longitude
        gpsRef.current = [lat, lon]
        posRef.current = [lat, lon]
        setCoords({ lat, lon })
        setLocStatus('live')
        mapRef.current?.easeTo({
          center: [lon, lat],
          zoom: DEFAULT_ZOOM,
          duration: 900,
        })
      },
      () => setLocStatus('home'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords: c }) => {
        gpsRef.current = [c.latitude, c.longitude]
        setLocStatus('live')
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [currentPage])

  // ── Map style switch ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    styleRef.current = mapStyle
    const s = STYLES[mapStyle]
    map.setStyle(s.url)
    if (!s.vector) {
      map.once('styledata', () => {
        map.easeTo({ pitch: 0, duration: 400 })
        setIs3D(false)
      })
    }
  }, [mapStyle])

  // ── WASD / arrow key loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (currentPage !== 'earth-surface') return

    const onDown = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
      keysRef.current[e.code] = true
    }
    const onUp = (e) => { delete keysRef.current[e.code] }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)

    function loop() {
      const k  = keysRef.current
      const up = k.ArrowUp    || k.KeyW
      const dn = k.ArrowDown  || k.KeyS
      const lt = k.ArrowLeft  || k.KeyA
      const rt = k.ArrowRight || k.KeyD
      const sh = k.ShiftLeft  || k.ShiftRight
      const mv = up || dn || lt || rt

      if (mv && mapRef.current) {
        const zm  = mapRef.current.getZoom()
        const spd = BASE_SPEED * Math.pow(2, 15 - zm) * (sh ? 3.5 : 1)
        const dg  = spd * 0.707

        let [lat, lon] = posRef.current
        let nd = dirRef.current

        if      (up && lt)  { lat += dg; lon -= dg; nd = 'nw' }
        else if (up && rt)  { lat += dg; lon += dg; nd = 'ne' }
        else if (dn && lt)  { lat -= dg; lon -= dg; nd = 'sw' }
        else if (dn && rt)  { lat -= dg; lon += dg; nd = 'se' }
        else if (up)        { lat += spd;            nd = 'n'  }
        else if (dn)        { lat -= spd;            nd = 's'  }
        else if (lt)        { lon -= spd;            nd = 'w'  }
        else if (rt)        { lon += spd;            nd = 'e'  }

        lat = Math.max(-85, Math.min(85, lat))
        lon = ((lon + 180) % 360 + 360) % 360 - 180

        posRef.current = [lat, lon]
        mapRef.current.jumpTo({ center: [lon, lat] })

        if (nd !== dirRef.current) { dirRef.current = nd; setDir(nd) }
        setCoords({ lat, lon })
      }

      if (mv !== walkRef.current)   { walkRef.current   = mv;  setWalking(mv) }
      if (sh !== sprintRef.current) { sprintRef.current = sh;  setSprinting(!!sh) }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
      cancelAnimationFrame(rafRef.current)
      keysRef.current = {}
    }
  }, [currentPage])

  // ── GPS re-center ─────────────────────────────────────────────────────────────
  function goToGPS() {
    const pos = gpsRef.current
    if (!pos) return
    const [lat, lon] = pos
    posRef.current = [lat, lon]
    setCoords({ lat, lon })
    mapRef.current?.easeTo({ center: [lon, lat], zoom: DEFAULT_ZOOM, duration: 700 })
  }

  const zoomIn  = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()

  const handleOverlay = useCallback(async (name, enabled) => {
    setOverlays(prev => ({ ...prev, [name]: enabled }))
    const map = mapRef.current
    if (!map) return
    if (name === 'rain') {
      const lid = 'es-rain', sid = 'es-rain'
      if (!enabled) {
        try { map.removeLayer(lid); map.removeSource(sid) } catch { /* layer/source may not exist yet */ }
        return
      }
      try {
        const r    = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        const d    = await r.json()
        const past = d.radar?.past
        if (!past?.length) return
        const ts = past[past.length - 1].time
        if (!map.getSource(sid)) map.addSource(sid, {
          type: 'raster',
          tiles: [`https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/2/1_1.png`],
          tileSize: 256, attribution: '© RainViewer',
        })
        if (!map.getLayer(lid)) map.addLayer({
          id: lid, type: 'raster', source: sid,
          paint: { 'raster-opacity': 0.65 },
        })
      } catch (e) { console.warn('rain overlay:', e) }
    }
  }, [])

  return (
    <AnimatePresence>
      {currentPage === 'earth-surface' && (
        <motion.div
          key="earth-surface"
          className={styles.page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* MapLibre GL canvas */}
          <div ref={mapDivRef} className={styles.map} />

          {/* Vignette */}
          <div className={styles.vignette} aria-hidden />

          {/* 3-D badge */}
          {is3D && <div className={styles.badge3d}>3D</div>}

          {/* Fixed-center avatar */}
          <div className={styles.avatarAnchor} aria-hidden>
            <Avatar walking={walking} sprinting={sprinting} dir={dir} />
          </div>

          {/* Ground pulse ring */}
          <div className={styles.groundRing} aria-hidden />

          {/* ════ HUD ════ */}

          <div className={styles.hudTL}>
            <button className={styles.backBtn} onClick={() => setCurrentPage('earth-hero')}>
              <ArrowLeft size={14} /> Earth
            </button>
            <div className={styles.titleChip}>
              <MapPin size={10} />
              SURFACE · LV 0
              <span className={styles.locBadge} data-status={locStatus}>
                {locStatus === 'live' ? '● LIVE' : locStatus === 'requesting' ? '⟳' : '◉'}
              </span>
            </div>
          </div>

          <div className={styles.hudTR}>
            <div className={styles.styleRow}>
              {Object.entries(STYLES).map(([key, s]) => (
                <button
                  key={key}
                  className={`${styles.styleBtn} ${mapStyle === key ? styles.styleBtnOn : ''}`}
                  onClick={() => setMapStyle(key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.hudBL}>
            <div className={styles.coordBar}>
              <span className={styles.pair}>
                <span className={styles.coordK}>LAT</span>
                <span className={styles.coordV}>{coords.lat.toFixed(5)}°</span>
              </span>
              <div className={styles.sep} />
              <span className={styles.pair}>
                <span className={styles.coordK}>LON</span>
                <span className={styles.coordV}>{coords.lon.toFixed(5)}°</span>
              </span>
              <div className={styles.sep} />
              <span className={styles.pair}>
                <span className={styles.coordK}>Z</span>
                <span className={styles.coordV}>{Math.round(zoom)}</span>
              </span>
            </div>
            <div className={styles.movePill} data-on={walking}>
              <span className={styles.moveDot} />
              {sprinting ? 'SPRINT' : 'WALK'} {walking ? DIR_ARROW[dir] : '·'}
            </div>
          </div>

          <div className={styles.hudBR}>
            <div className={styles.btnGroup}>
              <button className={styles.mapBtn} onClick={zoomIn}   aria-label="Zoom in"><ZoomIn size={14} /></button>
              <button className={styles.mapBtn} onClick={zoomOut}  aria-label="Zoom out"><ZoomOut size={14} /></button>
              <button
                className={`${styles.mapBtn} ${locStatus === 'live' ? styles.mapBtnLive : ''}`}
                onClick={goToGPS}
                aria-label="Back to GPS"
                title="Re-center on GPS"
              >
                <Crosshair size={14} />
              </button>
            </div>
            <div className={styles.hint}>
              <span>WASD / ↑↓←→ &nbsp; Move</span>
              <span>Shift &nbsp; Sprint &nbsp; Click &nbsp; Teleport</span>
              <span>✛ Crosshair &nbsp; Back to GPS</span>
            </div>
          </div>

          {/* Environment data panel — positioned right side below style switcher */}
          <div className={styles.envPanelWrap}>
            <EnvPanel
              lat={coords.lat}
              lon={coords.lon}
              onOverlay={handleOverlay}
              activeOverlays={overlays}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
