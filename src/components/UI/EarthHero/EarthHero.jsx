import { useMemo, useRef, Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ExternalLink, Shield, MapPin, Cpu,
  Link2, Building2, Users,
  ArrowRight, MessageCircle, Monitor, Globe2,
  Mail, Phone, Landmark, TrendingUp, Eye,
} from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { useNationStore } from '../../../store/nationStore'
import { JARVIS_DNA } from '../../../data/jarvis.dna'
import styles from './EarthHero.module.css'

// ── Digital matrix rain ───────────────────────────────────────────────────────
const MATRIX_CHARS = '01アイウエオ∑∏∆∇∈∉√∞∟∠∧∨∩∪∫∴∵≠≡≤≥⊂⊃⊄⊆⊇⊕⊗⊘'

function MatrixRain() {
  const canvasRef = useRef()

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ctx = el.getContext('2d')
    const fontSize = 11
    let cols, drops, animId

    function resize() {
      el.width  = el.offsetWidth
      el.height = el.offsetHeight
      cols  = Math.floor(el.width / fontSize)
      drops = Array(cols).fill(1)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    function draw() {
      ctx.fillStyle = 'rgba(2,8,18,0.06)'
      ctx.fillRect(0, 0, el.width, el.height)
      ctx.font = `${fontSize}px 'Space Mono', monospace`
      for (let i = 0; i < drops.length; i++) {
        const ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
        const bright = Math.random() > 0.95
        ctx.fillStyle = bright ? 'rgba(147,197,253,0.55)' : 'rgba(77,166,255,0.14)'
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > el.height && Math.random() > 0.974) drops[i] = 0
        drops[i]++
      }
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className={styles.matrixCanvas} aria-hidden="true" />
}

// ── Hub links for kingofyadav.in (Jarvis fallback) ────────────────────────────
const HUB = [
  { emoji: '✍️', label: 'Blog',         sub: 'Writing & essays',      href: 'https://kingofyadav.in/pages/blog.html' },
  { emoji: '💼', label: 'Professional', sub: 'Work & skills',          href: 'https://kingofyadav.in/pages/professional.html' },
  { emoji: '🤝', label: 'Collaborate',  sub: 'Partner on a project',   href: 'https://kingofyadav.in/pages/collaboration.html' },
  { emoji: '⚙️', label: 'Services',     sub: 'Digital systems & AI',   href: 'https://kingofyadav.in/pages/services.html' },
  { emoji: '💳', label: 'Wallet',       sub: 'HI Coin & assets',       href: 'https://kingofyadav.in/wallet/' },
  { emoji: '📬', label: 'Contact',      sub: 'Get in touch',           href: 'https://kingofyadav.in/pages/contact.html' },
]

const ASSET_ICON = {
  domain:       <Link2 size={11} />,
  wallet:       <Landmark size={11} />,
  credential:   <Shield size={11} />,
  document:     <Building2 size={11} />,
  business:     <Building2 size={11} />,
  organization: <Users size={11} />,
  community:    <Users size={11} />,
}

const TRUST_LABELS = ['Unverified', 'Self-Sovereign', 'Public Verified', 'Chain Stamped']

// ── Trust helpers (mirrored from HDIPage) ─────────────────────────────────────
function trustLabel(score) {
  if (score < 200) return 'Unverified'
  if (score < 400) return 'Emerging'
  if (score < 600) return 'Established'
  if (score < 800) return 'Trusted'
  return 'Sovereign'
}
function computeTrustScore(verif = {}, rels = [], assets = {}, rec = {}) {
  let s = 100
  if (verif.email)       s += 100
  if (verif.phone)       s += 150
  if (verif.govId)       s += 150
  if (verif.employer)    s += 100
  if (verif.university)  s += 100
  if (verif.socialTrust) s += 100
  s += Math.min(rels.length * 10, 50)
  s += Math.min(Object.values(assets).reduce((t, a) => t + (a?.length || 0), 0) * 10, 50)
  s += Object.values(rec).filter(Boolean).length * 25
  return Math.min(s, 1000)
}

const VERIF_BADGE_META = {
  email:       { label: 'Email',    Icon: Mail },
  phone:       { label: 'Phone',    Icon: Phone },
  govId:       { label: 'Gov ID',   Icon: Shield },
  employer:    { label: 'Employer', Icon: Building2 },
  university:  { label: 'Uni',      Icon: Building2 },
  socialTrust: { label: 'Social',   Icon: Users },
}

function assetDisplayLabel(a) {
  return a.name || a.label || a.title || a.url
    || (a.address ? a.address.slice(0, 10) + '…' : null)
    || a._type || 'Asset'
}

// ── Geo helpers ───────────────────────────────────────────────────────────────
function toVec3(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  )
}

