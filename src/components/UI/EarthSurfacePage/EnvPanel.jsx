import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Thermometer, Eye, Activity, Layers } from 'lucide-react'
import styles from './EnvPanel.module.css'

/* ── WMO weather code → label + emoji ────────────────────────────────────── */
const WMO = {
  0:  { label: 'Clear Sky',      icon: '☀️'  },
  1:  { label: 'Mainly Clear',   icon: '🌤️'  },
  2:  { label: 'Partly Cloudy',  icon: '⛅'  },
  3:  { label: 'Overcast',       icon: '☁️'  },
  45: { label: 'Fog',            icon: '🌫️'  },
  48: { label: 'Icy Fog',        icon: '🌫️'  },
  51: { label: 'Light Drizzle',  icon: '🌦️'  },
  53: { label: 'Drizzle',        icon: '🌦️'  },
  55: { label: 'Heavy Drizzle',  icon: '🌧️'  },
  61: { label: 'Light Rain',     icon: '🌧️'  },
  63: { label: 'Rain',           icon: '🌧️'  },
  65: { label: 'Heavy Rain',     icon: '🌧️'  },
  71: { label: 'Light Snow',     icon: '🌨️'  },
  73: { label: 'Snow',           icon: '❄️'   },
  75: { label: 'Heavy Snow',     icon: '❄️'   },
  80: { label: 'Rain Showers',   icon: '🌦️'  },
  81: { label: 'Showers',        icon: '🌧️'  },
  82: { label: 'Heavy Showers',  icon: '🌧️'  },
  85: { label: 'Snow Showers',   icon: '🌨️'  },
  95: { label: 'Thunderstorm',   icon: '⛈️'  },
  96: { label: 'Thunderstorm',   icon: '⛈️'  },
  99: { label: 'Heavy Storm',    icon: '⛈️'  },
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function degToCompass(d) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(d / 22.5) % 16]
}
function pm25Level(v) {
  if (v <= 12)   return { label: 'Good',        color: '#22c55e' }
  if (v <= 35.4) return { label: 'Moderate',    color: '#eab308' }
  if (v <= 55.4) return { label: 'Unhealthy',   color: '#f97316' }
  if (v <= 150)  return { label: 'Very Unhealthy', color: '#ef4444' }
  return               { label: 'Hazardous',    color: '#a855f7' }
}
function uvLevel(v) {
  if (v <= 2)  return { label: 'Low',       color: '#22c55e' }
  if (v <= 5)  return { label: 'Moderate',  color: '#eab308' }
  if (v <= 7)  return { label: 'High',      color: '#f97316' }
  if (v <= 10) return { label: 'Very High', color: '#ef4444' }
  return             { label: 'Extreme',    color: '#a855f7' }
}
function fmt(v, unit, digits = 1) {
  return v != null ? `${typeof digits === 'number' ? v.toFixed(digits) : Math.round(v)} ${unit}` : '—'
}

/* ── Row component ───────────────────────────────────────────────────────── */
function Row({ label, value, badge, append }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>
        {value}
        {badge && (
          <span className={styles.badge} style={{ color: badge.color, borderColor: badge.color }}>
            {badge.label}
          </span>
        )}
        {append}
      </span>
    </div>
  )
}

/* ── Wind arrow ──────────────────────────────────────────────────────────── */
function WindArrow({ deg }) {
  return (
    <span
      className={styles.windArrow}
      style={{ transform: `rotate(${deg}deg)` }}
      title={`${Math.round(deg)}° ${degToCompass(deg)}`}
    >↑</span>
  )
}

