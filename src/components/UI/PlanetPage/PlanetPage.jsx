import { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ExternalLink } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { PLANETS, MOON, SUN_DATA } from '../../SolarSystem/planetData'
import styles from './PlanetPage.module.css'

// Planet → HDI phase section mapping
const PLANET_TO_PHASE = {
  Mercury: 'p2', Venus: 'p3', Mars: 'p4',
  Jupiter: 'p5', Saturn: 'p6', Uranus: 'p7', Neptune: 'p7',
  Moon: 'p2', Sun: 'p1',
}

// All data sources unified
const ALL_BODIES = [
  ...PLANETS.filter(p => !p.isEarth),
  MOON,
  SUN_DATA,
]

// ── Per-body footer stats ─────────────────────────────────────────────────────
const STATS = {
  Mercury: [{ label: 'RELAY NODES',      value: '892'    }, { label: 'AVG LATENCY',      value: '0.3ms'  }, { label: 'UPTIME',          value: '99.97%' }],
  Venus:   [{ label: 'CONSENTS ACTIVE',  value: '3.4M'   }, { label: 'PERMISSION SCOPES', value: '12'     }, { label: 'USERS PROTECTED', value: '847K'   }],
  Mars:    [{ label: 'VAULTS ACTIVE',    value: '214K'   }, { label: 'RECOVERY NODES',   value: '1,842'  }, { label: 'GUARDIAN LINKS',  value: '688K'   }],
  Jupiter: [{ label: 'TRUST LINKS',      value: '8.2M'   }, { label: 'VERIFIED CHAINS',  value: '3.1M'   }, { label: 'NETWORK DEPTH',   value: '6'      }],
  Saturn:  [{ label: 'ASSETS LINKED',    value: '5.6M'   }, { label: 'TOKEN VALUE',      value: '$2.1B'  }, { label: 'NFT HOLDINGS',    value: '892K'   }],
  Uranus:  [{ label: 'PRIVATE SETS',     value: '1.2M'   }, { label: 'DISCLOSED FIELDS', value: '4.8M'   }, { label: 'ZK PROOFS',       value: '892K'   }],
  Neptune: [{ label: 'EXPORTS ISSUED',   value: '142K'   }, { label: 'CROSS-CHAIN IDs',  value: '89K'    }, { label: 'NETWORKS',        value: '24'     }],
  Moon:    [{ label: 'GATEWAY NODES',    value: '312'    }, { label: 'SYNC LATENCY',     value: '1.2s'   }, { label: 'PHASE STATUS',    value: 'ACTIVE' }],
  Sun:     [{ label: 'NODES POWERED',    value: '1,248'  }, { label: 'ENERGY OUTPUT',    value: '3.8×10²⁶W'}, { label: 'PROTOCOL AGE',  value: '4.6Gyr' }],
}

// ── 3D rotating planet ────────────────────────────────────────────────────────
function PlanetBall({ textureUrl, color, hasRings }) {
  const groupRef = useRef()
  const [map] = useTexture([textureUrl])

  useEffect(() => {
    if (map) { map.anisotropy = 16; map.needsUpdate = true }
  }, [map])

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.003
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[2.2, 96, 96]} />
        <meshStandardMaterial map={map} roughness={0.72} metalness={0.04} />
      </mesh>

      {/* Colour-matched atmosphere */}
      <mesh>
        <sphereGeometry args={[2.32, 64, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.055}
          side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.52, 64, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.022}
          side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Saturn rings */}
      {hasRings && (
        <mesh rotation={[Math.PI / 2.6, 0.15, 0]}>
          <ringGeometry args={[2.85, 4.4, 80]} />
          <meshBasicMaterial color="#c9b96a" transparent opacity={0.34}
            side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ── Animation variants ────────────────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.18 } } }
const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } }

// All body names that trigger PlanetPage (excludes Earth which has EarthHero)
export const PLANET_PAGE_NAMES = ALL_BODIES.map(b => b.name)

