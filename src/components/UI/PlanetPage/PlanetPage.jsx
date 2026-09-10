import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture, OrbitControls, Stars, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import FocusTrap from 'focus-trap-react'
import { X, ArrowRight, ExternalLink, Satellite, Atom, Wifi, ChevronLeft, ChevronRight } from 'lucide-react'
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

/* Earth reference values for the comparison bars */
const EARTH_REF = { gravity: 9.807, escapeVel: 11.186, diameter: 12742 }

// drei `useTexture` onLoad handler — raise anisotropic filtering so textures stay
// sharp at grazing angles. Runs once per mount; PlanetBall is remounted on every
// body change (keyed container) so each planet's texture is covered.
function sharpenTextures(loaded) {
  const list = Array.isArray(loaded) ? loaded : [loaded]
  for (const tex of list) {
    if (tex?.isTexture) {
      tex.anisotropy = 16
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
    }
  }
}

// Re-derive live Keplerian data for `name`. The interval just forces a re-render;
// the (cheap) computation runs during render, so there is no synchronous setState
// in an effect body and the value always tracks the current time and `name`.
function useLiveOrbitalData(name, intervalMs) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return calcPlanetLiveData(name)
}

/* ── 3D rotating planet ─────────────────────────────────────────────────────── */
const RING_BANDS = [
  [3.05, 3.62, 0.34],
  [3.72, 4.22, 0.22],   // Cassini-division gap between this and the next
  [4.46, 5.15, 0.30],
]

function PlanetBall({ textureUrl, color, hasRings, isSun, tilt = 0, spin }) {
  const groupRef = useRef()
  const [map] = useTexture([textureUrl], sharpenTextures)
  const tiltRad = (tilt % 180) * (Math.PI / 180)

  useFrame((_, delta) => {
    if (groupRef.current && spin) groupRef.current.rotation.y += delta * spin
  })

  return (
    <group rotation={[0, 0, tiltRad]}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[2.4, 128, 128]} />
          {isSun ? (
            <meshBasicMaterial map={map} toneMapped={false} />
          ) : (
            <meshStandardMaterial map={map} roughness={0.82} metalness={0.02} />
          )}
        </mesh>

        {/* inner glow */}
        <mesh>
          <sphereGeometry args={[2.52, 64, 64]} />
          <meshBasicMaterial color={color} transparent opacity={isSun ? 0.16 : 0.07}
            side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        {/* outer haze */}
        <mesh>
          <sphereGeometry args={[isSun ? 3.2 : 2.82, 64, 64]} />
          <meshBasicMaterial color={color} transparent opacity={isSun ? 0.07 : 0.028}
            side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>

        {/* Saturn rings — layered bands with a Cassini-division gap */}
        {hasRings && RING_BANDS.map(([inner, outer, opacity], i) => (
          <mesh key={i} rotation={[Math.PI / 2.4, 0, 0]}>
            <ringGeometry args={[inner, outer, 96]} />
            <meshBasicMaterial color="#d8c58f" transparent opacity={opacity}
              side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {isSun && <Sparkles count={40} scale={9} size={5} speed={spin ? 0.3 : 0} color={color} opacity={0.5} />}
    </group>
  )
}

function PlanetScene({ data, reduce }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 7.4], fov: 46 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reduce ? 'demand' : 'always'}
      style={{ background: 'transparent' }}
    >
      <color attach="background" args={['#01020a']} />
      <fog attach="fog" args={['#01020a', 14, 30]} />

      {data.name === 'Sun' ? (
        <ambientLight intensity={1.1} />
      ) : (
        <>
          <ambientLight intensity={0.16} />
          <directionalLight position={[6, 2.5, 5]} intensity={2.6} />
          {/* coloured rim light from behind */}
          <pointLight position={[-5, -1, -4]} intensity={1.4} color={data.color} distance={22} />
          <pointLight position={[0, 4, 3]} intensity={0.35} color="#8fb7ff" />
        </>
      )}

      <Stars radius={90} depth={45} count={2200} factor={3.2} saturation={0} fade
        speed={reduce ? 0 : 0.35} />

      <Suspense fallback={null}>
        <PlanetBall
          textureUrl={data.textureUrl}
          color={data.color}
          hasRings={!!data.hasRings}
          isSun={data.name === 'Sun'}
          tilt={data.tilt ?? 0}
          spin={reduce ? 0 : (data.name === 'Sun' ? 0.06 : 0.13)}
        />
      </Suspense>

      <OrbitControls
        enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI * 0.16} maxPolarAngle={Math.PI * 0.84}
      />
    </Canvas>
  )
}