/* ── Overlay button ──────────────────────────────────────────────────────── */
function OvBtn({ label, icon, active, onClick, note }) {
  return (
    <button
      className={`${styles.ovBtn} ${active ? styles.ovBtnOn : ''}`}
      onClick={onClick}
      title={note}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {note && <span className={styles.ovNote}>*</span>}
    </button>
  )
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function EnvPanel({ lat, lon, onOverlay, activeOverlays }) {
  const [open,    setOpen]    = useState(true)
  const [loading, setLoading] = useState(false)
  const [wx,      setWx]      = useState(null)
  const [aq,      setAq]      = useState(null)
  const [lastAt,  setLastAt]  = useState(null)
  const timerRef  = useRef(null)
  const prevPos   = useRef(null)
  const currentPos = useRef({ lat, lon })

  const fetchAll = useCallback(async (la, lo) => {
    if (!la || !lo) return
    setLoading(true)
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${la.toFixed(4)}&longitude=${lo.toFixed(4)}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
          `precipitation,weather_code,wind_speed_10m,wind_direction_10m,` +
          `wind_gusts_10m,surface_pressure,cloud_cover,visibility,uv_index` +
          `&wind_speed_unit=kmh&timezone=auto`
        ),
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality` +
          `?latitude=${la.toFixed(4)}&longitude=${lo.toFixed(4)}` +
          `&current=pm2_5,pm10,ozone,carbon_monoxide,nitrogen_dioxide&timezone=auto`
        ),
      ])
      const [w, a] = await Promise.all([wRes.json(), aRes.json()])
      setWx(w)
      setAq(a)
      setLastAt(new Date())
      prevPos.current = { lat: la, lon: lo }
    } catch (e) {
      console.warn('EnvPanel:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Keep currentPos ref in sync so the interval always uses the latest position */
  useEffect(() => { currentPos.current = { lat, lon } }, [lat, lon])

  /* Initial fetch + refresh every 10 min at current position */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll(lat, lon)
    timerRef.current = setInterval(
      () => fetchAll(currentPos.current.lat, currentPos.current.lon),
      10 * 60 * 1000
    )
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-fetch when position moves > 0.4° (~45 km) */
  useEffect(() => {
    if (!prevPos.current) return
    const dl = Math.abs(lat - prevPos.current.lat)
    const dn = Math.abs(lon - prevPos.current.lon)
    if (dl > 0.4 || dn > 0.4) fetchAll(lat, lon)
  }, [lat, lon, fetchAll])

  const c = wx?.current
  const a = aq?.current
  const condition = c ? (WMO[c.weather_code] ?? { label: 'Unknown', icon: '🌡️' }) : null
  const aqi       = a?.pm2_5 != null ? pm25Level(a.pm2_5) : null
  const uvInfo    = c?.uv_index != null ? uvLevel(c.uv_index) : null

  /* ── Collapsed state ── */
  if (!open) {
    return (
      <button className={styles.pill} onClick={() => setOpen(true)} title="Open live environment data">
        🌍 <span>ENV</span>
      </button>
    )
  }

  return (
    <div className={styles.panel}>
      {/* header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>🌍 LIVE DATA</span>
        <div className={styles.headerBtns}>
          <button
            className={`${styles.hBtn} ${loading ? styles.spinning : ''}`}
            onClick={() => fetchAll(lat, lon)}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={10} />
          </button>
          <button className={styles.hBtn} onClick={() => setOpen(false)} title="Collapse">✕</button>
        </div>
      </div>

      {/* condition hero */}
      {condition && (
        <div className={styles.hero}>
          <span className={styles.heroIcon}>{condition.icon}</span>
          <div className={styles.heroText}>
            <div className={styles.heroLabel}>{condition.label}</div>
            {c?.temperature_2m != null && (
              <div className={styles.heroTemp}>{c.temperature_2m.toFixed(1)}°C</div>
            )}
          </div>
        </div>
      )}

      {/* ── Weather ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}><Thermometer size={9} /> WEATHER</div>
        <Row label="Temperature"   value={fmt(c?.temperature_2m, '°C')} />
        <Row label="Feels Like"    value={fmt(c?.apparent_temperature, '°C')} />
        <Row
          label="Wind"
          value={c?.wind_speed_10m != null
            ? `${Math.round(c.wind_speed_10m)} km/h ${degToCompass(c.wind_direction_10m)}`
            : '—'
          }
          append={c?.wind_direction_10m != null ? <WindArrow deg={c.wind_direction_10m} /> : null}
        />
        <Row label="Gusts"         value={fmt(c?.wind_gusts_10m, 'km/h', 0)} />
        <Row label="Humidity"      value={c?.relative_humidity_2m != null ? `${c.relative_humidity_2m}%` : '—'} />
        <Row label="Pressure"      value={fmt(c?.surface_pressure, 'hPa', 0)} />
        <Row label="Cloud Cover"   value={c?.cloud_cover != null ? `${c.cloud_cover}%` : '—'} />
        <Row label="Precipitation" value={fmt(c?.precipitation, 'mm')} />
        <Row
          label="UV Index"
          value={c?.uv_index != null ? c.uv_index.toFixed(1) : '—'}
          badge={uvInfo}
        />
        <Row label="Visibility"    value={c?.visibility != null ? `${(c.visibility / 1000).toFixed(1)} km` : '—'} />
      </div>

      <div className={styles.div} />

      {/* ── Air Quality ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}><Activity size={9} /> AIR QUALITY</div>
        {aqi && (
          <div className={styles.aqiChip} style={{ borderColor: aqi.color, color: aqi.color }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:aqi.color, display:'inline-block', marginRight:4 }} />
            {aqi.label}
          </div>
        )}
        <Row label="PM 2.5"  value={fmt(a?.pm2_5, 'µg/m³')} />
        <Row label="PM 10"   value={fmt(a?.pm10, 'µg/m³')} />
        <Row label="Ozone"   value={fmt(a?.ozone, 'µg/m³', 0)} />
        <Row label="NO₂"     value={fmt(a?.nitrogen_dioxide, 'µg/m³')} />
        <Row label="CO"      value={a?.carbon_monoxide != null ? `${(a.carbon_monoxide / 1000).toFixed(2)} mg/m³` : '—'} />
      </div>

      <div className={styles.div} />

      {/* ── Terrain ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}><Eye size={9} /> TERRAIN</div>
        <Row label="Elevation"  value={wx?.elevation != null ? `${Math.round(wx.elevation)} m` : '—'} />
        <Row label="Above Sea"  value={wx?.elevation != null ? `${wx.elevation >= 0 ? '+' : ''}${Math.round(wx.elevation)} m` : '—'} />
        <Row label="Lat / Lon"  value={`${lat.toFixed(4)}° · ${lon.toFixed(4)}°`} />
      </div>

      <div className={styles.div} />

      {/* ── Map Overlays ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}><Layers size={9} /> MAP OVERLAYS</div>
        <div className={styles.ovGrid}>
          <OvBtn label="Rain"   icon="🌧️" active={activeOverlays.rain}   onClick={() => onOverlay('rain',   !activeOverlays.rain)} />
          <OvBtn label="Wind"   icon="💨" active={activeOverlays.wind}   onClick={() => onOverlay('wind',   !activeOverlays.wind)}   note="data" />
          <OvBtn label="Temp"   icon="🌡️" active={activeOverlays.temp}   onClick={() => onOverlay('temp',   !activeOverlays.temp)}   note="data" />
          <OvBtn label="Clouds" icon="☁️" active={activeOverlays.clouds} onClick={() => onOverlay('clouds', !activeOverlays.clouds)} note="data" />
        </div>
        <p className={styles.ovNote2}>Rain = live radar tiles · others highlight panel data</p>
      </div>

      {lastAt && (
        <div className={styles.updatedAt}>
          ⟳ {lastAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
