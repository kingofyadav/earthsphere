import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ExternalLink, Satellite, Atom, Wifi } from 'lucide-react'
import { useEarthStore }  from '../../../store/earthStore'
import { useAuthStore }   from '../../../store/authStore'
import { PLANETS, MOON, SUN_DATA } from '../../SolarSystem/planetData'
import { PLANET_INFO }    from '../../../data/planetInfo'
import { calcPlanetLiveData } from '../../../lib/orbitalMechanics'
import { PAGE } from '../../../lib/pages'
import styles from './PlanetPage.module.css'

const PLANET_TO_PHASE = {
  Mercury:'p2', Venus:'p3', Mars:'p4',
  Jupiter:'p5', Saturn:'p6', Uranus:'p7', Neptune:'p7',
  Moon:'p2', Sun:'p1',
}

const ALL_BODIES = [...PLANETS.filter(p => !p.isEarth), MOON, SUN_DATA]

// Re-exported from lib/pages to allow lazy-loading this component without pulling in the name list
export { PLANET_PAGE_NAMES } from '../../../lib/pages'

/* ── 3D rotating planet ─────────────────────────────────────────────────────── */
function PlanetBall({ textureUrl, color, hasRings }) {
  const groupRef = useRef()
  const [map]    = useTexture([textureUrl])

  useEffect(() => {
    if (map) { map.anisotropy = 16; map.needsUpdate = true }
  }, [map])

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.002
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[2.4, 96, 96]} />
        <meshStandardMaterial map={map} roughness={0.7} metalness={0.04} />
      </mesh>

      {/* inner glow */}
      <mesh>
        <sphereGeometry args={[2.54, 64, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.06}
          side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* outer haze */}
      <mesh>
        <sphereGeometry args={[2.78, 64, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.022}
          side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Saturn rings */}
      {hasRings && (
        <mesh rotation={[Math.PI / 2.6, 0.15, 0]}>
          <ringGeometry args={[3.1, 4.8, 80]} />
          <meshBasicMaterial color="#c9b96a" transparent opacity={0.36}
            side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/* ── Tab: Overview ──────────────────────────────────────────────────────────── */
function OverviewTab({ data, onExplore, isLoggedIn }) {
  return (
    <div className={styles.tabPane}>
      <div className={styles.eyebrow}>
        <span className={styles.eyebrowDot} style={{ background: data.color }} />
        SOVEREIGN NETWORK &nbsp;·&nbsp; {data.role.toUpperCase()}
      </div>

      <h1 className={styles.planetName}
        style={{ background: `linear-gradient(135deg, #ffffff 0%, ${data.color} 100%)`,
                 WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {data.name}
      </h1>

      <p className={styles.factText}>{data.fact}</p>

      <div className={styles.unlockRow}>
        <span className={styles.unlockLabel}>UNLOCKS</span>
        <span className={styles.unlockValue} style={{ color: data.color }}>{data.unlock}</span>
      </div>

      <div className={styles.ctaRow}>
        <button
          className={styles.ctaPrimary}
          style={{ borderColor: `${data.color}55`, background: `${data.color}16` }}
          onClick={onExplore}
        >
          {isLoggedIn ? 'Open in HDI' : 'Create Identity'}
          <ArrowRight size={14} />
        </button>
        {data.appUrl && (
          <a href={data.appUrl} target="_blank" rel="noopener noreferrer"
            className={styles.ctaApp} style={{ borderColor: `${data.color}44`, color: data.color }}>
            {data.appName} <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Tab: Science ───────────────────────────────────────────────────────────── */
function ScienceTab({ name, color }) {
  const info = PLANET_INFO[name]
  if (!info) return null

  const grid = [
    { label: 'DIAMETER',      value: info.diameter,      sub: info.diameterRatio },
    { label: 'MASS',          value: info.mass           },
    { label: 'SURFACE GRAV.', value: info.gravity        },
    { label: 'ESCAPE VEL.',   value: info.escapeVel      },
    { label: 'DAY LENGTH',    value: info.dayLength      },
    { label: 'YEAR LENGTH',   value: info.yearLength     },
    { label: 'TEMPERATURE',   value: info.tempRange      },
    { label: 'MOONS',         value: info.moons          },
  ]

  return (
    <div className={styles.tabPane}>
      <div className={styles.statsGrid}>
        {grid.map(s => (
          <div key={s.label} className={styles.statCell}>
            <span className={styles.statCellLabel}>{s.label}</span>
            <span className={styles.statCellValue}>{s.value}</span>
            {s.sub && <span className={styles.statCellSub}>{s.sub}</span>}
          </div>
        ))}
      </div>

      <div className={styles.scienceBlock}>
        <div className={styles.scienceBlockIcon} style={{ color }}>
          <Atom size={12} />
        </div>
        <div>
          <p className={styles.scienceBlockLabel}>COMPOSITION</p>
          <p className={styles.scienceBlockText}>{info.composition}</p>
        </div>
      </div>

      <div className={styles.scienceBlock}>
        <div className={styles.scienceBlockIcon} style={{ color }}>
          <Satellite size={12} />
        </div>
        <div>
          <p className={styles.scienceBlockLabel}>ATMOSPHERE</p>
          <p className={styles.scienceBlockText}>{info.atmosphere}</p>
        </div>
      </div>

      <div className={styles.featuresBlock}>
        <p className={styles.scienceBlockLabel}>NOTABLE FEATURES</p>
        {info.features.map((f, i) => (
          <div key={i} className={styles.featureRow}>
            <span className={styles.featureDot} style={{ background: color }} />
            <span className={styles.featureText}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Tab: Live ──────────────────────────────────────────────────────────────── */
function LiveRow({ label, value, sub, accent }) {
  return (
    <div className={styles.liveRow}>
      <span className={styles.liveLabel}>{label}</span>
      <div className={styles.liveRight}>
        <span className={styles.liveValue} style={accent ? { color: accent } : {}}>
          {value}
        </span>
        {sub && <span className={styles.liveSub}>{sub}</span>}
      </div>
    </div>
  )
}

function LiveTab({ name, color }) {
  const [d, setD] = useState(() => calcPlanetLiveData(name))

  useEffect(() => {
    setD(calcPlanetLiveData(name))
    const t = setInterval(() => setD(calcPlanetLiveData(name)), 10_000)
    return () => clearInterval(t)
  }, [name])

  const timestamp = new Date().toUTCString().replace(' GMT', ' UTC')

  if (!d) {
    return <div className={styles.tabPane}><p className={styles.liveEmpty}>Orbital data unavailable</p></div>
  }

  if (d.isMoon) {
    const phaseEmoji = d.pFrac < 0.05 || d.pFrac > 0.95 ? '🌑'
      : d.pFrac < 0.22 ? '🌒' : d.pFrac < 0.28 ? '🌓' : d.pFrac < 0.47 ? '🌔'
      : d.pFrac < 0.55 ? '🌕' : d.pFrac < 0.73 ? '🌖' : d.pFrac < 0.78 ? '🌗' : '🌘'
    return (
      <div className={styles.tabPane}>
        <div className={styles.liveHeader}>
          <span className={styles.livePulse} style={{ background: color }} />
          <span className={styles.liveHeaderLabel}>LIVE · LUNAR MECHANICS</span>
          <span className={styles.liveTime}>{timestamp}</span>
        </div>
        <div className={styles.liveGrid}>
          <LiveRow label="CURRENT PHASE" value={`${phaseEmoji} ${d.phaseName}`} accent={color} />
          <LiveRow label="ILLUMINATION"  value={`${d.illumination}%`} />
          <LiveRow label="CYCLE PROGRESS" value={`${d.phase.toFixed(1)} / 29.5 days`} />
          <LiveRow label="DAYS TO FULL MOON" value={`${d.daysToFull.toFixed(1)} days`} />
          <LiveRow label="DIST FROM EARTH" value={`${Math.round(d.distEarthKm).toLocaleString()} km`} />
          <LiveRow label="LIGHT TRAVEL" value={`${d.lightSecs.toFixed(3)} seconds`} />
          <LiveRow label="ORBITAL SPEED" value="1.022 km/s" />
        </div>
        <p className={styles.liveNote}>
          Calculated from synodic lunar cycle model. Updates every 10 seconds.
        </p>
      </div>
    )
  }

  if (d.isSun) {
    const season = d.eclipticLon < 90 ? 'Northern spring / Southern autumn'
      : d.eclipticLon < 180 ? 'Northern summer / Southern winter'
      : d.eclipticLon < 270 ? 'Northern autumn / Southern spring'
      : 'Northern winter / Southern summer'
    return (
      <div className={styles.tabPane}>
        <div className={styles.liveHeader}>
          <span className={styles.livePulse} style={{ background: color }} />
          <span className={styles.liveHeaderLabel}>LIVE · KEPLERIAN ORBITAL</span>
          <span className={styles.liveTime}>{timestamp}</span>
        </div>
        <div className={styles.liveGrid}>
          <LiveRow label="DIST FROM EARTH" value={`${d.distEarth.toFixed(5)} AU`}
            sub={`${(d.distEarth * 149597870.7 / 1e6).toFixed(3)} million km`} accent={color} />
          <LiveRow label="LIGHT TRAVEL TIME" value={`${d.lightMins.toFixed(3)} minutes`}
            sub={`${(d.lightMins * 60).toFixed(1)} seconds`} />
          <LiveRow label="SOLAR LONGITUDE" value={`${d.eclipticLon.toFixed(2)}°`} />
          <LiveRow label="CURRENT SEASON" value={season} />
        </div>
        <p className={styles.liveNote}>
          Earth's elliptical orbit: 0.9833 AU (perihelion, ~Jan 3) → 1.0167 AU (aphelion, ~Jul 4).
          Accuracy: ±0.01 AU via J2000 Keplerian elements.
        </p>
      </div>
    )
  }

  const visibility = d.elongation < 18 ? 'Near conjunction — not visible'
    : d.elongation < 40 ? 'Low elongation — difficult to observe'
    : d.elongation > 155 ? 'Near opposition — optimal viewing, visible all night'
    : d.elongation > 100 ? 'Large elongation — good visibility'
    : 'Moderate elongation — visible with optical aid'

  return (
    <div className={styles.tabPane}>
      <div className={styles.liveHeader}>
        <span className={styles.livePulse} style={{ background: color }} />
        <span className={styles.liveHeaderLabel}>LIVE · KEPLERIAN ORBITAL MECHANICS</span>
        <span className={styles.liveTime}>{timestamp}</span>
      </div>
      <div className={styles.liveGrid}>
        <LiveRow label="DIST FROM SUN"
          value={`${d.distSun.toFixed(4)} AU`}
          sub={`${(d.distSun * 149.598).toFixed(1)} million km`}
          accent={color} />
        <LiveRow label="DIST FROM EARTH"
          value={`${d.distEarth.toFixed(4)} AU`}
          sub={`${d.lightFromEarth.toFixed(1)} light-min`} />
        <LiveRow label="ORBITAL SPEED"    value={`${d.orbSpeed.toFixed(2)} km/s`} />
        <LiveRow label="ECLIPTIC LON."    value={`${d.eclipticLon.toFixed(2)}°`} />
        <LiveRow label="ELONGATION"       value={`${d.elongation.toFixed(1)}°`} />
        <LiveRow label="LIGHT FROM SUN"   value={`${d.lightFromSun.toFixed(2)} min`} />
        <LiveRow label="VISIBILITY"       value={visibility} />
      </div>
      <p className={styles.liveNote}>
        Computed from J2000 Keplerian elements (JPL/NASA). Accuracy ±1° for 1800–2050.
        Updates every 10 seconds.
      </p>
    </div>
  )
}

/* ── Bottom live bar ────────────────────────────────────────────────────────── */
function BottomBar({ name, color }) {
  const [d, setD] = useState(() => calcPlanetLiveData(name))

  useEffect(() => {
    setD(calcPlanetLiveData(name))
    const t = setInterval(() => setD(calcPlanetLiveData(name)), 30_000)
    return () => clearInterval(t)
  }, [name])

  if (!d) return null

  let items
  if (d.isMoon) {
    items = [
      { label: 'PHASE',           value: d.phaseName },
      { label: 'DIST FROM EARTH', value: `${Math.round(d.distEarthKm / 1000)}k km` },
      { label: 'LIGHT TRAVEL',    value: `${d.lightSecs.toFixed(2)} s` },
    ]
  } else if (d.isSun) {
    items = [
      { label: 'EARTH–SUN DIST',  value: `${d.distEarth.toFixed(4)} AU` },
      { label: 'LIGHT TRAVEL',    value: `${d.lightMins.toFixed(2)} min` },
      { label: 'SOLAR LON.',      value: `${d.eclipticLon.toFixed(1)}°` },
    ]
  } else {
    items = [
      { label: 'DIST FROM SUN',   value: `${d.distSun.toFixed(3)} AU` },
      { label: 'ORBITAL SPEED',   value: `${d.orbSpeed.toFixed(2)} km/s` },
      { label: 'DIST FROM EARTH', value: `${d.distEarth.toFixed(3)} AU` },
    ]
  }

  return (
    <div className={styles.bottomBar}>
      <div className={styles.bottomLiveTag}>
        <Wifi size={10} style={{ color }} />
        <span style={{ color }}>LIVE</span>
      </div>
      <div className={styles.bottomSep} />
      {items.map((item, i) => (
        <div key={i} className={styles.bottomItem}>
          <span className={styles.bottomItemLabel}>{item.label}</span>
          <span className={styles.bottomItemValue}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main export ────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'science',  label: 'Science'  },
  { id: 'live',     label: 'Live',    live: true },
]

export default function PlanetPage() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const isLoggedIn     = useAuthStore(s => s.isLoggedIn)
  const openLoginModal = useAuthStore(s => s.openLoginModal)

  const [tab, setTab] = useState('overview')

  const data = ALL_BODIES.find(b => b.name === currentPage) ?? null

  // Reset to overview when changing planet
  useEffect(() => { if (data) setTab('overview') }, [data?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTimerRef = useRef(null)
  useEffect(() => () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current) }, [])

  function handleExplore() {
    if (!isLoggedIn) { openLoginModal(); return }
    const phaseId = data ? PLANET_TO_PHASE[data.name] : null
    setCurrentPage(PAGE.HDI)
    if (phaseId) {
      scrollTimerRef.current = setTimeout(() => {
        document.getElementById(phaseId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 480)
    }
  }

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key={data.name}
          className={styles.container}
          style={{ '--pc': data.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38 }}
        >

          {/* ── 3D Planet canvas ── */}
          <div className={styles.canvasContainer}>
            <Canvas
              camera={{ position: [0, 0, 7], fov: 48 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'transparent' }}
            >
              <ambientLight intensity={0.28} />
              <directionalLight position={[6, 3, 5]} intensity={2.4} />
              <Suspense fallback={null}>
                <PlanetBall
                  textureUrl={data.textureUrl}
                  color={data.color}
                  hasRings={!!data.hasRings}
                />
              </Suspense>
              <OrbitControls enableZoom={false} enablePan={false}
                minPolarAngle={Math.PI * 0.18} maxPolarAngle={Math.PI * 0.82} />
            </Canvas>
          </div>

          {/* ── Left panel ── */}
          <div className={styles.panel}>

            {/* Header */}
            <header className={styles.header}>
              <div className={styles.logoGroup}>
                <span className={styles.planetDot}
                  style={{ background: data.color, boxShadow: `0 0 7px ${data.color}bb` }} />
                <span className={styles.logoText}>{data.name.toUpperCase()}</span>
                <span className={styles.roleBadge}
                  style={{ color: data.color, borderColor: `${data.color}44`, background: `${data.color}12` }}>
                  {data.role}
                </span>
              </div>
              <button className={styles.closeBtn} onClick={() => setCurrentPage(null)} aria-label="Close">
                <X size={16} />
              </button>
            </header>

            {/* Tab nav */}
            <nav className={styles.tabNav} aria-label="Planet info sections">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
                  onClick={() => setTab(t.id)}
                  style={tab === t.id ? { borderBottomColor: data.color } : {}}
                  aria-selected={tab === t.id}
                >
                  {t.label}
                  {t.live && <span className={styles.liveDot} style={{ background: data.color }} />}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <div className={styles.tabContent}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  style={{ height: '100%' }}
                >
                  {tab === 'overview' && (
                    <OverviewTab data={data} onExplore={handleExplore} isLoggedIn={isLoggedIn} />
                  )}
                  {tab === 'science' && (
                    <ScienceTab name={data.name} color={data.color} />
                  )}
                  {tab === 'live' && (
                    <LiveTab name={data.name} color={data.color} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Bottom live bar ── */}
          <BottomBar name={data.name} color={data.color} />

        </motion.div>
      )}
    </AnimatePresence>
  )
}