// ── Main component ────────────────────────────────────────────────────────────
export default function PlanetPage() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const isLoggedIn     = useAuthStore(s => s.isLoggedIn)
  const openLoginModal = useAuthStore(s => s.openLoginModal)

  const data  = ALL_BODIES.find(b => b.name === currentPage) ?? null
  const stats = data ? (STATS[data.name] ?? []) : []

  function handleExplore() {
    if (!isLoggedIn) { openLoginModal(); return }
    const phaseId = data ? PLANET_TO_PHASE[data.name] : null
    setCurrentPage('hdi')
    if (phaseId) {
      setTimeout(() => {
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
          style={{ '--pc': data.color, '--pcg': `${data.color}18` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42 }}
        >
          {/* ── Header ── */}
          <header className={styles.header}>
            <div className={styles.logoGroup}>
              <span className={styles.planetDot}
                style={{ background: data.color, boxShadow: `0 0 8px ${data.color}99` }} />
              <span className={styles.logoText}>{data.name.toUpperCase()}</span>
              <span className={styles.roleBadge}
                style={{ color: data.color, borderColor: `${data.color}44`, background: `${data.color}14` }}>
                {data.role}
              </span>
            </div>
            <button className={styles.closeBtn} onClick={() => setCurrentPage(null)} aria-label="Close">
              <X size={18} />
            </button>
          </header>

          {/* ── Hero copy ── */}
          <motion.div className={styles.heroContent} variants={stagger} initial="hidden" animate="show">

            <motion.div className={styles.eyebrow} variants={fadeUp}>
              <span className={styles.eyebrowDot} style={{ background: data.color }} />
              SOVEREIGN NETWORK &nbsp;·&nbsp; {data.role.toUpperCase()}
            </motion.div>

            <motion.h1 className={styles.planetName} variants={fadeUp}>
              {data.name}
            </motion.h1>

            <motion.p className={styles.fact} variants={fadeUp}>
              {data.fact}
            </motion.p>

            <motion.div className={styles.unlockRow} variants={fadeUp}>
              <span className={styles.unlockLabel}>UNLOCKS</span>
              <span className={styles.unlockValue} style={{ color: data.color }}>{data.unlock}</span>
            </motion.div>

            <motion.div className={styles.ctaRow} variants={fadeUp}>
              <button
                className={styles.ctaPrimary}
                style={{ borderColor: `${data.color}55`, background: `${data.color}18`, color: '#fff' }}
                onClick={handleExplore}
              >
                {isLoggedIn ? `Open in HDI` : 'Create Identity'}
                <ArrowRight size={15} />
              </button>
              {data.appUrl && (
                <a
                  href={data.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ctaApp}
                  style={{ borderColor: `${data.color}44`, color: data.color }}
                >
                  {data.appName} <ExternalLink size={13} />
                </a>
              )}
              <button
                className={styles.ctaSecondary}
                onClick={() => setCurrentPage(null)}
              >
                Solar System
              </button>
            </motion.div>

          </motion.div>

          {/* ── 3D Globe ── */}
          <div className={styles.canvasContainer}>
            <Canvas
              camera={{ position: [0, 0, 6.5], fov: 50 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: 'transparent' }}
            >
              <ambientLight intensity={0.35} />
              <directionalLight position={[5, 3, 5]} intensity={2.2} />
              <Suspense fallback={null}>
                <PlanetBall textureUrl={data.textureUrl} color={data.color} hasRings={!!data.hasRings} />
              </Suspense>
              <OrbitControls enableZoom={false} enablePan={false} autoRotate={false}
                minPolarAngle={Math.PI * 0.2} maxPolarAngle={Math.PI * 0.8} />
            </Canvas>
          </div>

          {/* ── Footer stats ── */}
          <footer className={styles.footer}>
            {stats.map((s, i) => (
              <div key={i} className={styles.stat}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