const LINKS = [
  [40.71, -74.01, 51.51,  -0.13], [51.51,  -0.13, 48.85,   2.35],
  [48.85,   2.35, 41.01,  28.97], [41.01,  28.97, 25.20,  55.27],
  [25.20,  55.27,  1.35, 103.82], [ 1.35, 103.82, 35.68, 139.69],
  [35.68, 139.69,-33.87, 151.21], [35.68, 139.69, 37.77,-122.40],
  [37.77,-122.40, 40.71, -74.01], [40.71, -74.01,-23.55, -46.63],
  [-23.55,-46.63,  6.52,   3.38], [ 6.52,   3.38, -1.29,  36.82],
  [-1.29,  36.82, 30.05,  31.24], [30.05,  31.24, 55.75,  37.61],
  [55.75,  37.61, 39.91, 116.39], [39.91, 116.39, 35.68, 139.69],
  [19.07,  72.88,  1.35, 103.82], [55.75,  37.61, 51.51,  -0.13],
  [28.61,  77.20, 51.51,  -0.13], [28.61,  77.20, 40.71, -74.01],
  [28.61,  77.20,  1.35, 103.82], [28.61,  77.20, 41.01,  28.97],
]

const CITIES = [
  [40.71,-74.01],[51.51,-0.13],[48.85,2.35],[35.68,139.69],
  [1.35,103.82],[-33.87,151.21],[37.77,-122.40],[55.75,37.61],
  [25.20,55.27],[-23.55,-46.63],[19.07,72.88],[39.91,116.39],
  [28.61,77.20],
]

function ArcNetwork({ R = 2.86 }) {
  const pulseRefs = useRef([])
  const { curves, lineObjects } = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: '#4da6ff', transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const curves = LINKS.map(([la1, lo1, la2, lo2]) => {
      const a   = toVec3(la1, lo1, R)
      const b   = toVec3(la2, lo2, R)
      const mid = a.clone().add(b).normalize().multiplyScalar(R * 1.32)
      return new THREE.QuadraticBezierCurve3(a, mid, b)
    })
    const lineObjects = curves.map(c => {
      const geo = new THREE.BufferGeometry().setFromPoints(c.getPoints(80))
      return new THREE.Line(geo, mat)
    })
    return { curves, lineObjects }
  }, [R])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    pulseRefs.current.forEach((mesh, i) => {
      if (!mesh || !curves[i]) return
      const speed  = 0.09 + (i % 7) * 0.007
      const offset = i / LINKS.length
      mesh.position.copy(curves[i].getPoint((t * speed + offset) % 1))
    })
  })

  return (
    <group>
      {lineObjects.map((obj, i) => <primitive key={i} object={obj} />)}
      {LINKS.map((_, i) => (
        <mesh key={i} ref={el => { pulseRefs.current[i] = el }}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.9}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function CityNodes({ R = 2.87 }) {
  const nodeRefs = useRef([])
  const positions = useMemo(() => CITIES.map(([lat, lon]) => toVec3(lat, lon, R)), [R])

  useFrame(({ clock }) => {
    const s = Math.sin(clock.elapsedTime * 1.8) * 0.5 + 0.5
    nodeRefs.current.forEach((m, i) => {
      if (!m) return
      m.material.color.set(i === CITIES.length - 1 ? '#FF9933' : '#7dd3fc')
      m.material.opacity = 0.12 + s * (i === CITIES.length - 1 ? 0.5 : 0.14)
    })
  })

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh>
            <sphereGeometry args={[i === CITIES.length - 1 ? 0.038 : 0.022, 8, 8]} />
            <meshBasicMaterial
              color={i === CITIES.length - 1 ? '#FF9933' : '#7dd3fc'}
              transparent opacity={0.95}
              blending={THREE.AdditiveBlending} depthWrite={false}
            />
          </mesh>
          <mesh ref={el => { nodeRefs.current[i] = el }}>
            <sphereGeometry args={[i === CITIES.length - 1 ? 0.08 : 0.05, 8, 8]} />
            <meshBasicMaterial
              color={i === CITIES.length - 1 ? '#FF9933' : '#4da6ff'}
              transparent opacity={0.2}
              blending={THREE.AdditiveBlending} depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const SPHERE_R = 2.8

function AutoFitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!camera.isPerspectiveCamera) return
    const fovRad = (camera.fov * Math.PI) / 180
    const aspect = size.width / size.height
    const fill   = aspect >= 0.7 ? 0.47 : 0.39
    const dim    = aspect >= 0.7 ? 1 : aspect
    const dist   = (SPHERE_R * 2) / (fill * dim * 2 * Math.tan(fovRad / 2))
    camera.position.z = Math.max(8.0, Math.min(17.0, dist))
  }, [size.width, size.height, camera])
  return null
}