/* ── Tab: Overview ──────────────────────────────────────────────────────────── */
function OverviewTab({ data, onExplore, isLoggedIn }) {
  return (
    <div className={styles.tabPane}>
      <motion.div className={styles.eyebrow}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
        <span className={styles.eyebrowDot} style={{ background: data.color }} />
        SOVEREIGN NETWORK &nbsp;·&nbsp; {data.role.toUpperCase()}
      </motion.div>

      <motion.h1 className={styles.planetName}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        style={{ background: `linear-gradient(135deg, #ffffff 0%, ${data.color} 118%)`,
                 WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {data.name}
      </motion.h1>

      <motion.p className={styles.factText}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
        {data.fact}
      </motion.p>

      <motion.div className={styles.unlockCard} style={{ borderColor: `${data.color}33` }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <span className={styles.unlockLabel}>UNLOCKS ON ARRIVAL</span>
        <span className={styles.unlockValue} style={{ color: data.color }}>{data.unlock}</span>
      </motion.div>

      <motion.div className={styles.ctaRow}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button
          className={styles.ctaPrimary}
          style={{ borderColor: `${data.color}66`, background: `${data.color}1c` }}
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
      </motion.div>
    </div>
  )
}

/* ── Tab: Science ───────────────────────────────────────────────────────────── */
function num(str) {
  const m = String(str).match(/-?[\d,]+\.?\d*/)
  return m ? parseFloat(m[0].replace(/,/g, '')) : null
}

function CompareBar({ label, ratio, color }) {
  const reduce = useReducedMotion()
  if (ratio == null || !isFinite(ratio)) return null
  const pct = Math.min(ratio / 3, 1) * 100
  const over = ratio > 3
  return (
    <div className={styles.cmpRow}>
      <span className={styles.cmpLabel}>{label}</span>
      <div className={styles.cmpTrack}>
        <div className={styles.cmpEarthTick} title="Earth = 1×" />
        <motion.div className={styles.cmpFill} style={{ background: color }}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <span className={styles.cmpVal}>{over ? '»' : ''}{ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(2)}×</span>
    </div>
  )
}

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

  const dRatio = num(info.diameterRatio) ?? (num(info.diameter) != null ? num(info.diameter) / EARTH_REF.diameter : null)
  const gRatio = num(info.gravity)   != null ? num(info.gravity)   / EARTH_REF.gravity   : null
  const eRatio = num(info.escapeVel) != null ? num(info.escapeVel) / EARTH_REF.escapeVel : null

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

      <div className={styles.cmpBlock}>
        <p className={styles.scienceBlockLabel}>RELATIVE TO EARTH</p>
        <CompareBar label="Size"    ratio={dRatio} color={color} />
        <CompareBar label="Gravity" ratio={gRatio} color={color} />
        <CompareBar label="Escape velocity" ratio={eRatio} color={color} />
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

/* ── Live visualisations ────────────────────────────────────────────────────── */
function MoonPhaseDisc({ frac, illum, color }) {
  // frac 0→1 across the synodic cycle; illum is the lit fraction as a percentage.
  // Lit half-disc + a terminator ellipse that either carves it (crescent) or
  // extends it into the dark side (gibbous).
  const R = 34
  const DARK = '#06070e'
  const f = Math.max(0, Math.min(1, illum / 100))
  const waxing = frac < 0.5
  const gibbous = f > 0.5
  const rx = R * Math.abs(1 - 2 * f)
  const litSide = waxing ? 1 : -1
  const halfPath = `M 0 ${-R} A ${R} ${R} 0 0 ${waxing ? 1 : 0} 0 ${R} Z`
  const termSweep = (gibbous ? -litSide : litSide) > 0 ? 1 : 0
  const ellPath = `M 0 ${-R} A ${rx} ${R} 0 0 ${termSweep} 0 ${R} Z`
  return (
    <svg viewBox="-40 -40 80 80" className={styles.vizSvg} role="img" aria-label={`Moon ${illum}% illuminated`}>
      <circle cx="0" cy="0" r={R} fill={DARK} stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" />
      <path d={halfPath} fill={color} opacity="0.92" />
      <path d={ellPath} fill={gibbous ? color : DARK} opacity={gibbous ? 0.92 : 1} />
      <circle cx="0" cy="0" r={R} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.7" />
    </svg>
  )
}

function OrbitMap({ d, color }) {
  // Top-down heliocentric map. sqrt scale keeps outer planets on-canvas.
  const scale = r => 8 + Math.sqrt(r) * 15
  const rP = Math.min(scale(d.distSun), 44)
  const rE = scale(d.earthDistSun ?? 1)
  const pA = -(d.helioLon ?? 0) * Math.PI / 180
  const eA = -(d.earthLon ?? 0) * Math.PI / 180
  const px = Math.cos(pA) * rP, py = Math.sin(pA) * rP
  const ex = Math.cos(eA) * rE, ey = Math.sin(eA) * rE
  return (
    <svg viewBox="-50 -50 100 100" className={styles.vizSvg} role="img" aria-label="Top-down orbital position">
      <circle cx="0" cy="0" r={rE} fill="none" stroke="rgba(120,170,255,0.3)" strokeWidth="0.5" />
      <circle cx="0" cy="0" r={rP} fill="none" stroke={`${color}66`} strokeWidth="0.5" />
      <line x1={ex} y1={ey} x2={px} y2={py} stroke="rgba(255,255,255,0.14)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
      <circle cx="0" cy="0" r="2.6" fill="#ffcf5c" />
      <circle cx={ex} cy={ey} r="1.7" fill="#7ab0ff" />
      <circle cx={px} cy={py} r="2.2" fill={color} />
    </svg>
  )
}

function SunDial({ lon, season, color }) {
  const a = -(lon ?? 0) * Math.PI / 180
  return (
    <svg viewBox="-50 -50 100 100" className={styles.vizSvg} role="img" aria-label={season}>
      <circle cx="0" cy="0" r="38" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      {[0, 90, 180, 270].map(deg => {
        const r = deg * Math.PI / 180
        return <line key={deg} x1={Math.cos(r) * 34} y1={Math.sin(r) * 34}
          x2={Math.cos(r) * 38} y2={Math.sin(r) * 38} stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
      })}
      <line x1="0" y1="0" x2={Math.cos(a) * 32} y2={Math.sin(a) * 32} stroke={color} strokeWidth="1.4" />
      <circle cx="0" cy="0" r="3" fill={color} />
      <circle cx={Math.cos(a) * 32} cy={Math.sin(a) * 32} r="2.4" fill="#7ab0ff" />
    </svg>
  )
}

function LiveHeader({ label, color, timestamp }) {
  return (
    <div className={styles.liveHeader}>
      <span className={styles.livePulse} style={{ background: color }} />
      <span className={styles.liveHeaderLabel}>{label}</span>
      <span className={styles.liveTime}>{timestamp}</span>
    </div>
  )
}

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
  const d = useLiveOrbitalData(name, 10_000)
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
        <LiveHeader label="LIVE · LUNAR MECHANICS" color={color} timestamp={timestamp} />
        <div className={styles.vizWrap}>
          <MoonPhaseDisc frac={d.pFrac} illum={d.illumination} color={color} />
          <div className={styles.vizCaption}>
            <span className={styles.vizBig} style={{ color }}>{phaseEmoji} {d.phaseName}</span>
            <span className={styles.vizSmall}>{d.illumination}% illuminated · {d.daysToFull.toFixed(1)} days to full</span>
          </div>
        </div>
        <div className={styles.liveGrid}>
          <LiveRow label="ILLUMINATION"  value={`${d.illumination}%`} accent={color} />
          <LiveRow label="CYCLE PROGRESS" value={`${d.phase.toFixed(1)} / 29.5 days`} />
          <LiveRow label="DIST FROM EARTH" value={`${Math.round(d.distEarthKm).toLocaleString()} km`} />
          <LiveRow label="LIGHT TRAVEL" value={`${d.lightSecs.toFixed(3)} seconds`} />
          <LiveRow label="ORBITAL SPEED" value="1.022 km/s" />
        </div>
        <p className={styles.liveNote}>
          Calculated from the synodic lunar cycle model. Updates every 10 seconds.
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
        <LiveHeader label="LIVE · KEPLERIAN ORBITAL" color={color} timestamp={timestamp} />
        <div className={styles.vizWrap}>
          <SunDial lon={d.eclipticLon} season={season} color={color} />
          <div className={styles.vizCaption}>
            <span className={styles.vizBig} style={{ color }}>{d.eclipticLon.toFixed(1)}° solar longitude</span>
            <span className={styles.vizSmall}>{season}</span>
          </div>
        </div>
        <div className={styles.liveGrid}>
          <LiveRow label="DIST FROM EARTH" value={`${d.distEarth.toFixed(5)} AU`}
            sub={`${(d.distEarth * 149597870.7 / 1e6).toFixed(3)} million km`} accent={color} />
          <LiveRow label="LIGHT TRAVEL TIME" value={`${d.lightMins.toFixed(3)} minutes`}
            sub={`${(d.lightMins * 60).toFixed(1)} seconds`} />
          <LiveRow label="SOLAR LONGITUDE" value={`${d.eclipticLon.toFixed(2)}°`} />
        </div>
        <p className={styles.liveNote}>
          Earth's elliptical orbit: 0.9833 AU (perihelion, ~Jan 3) → 1.0167 AU (aphelion, ~Jul 4).
          Accuracy ±0.01 AU via J2000 Keplerian elements.
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
      <LiveHeader label="LIVE · KEPLERIAN ORBITAL MECHANICS" color={color} timestamp={timestamp} />
      <div className={styles.vizWrap}>
        <OrbitMap d={d} color={color} />
        <div className={styles.vizCaption}>
          <span className={styles.vizBig} style={{ color }}>{d.distEarth.toFixed(3)} AU from Earth</span>
          <span className={styles.vizSmall}>
            {(d.illumFrac * 100).toFixed(0)}% illuminated disc · {d.elongation.toFixed(0)}° elongation
          </span>
        </div>
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
  const d = useLiveOrbitalData(name, 30_000)
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
  const reduce         = useReducedMotion()

  const [tab, setTab] = useState('overview')

  const idx  = ALL_BODIES.findIndex(b => b.name === currentPage)
  const data = idx >= 0 ? ALL_BODIES[idx] : null

  // Reset to the overview tab whenever a body is opened or swapped — adjusted
  // during render (React's "storing information from previous renders" pattern).
  const [tabbedName, setTabbedName] = useState(null)
  if ((data?.name ?? null) !== tabbedName) {
    setTabbedName(data?.name ?? null)
    if (data) setTab('overview')
  }

  const scrollTimerRef = useRef(null)
  useEffect(() => () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current) }, [])

  const close = useCallback(() => setCurrentPage(null), [setCurrentPage])

  const goBody = useCallback((dir) => {
    if (idx < 0) return
    const next = (idx + dir + ALL_BODIES.length) % ALL_BODIES.length
    setCurrentPage(ALL_BODIES[next].name)
  }, [idx, setCurrentPage])

  const handleExplore = useCallback(() => {
    if (!isLoggedIn) { openLoginModal(); return }
    const phaseId = data ? PLANET_TO_PHASE[data.name] : null
    setCurrentPage(PAGE.HDI)
    if (phaseId) {
      scrollTimerRef.current = setTimeout(() => {
        document.getElementById(phaseId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 480)
    }
  }, [isLoggedIn, openLoginModal, data, setCurrentPage])

  // Keyboard: ESC closes, [ / ] and ←/→ switch body, ←/→ within tablist handled locally
  useEffect(() => {
    if (!data) return
    function onKey(e) {
      if (e.key === 'Escape') { close(); return }
      if (e.target instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === '[') goBody(-1)
      else if (e.key === ']') goBody(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [data, close, goBody])

  function onTabKey(e) {
    const i = TABS.findIndex(t => t.id === tab)
    if (e.key === 'ArrowRight') { e.preventDefault(); setTab(TABS[(i + 1) % TABS.length].id) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(TABS[(i - 1 + TABS.length) % TABS.length].id) }
  }

  const scene = useMemo(
    () => data && <PlanetScene data={data} reduce={!!reduce} />,
    [data, reduce],
  )

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
          role="dialog"
          aria-modal="true"
          aria-label={`${data.name} — ${data.role}`}
        >
          {/* ── 3D Planet canvas ── */}
          <div className={styles.canvasContainer}>
            <div className={styles.canvasSkeleton} aria-hidden="true">
              <div className={styles.skeletonOrb} style={{ borderColor: `${data.color}55` }} />
            </div>
            {scene}
          </div>

          <div className={styles.vignette} aria-hidden="true" />
          <div className={styles.grain} aria-hidden="true" />

          {/* ── Left panel ── */}
          <FocusTrap focusTrapOptions={{
            escapeDeactivates: false, allowOutsideClick: true, clickOutsideDeactivates: false,
            fallbackFocus: `.${styles.panel}`,
          }}>
          <div className={styles.panel} tabIndex={-1}>

            {/* Header */}
            <header className={styles.header}>
              <div className={styles.logoGroup}>
                <img src="/logo/mark.png" alt="EarthSphere" className={styles.brandMark} width="20" height="20" />
                <span className={styles.brandDivider} aria-hidden="true" />
                <span className={styles.planetDot}
                  style={{ background: data.color, boxShadow: `0 0 8px ${data.color}` }} />
                <span className={styles.logoText}>{data.name.toUpperCase()}</span>
                <span className={styles.roleBadge}
                  style={{ color: data.color, borderColor: `${data.color}44`, background: `${data.color}14` }}>
                  {data.role}
                </span>
              </div>
              <div className={styles.headerActions}>
                <button className={styles.navBtn} onClick={() => goBody(-1)} aria-label="Previous body">
                  <ChevronLeft size={15} />
                </button>
                <button className={styles.navBtn} onClick={() => goBody(1)} aria-label="Next body">
                  <ChevronRight size={15} />
                </button>
                <button className={styles.closeBtn} onClick={close} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Tab nav */}
            <nav className={styles.tabNav} role="tablist" aria-label="Planet info sections"
              onKeyDown={onTabKey}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  id={`ptab-${t.id}`}
                  aria-controls={`ppanel-${t.id}`}
                  aria-selected={tab === t.id}
                  tabIndex={tab === t.id ? 0 : -1}
                  className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  {t.live && <span className={styles.liveDot} style={{ background: data.color }} />}
                  {tab === t.id && (
                    <motion.span layoutId="ptab-underline" className={styles.tabUnderline}
                      style={{ background: data.color }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                  )}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <div className={styles.tabContent} role="tabpanel"
              id={`ppanel-${tab}`} aria-labelledby={`ptab-${tab}`} tabIndex={0}>
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
          </FocusTrap>

          {/* ── Bottom live bar ── */}
          <BottomBar name={data.name} color={data.color} />

        </motion.div>
      )}
    </AnimatePresence>
  )
}