function DotGlobe() {
  const groupRef = useRef()
  const [dayMap] = useTexture(['/textures/earth_day.jpg'])

  useFrame(() => { if (groupRef.current) groupRef.current.rotation.y += 0.0009 })

  const dotShader = useMemo(() => ({
    uniforms: {
      uMap:     { value: dayMap },
      uSize:    { value: 1.2 },
      uColor:   { value: new THREE.Color('#c8e4ff') },
      uOpacity: { value: 0.82 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      uniform float uSize;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (15.0 / -mvPosition.z);
        gl_Position  = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4  tex  = texture2D(uMap, vUv);
        float luma = tex.r * 0.299 + tex.g * 0.587 + tex.b * 0.114;
        if (luma < 0.15) discard;
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.47) discard;
        float alpha = smoothstep(0.47, 0.28, dist) * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  }), [dayMap])

  return (
    <group ref={groupRef} rotation={[0.35, 0, 0]}>
      <points>
        <sphereGeometry args={[2.8, 480, 240]} />
        <shaderMaterial args={[dotShader]} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <ArcNetwork />
      <CityNodes />
      <mesh>
        <sphereGeometry args={[2.92, 64, 64]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={0.055} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.12, 64, 64]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.022} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EarthHero() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const openJarvisChat = useEarthStore(s => s.openJarvisChat)

  const isLoggedIn    = useAuthStore(s => s.isLoggedIn)
  const user          = useAuthStore(s => s.user)
  const verifications = useAuthStore(s => s.verifications)
  const disclosure    = useAuthStore(s => s.disclosure)
  const authAssets    = useAuthStore(s => s.assets)
  const relationships = useAuthStore(s => s.relationships)
  const recovery      = useAuthStore(s => s.recovery)
  const openLoginModal = useAuthStore(s => s.openLoginModal)

  const nations = useNationStore(s => s.nations)

  const { identity, location, assets: jAssets, agent, surface } = JARVIS_DNA

  // ── Dynamic derivations ───────────────────────────────────────────────────
  const trustScore = useMemo(() =>
    isLoggedIn ? computeTrustScore(verifications, relationships, authAssets, recovery) : 0,
    [isLoggedIn, verifications, relationships, authAssets, recovery]
  )
  const trustSegs = trustScore < 200 ? 0 : trustScore < 400 ? 1 : trustScore < 600 ? 2 : trustScore < 800 ? 3 : 4

  const activeVerifs = useMemo(() =>
    Object.entries(verifications).filter(([, v]) => v).map(([k]) => k),
    [verifications]
  )

  const myNations = useMemo(() => {
    if (!isLoggedIn || !user?.hdi) return []
    return nations.filter(n => n.citizen_hids.includes(user.hdi) && n.status === 'active')
  }, [nations, isLoggedIn, user])

  const publicAssets = useMemo(() => {
    if (!isLoggedIn) return []
    const flat = []
    ;(authAssets.domains     || []).forEach(d => flat.push({ ...d, _type: 'domain'     }))
    ;(authAssets.wallets     || []).forEach(w => flat.push({ ...w, _type: 'wallet'     }))
    ;(authAssets.credentials || []).forEach(c => flat.push({ ...c, _type: 'credential' }))
    ;(authAssets.documents   || []).forEach(d => flat.push({ ...d, _type: 'document'   }))
    return flat
  }, [isLoggedIn, authAssets])

  const displayName = isLoggedIn
    ? (disclosure.name ? (user?.name || 'Traveler') : 'Anonymous Traveler')
    : identity.display_name
  const handle = isLoggedIn ? (user?.hdi || '@anonymous') : identity.handle
  const avatarLetter = isLoggedIn
    ? (disclosure.name && user?.name ? user.name[0].toUpperCase() : '?')
    : identity.display_name[0].toUpperCase()

  function handleHDI() {
    if (isLoggedIn) { setCurrentPage('hdi') } else { setCurrentPage(null); openLoginModal() }
  }
  function handleAskJarvis() { setCurrentPage(null); openJarvisChat() }
  function handleSurface()      { setCurrentPage('surface') }
  function handleEarthSurface() { setCurrentPage('earth-surface') }

  return (
    <AnimatePresence>
      {currentPage === 'earth-hero' && (
        <motion.div
          key="earth-hero"
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >

          {/* ── Header ── */}
          <header className={styles.header}>
            <div className={styles.nodeId}>
              <span className={styles.liveDot} />
              <span className={styles.nodeLabel}>EARTH</span>
              <span className={styles.nodeSep}>·</span>
              <span className={styles.nodeHandle}>{handle}</span>
              {isLoggedIn
                ? <span className={styles.nodeVersion}>TRUST {trustScore}</span>
                : <span className={styles.nodeVersion}>NODE #1</span>
              }
            </div>

            <p className={styles.headerTagline}>
              {isLoggedIn
                ? `${activeVerifs.length} verified · ${publicAssets.length} assets · ${myNations.length} nations`
                : 'First User on the Internet'}
            </p>

            <div className={styles.headerRight}>
              {!isLoggedIn && (
                <a
                  href="https://kingofyadav.in"
                  target="_blank" rel="noopener noreferrer"
                  className={styles.profileBtn}
                >
                  kingofyadav.in <ExternalLink size={11} />
                </a>
              )}
              <button className={styles.closeBtn} onClick={() => setCurrentPage(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </header>

          {/* ── Body: 3 columns ── */}
          <div className={styles.body}>

            {/* ── Left: Public HDI ── */}
            <aside className={styles.leftPanel}>
              <div className={styles.panelInner}>

                <div className={styles.panelEyebrow}>
                  <Shield size={10} />
                  {isLoggedIn ? 'YOUR IDENTITY · HID' : 'SOVEREIGN IDENTITY · HID'}
                </div>

                {/* Avatar */}
                <div className={styles.hdiHero}>
                  <div className={styles.hdiAvatar}>
                    {avatarLetter}
                    {!isLoggedIn && <span className={styles.hdiFlag}>{location.flag}</span>}
                  </div>
                  <div className={styles.hdiNames}>
                    <h2 className={styles.hdiDisplay}>{displayName}</h2>
                    {!isLoggedIn && <p className={styles.hdiFullName}>{identity.name}</p>}
                    <code className={styles.hdiHandle}>{handle}</code>
                  </div>
                </div>

                {/* Trust */}
                {isLoggedIn ? (
                  <div className={styles.trustBlock}>
                    <p className={styles.fieldLabel}>Trust Score · {trustScore} / 1000</p>
                    <div className={styles.trustRow}>
                      {[0,1,2,3].map(i => (
                        <span key={i} className={`${styles.trustSeg} ${i < trustSegs ? styles.trustSegActive : ''}`} />
                      ))}
                      <span className={styles.trustLabel}>{trustLabel(trustScore)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.verifiedBadge}>
                      <span className={styles.verifiedTick}>✓</span>
                      <span>VERIFIED</span>
                      <span className={styles.verifiedType}>SELF-SOVEREIGN</span>
                    </div>
                    <div className={styles.trustBlock}>
                      <p className={styles.fieldLabel}>Trust Level</p>
                      <div className={styles.trustRow}>
                        {[0,1,2,3].map(i => (
                          <span key={i} className={`${styles.trustSeg} ${i <= identity.trust_level ? styles.trustSegActive : ''}`} />
                        ))}
                        <span className={styles.trustLabel}>{TRUST_LABELS[identity.trust_level]}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Verified source badges (logged in) */}
                {isLoggedIn && activeVerifs.length > 0 && (
                  <div className={styles.fieldBlock}>
                    <p className={styles.fieldLabel}>Verified Sources · {activeVerifs.length}</p>
                    <div className={styles.verifBadges}>
                      {activeVerifs.map(key => {
                        const m = VERIF_BADGE_META[key]
                        if (!m) return null
                        const Ic = m.Icon
                        return (
                          <span key={key} className={styles.verifBadge}>
                            <Ic size={9} /> {m.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Public contact (based on disclosure) */}
                {isLoggedIn && (disclosure.email || disclosure.phone) && (
                  <div className={styles.fieldBlock}>
                    <p className={styles.fieldLabel}>Public Contact</p>
                    {disclosure.email && user?.email && (
                      <div className={styles.contactRow}>
                        <Mail size={11} className={styles.contactIcon} />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {disclosure.phone && user?.phone && (
                      <div className={styles.contactRow}>
                        <Phone size={11} className={styles.contactIcon} />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Location (JARVIS fallback) */}
                {!isLoggedIn && (
                  <div className={styles.fieldBlock}>
                    <p className={styles.fieldLabel}>Location</p>
                    <div className={styles.locationRow}>
                      <MapPin size={12} className={styles.locIcon} />
                      <span>{location.city}, {location.country}</span>
                    </div>
                    <p className={styles.coords}>
                      {location.lat.toFixed(4)}°N &nbsp;·&nbsp; {location.lng.toFixed(4)}°E
                    </p>
                  </div>
                )}

                {/* Assets */}
                {isLoggedIn ? (
                  publicAssets.length > 0 ? (
                    <div className={styles.fieldBlock}>
                      <p className={styles.fieldLabel}>Public Assets · {publicAssets.length}</p>
                      <ul className={styles.assetList}>
                        {publicAssets.slice(0, 5).map(a => (
                          <li key={a.id} className={styles.assetRow}>
                            <span className={styles.assetIcon}>{ASSET_ICON[a._type] || <Link2 size={11} />}</span>
                            <span className={styles.assetLabel}>{assetDisplayLabel(a)}</span>
                            {a.url && (
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.assetLink} aria-label="Visit">
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className={styles.fieldBlock}>
                      <p className={styles.fieldLabel}>Assets</p>
                      <p className={styles.emptyNote}>No assets added yet. Add wallets, domains, and credentials in your HDI profile.</p>
                    </div>
                  )
                ) : (
                  <div className={styles.fieldBlock}>
                    <p className={styles.fieldLabel}>Public Assets · {jAssets.length}</p>
                    <ul className={styles.assetList}>
                      {jAssets.map(a => (
                        <li key={a.id} className={styles.assetRow}>
                          <span className={styles.assetIcon}>{ASSET_ICON[a.type]}</span>
                          <span className={styles.assetLabel}>{a.label}</span>
                          {a.url && (
                            <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.assetLink} aria-label={`Visit ${a.label}`}>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Agent (JARVIS fallback) */}
                {!isLoggedIn && (
                  <div className={styles.agentRow}>
                    <Cpu size={12} />
                    <span>{agent.model}</span>
                    <span className={styles.agentType}>{agent.type}</span>
                  </div>
                )}

                {/* RPC balance (logged in) */}
                {isLoggedIn && (
                  <div className={styles.rpcChip}>
                    <Landmark size={11} />
                    <span className={styles.rpcValue}>{(user?.rpcBalance ?? 0).toLocaleString()}</span>
                    <span className={styles.rpcLabel}>RPC</span>
                  </div>
                )}

                {/* Actions */}
                <div className={styles.hdiActions}>
                  {!isLoggedIn && (
                    <a
                      href={identity.verify_url}
                      target="_blank" rel="noopener noreferrer"
                      className={styles.btnVerify}
                    >
                      <Shield size={11} /> Verify Identity
                    </a>
                  )}
                  <button className={styles.btnHDI} onClick={handleHDI}>
                    {isLoggedIn ? `Open HDI · ${handle}` : 'Enter Protocol'}
                    <ArrowRight size={12} />
                  </button>
                </div>

                {isLoggedIn && user?.createdAt ? (
                  <p className={styles.licenseId}>
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                ) : (
                  !isLoggedIn && <p className={styles.licenseId}>{identity.license_id}</p>
                )}

              </div>
            </aside>

            {/* ── Center: Dot Globe ── */}
            <div className={styles.canvasWrap}>
              <MatrixRain />

              <Canvas
                camera={{ position: [0, 0, 11.6], fov: 54 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
              >
                <AutoFitCamera />
                <Suspense fallback={null}>
                  <DotGlobe />
                </Suspense>
                <OrbitControls
                  enableZoom={false}
                  enablePan={false}
                  autoRotate={false}
                  minPolarAngle={Math.PI * 0.25}
                  maxPolarAngle={Math.PI * 0.75}
                />
              </Canvas>

              <div className={styles.canvasBtnGroup}>
                <button className={styles.surfaceBtn} onClick={handleSurface} aria-label="Open white surface workspace">
                  <Monitor size={12} className={styles.surfaceBtnIcon} />
                  Surface
                </button>
                <button className={`${styles.surfaceBtn} ${styles.earthSurfaceBtn}`} onClick={handleEarthSurface} aria-label="Open Earth Surface map">
                  <Globe2 size={12} className={styles.surfaceBtnIcon} />
                  Earth Surface
                </button>
              </div>

              <div className={styles.globeLabel}>
                <span className={styles.globeLabelDot} />
                <span>New Delhi · 28.6139°N</span>
              </div>
            </div>

            {/* ── Right panel ── */}
            <aside className={styles.rightPanel}>
              <div className={styles.panelInner}>

                {isLoggedIn ? (
                  /* ── Logged-in: public profile ── */
                  <>
                    <div className={styles.panelEyebrow} style={{ color: '#4da6ff' }}>
                      <Eye size={10} /> PUBLIC PROFILE · {handle}
                    </div>

                    <p className={styles.hubSub}>
                      Your profile as seen by other citizens on Earthsphere.
                    </p>

                    {/* Stats */}
                    <div className={styles.profileStats}>
                      <div className={styles.profileStat}>
                        <span className={styles.profileStatValue}>{activeVerifs.length}</span>
                        <span className={styles.profileStatLabel}>Verified</span>
                      </div>
                      <div className={styles.profileStatDiv} />
                      <div className={styles.profileStat}>
                        <span className={styles.profileStatValue}>{publicAssets.length}</span>
                        <span className={styles.profileStatLabel}>Assets</span>
                      </div>
                      <div className={styles.profileStatDiv} />
                      <div className={styles.profileStat}>
                        <span className={styles.profileStatValue}>{myNations.length}</span>
                        <span className={styles.profileStatLabel}>Nations</span>
                      </div>
                    </div>

                    {/* Nations */}
                    {myNations.length > 0 && (
                      <div className={styles.fieldBlock}>
                        <p className={styles.fieldLabel}>My Nations · {myNations.length}</p>
                        <div className={styles.nationsList}>
                          {myNations.map(n => (
                            <div key={n.id} className={styles.nationChip}>
                              <span>{n.flag}</span>
                              <span className={styles.nationChipName}>{n.name}</span>
                              {n.founder_hid === user?.hdi && (
                                <span className={styles.nationChipRole}>Founder</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Disclosure note */}
                    <div className={styles.disclosureNote}>
                      <Eye size={11} className={styles.discIcon} />
                      <div>
                        <p className={styles.discTitle}>
                          {Object.values(disclosure).filter(Boolean).length} fields public
                        </p>
                        <p className={styles.discSub}>Manage visibility in HDI settings</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.hubActions}>
                      <button className={styles.btnChat} onClick={handleAskJarvis}>
                        <MessageCircle size={13} />
                        Ask Jarvis AI
                      </button>
                      <button className={styles.btnVisit} onClick={() => setCurrentPage('world')}>
                        <Users size={12} />
                        World Nations
                      </button>
                    </div>

                    <button className={styles.btnHDIAlt} onClick={() => setCurrentPage('hdi')}>
                      <TrendingUp size={12} />
                      Open Full HDI Profile
                      <ArrowRight size={11} />
                    </button>

                    <div className={styles.hubStatus}>
                      <span className={styles.hubStatusDot} />
                      <span>ONLINE · EARTHSPHERE</span>
                    </div>
                  </>
                ) : (
                  /* ── Logged-out: Jarvis hub ── */
                  <>
                    <div className={styles.panelEyebrow} style={{ color: '#4da6ff' }}>
                      <span>🌐</span> KINGOFYADAV.IN · HUB
                    </div>

                    <p className={styles.hubSub}>
                      Your entry point to the digital world.
                      <br />
                      Navigate to any page directly from Earth.
                    </p>

                    <div className={styles.hubGrid}>
                      {HUB.map(l => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.hubCard}
                        >
                          <span className={styles.hubEmoji}>{l.emoji}</span>
                          <span className={styles.hubLabel}>{l.label}</span>
                          <span className={styles.hubSub2}>{l.sub}</span>
                        </a>
                      ))}
                    </div>

                    <div className={styles.hubActions}>
                      <button className={styles.btnChat} onClick={handleAskJarvis}>
                        <MessageCircle size={13} />
                        Ask Jarvis AI
                      </button>
                      <a
                        href="https://kingofyadav.in"
                        target="_blank" rel="noopener noreferrer"
                        className={styles.btnVisit}
                      >
                        Visit Profile <ExternalLink size={11} />
                      </a>
                    </div>

                    <div className={styles.hubStatus}>
                      <span className={styles.hubStatusDot} />
                      <span>{surface.online_status.toUpperCase()} · {location.home_zone}</span>
                    </div>
                  </>
                )}

              </div>
            </aside>

          </div>

          {/* ── Footer ── */}
          <footer className={styles.footer}>
            {isLoggedIn ? (
              <>
                <div className={styles.liveChip}>
                  <span className={styles.livePulse} />
                  HDI ACTIVE
                </div>
                <div className={styles.divider} />
                <div className={styles.stat}>
                  <span className={styles.statValue}>{trustScore}</span>
                  <span className={styles.statLabel}>TRUST SCORE</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{activeVerifs.length} / 6</span>
                  <span className={styles.statLabel}>VERIFIED</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{(user?.rpcBalance ?? 0).toLocaleString()}</span>
                  <span className={styles.statLabel}>RPC BALANCE</span>
                </div>
                <div className={styles.footerRight}>
                  <span>{handle} · Earthsphere</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.liveChip}>
                  <span className={styles.livePulse} />
                  MAINNET LIVE
                </div>
                <div className={styles.divider} />
                <div className={styles.stat}>
                  <span className={styles.statValue}>1,248</span>
                  <span className={styles.statLabel}>NODES ACTIVE</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>42.8M</span>
                  <span className={styles.statLabel}>TOTAL TXS</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>12,490,211</span>
                  <span className={styles.statLabel}>BLOCK HEIGHT</span>
                </div>
                <div className={styles.footerRight}>
                  <span>First User · {identity.handle} · {location.city}</span>
                </div>
              </>
            )}
          </footer>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
