import { useMemo, useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Mic, ArrowRight, ArrowLeft, Monitor, Globe2, Globe,
  Shield, MessageCircle, Users, MapPin,
  Wallet, FileText, FolderOpen, LayoutDashboard, Hash, ExternalLink,
} from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { useAuthStore } from '../../../store/authStore'
import { initAudio, playSfx } from '../../../lib/audio'
import { classify, prettyHost, webSearchUrl, openDeviceFile } from '../../../lib/magicSearch'
import { PAGE } from '../../../lib/pages'
import styles from './EarthHero.module.css'

function openExt(url) { window.open(url, '_blank', 'noopener,noreferrer') }

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
  const { curves, lineObjects, mat } = useMemo(() => {
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
    return { curves, lineObjects, mat }
  }, [R])

  useEffect(() => () => {
    lineObjects.forEach(l => l.geometry.dispose())
    mat.dispose()
  }, [lineObjects, mat])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    pulseRefs.current.forEach((mesh, i) => {
      if (!mesh || !curves[i]) return
      const speed  = 0.09 + (i % 7) * 0.007
      mesh.position.copy(curves[i].getPoint((t * speed + i / LINKS.length) % 1))
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
      m.material.opacity = 0.12 + s * (i === CITIES.length - 1 ? 0.5 : 0.14)
    })
  })
  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh>
            <sphereGeometry args={[i === CITIES.length - 1 ? 0.038 : 0.022, 8, 8]} />
            <meshBasicMaterial color={i === CITIES.length - 1 ? '#FF9933' : '#7dd3fc'}
              transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh ref={el => { nodeRefs.current[i] = el }}>
            <sphereGeometry args={[i === CITIES.length - 1 ? 0.08 : 0.05, 8, 8]} />
            <meshBasicMaterial color={i === CITIES.length - 1 ? '#FF9933' : '#4da6ff'}
              transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const SPHERE_R = 2.8

function AutoFitCamera() {
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    if (!camera.isPerspectiveCamera) return
    const fovRad = (camera.fov * Math.PI) / 180
    const aspect = size.width / size.height
    const fill   = aspect >= 0.7 ? 0.52 : 0.42
    const dim    = aspect >= 0.7 ? 1 : aspect
    const dist   = (SPHERE_R * 2) / (fill * dim * 2 * Math.tan(fovRad / 2))
    camera.position.z = Math.max(8.0, Math.min(17.0, dist))
    invalidate()
  }, [size.width, size.height, camera, invalidate])
  return null
}

// ── Left: Virtual dot-globe ───────────────────────────────────────────────────
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
        <sphereGeometry args={[2.8, 128, 64]} />
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

// ── Right: Real textured Earth ────────────────────────────────────────────────
function RealEarth() {
  const earthRef  = useRef()
  const cloudsRef = useRef()
  const [dayMap, cloudsMap, normalMap] = useTexture([
    '/textures/earth_day.jpg',
    '/textures/earth_clouds.jpg',
    '/textures/earth_normal.png',
  ])
  useEffect(() => {
    [dayMap, cloudsMap, normalMap].forEach(m => { if (m) { m.anisotropy = 16; m.needsUpdate = true } })
  }, [dayMap, cloudsMap, normalMap])

  useFrame(() => {
    if (earthRef.current)  earthRef.current.rotation.y  += 0.0011
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00045
  })

  return (
    <group rotation={[0.3, 0, 0]}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2.8, 128, 128]} />
        <meshStandardMaterial
          map={dayMap} normalMap={normalMap} normalScale={[0.7, 0.7]}
          roughness={0.85} metalness={0.0} dithering
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.85, 128, 128]} />
        <meshStandardMaterial map={cloudsMap} transparent opacity={0.42} depthWrite={false} dithering />
      </mesh>
      {/* atmosphere */}
      <mesh>
        <sphereGeometry args={[2.98, 64, 64]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.2, 64, 64]} />
        <meshBasicMaterial color="#2a7fff" transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

// ── Voice-to-text (Web Speech API) ────────────────────────────────────────────
function useVoiceInput(onText) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const supported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('')
      onText(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    return () => { try { rec.abort() } catch { /* noop */ } }
  }, [supported, onText])

  function toggle() {
    if (!supported || !recRef.current) return
    if (listening) { recRef.current.stop(); setListening(false); return }
    try { recRef.current.start(); setListening(true) } catch { /* already started */ }
  }

  return { supported: Boolean(supported), listening, toggle }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EarthHero() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const openJarvisChat = useEarthStore(s => s.openJarvisChat)
  const authAssets     = useAuthStore(s => s.assets)

  const [query, setQuery] = useState('')
  const voice = useVoiceInput(setQuery)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const goJarvis = () => { setCurrentPage(null); openJarvisChat() }

  // Apps: in-app pages + external web apps
  const APPS = useMemo(() => [
    { id: 'hdi',     label: 'HDI Profile',       desc: 'Your sovereign identity', Icon: Shield,        keys: 'hdi identity profile trust passport', run: () => setCurrentPage(PAGE.HDI) },
    { id: 'world',   label: 'World Nations',     desc: 'Community & nations',      Icon: Users,         keys: 'world nations community citizens', run: () => setCurrentPage(PAGE.WORLD) },
    { id: 'surface', label: 'Surface Workspace', desc: 'White workspace',          Icon: Monitor,       keys: 'surface workspace white apps build', run: () => setCurrentPage(PAGE.SURFACE) },
    { id: 'earth',   label: 'Earth Surface Map', desc: 'Claim territory zones',    Icon: Globe2,        keys: 'earth surface map territory claim zone', run: () => setCurrentPage(PAGE.EARTH_SURFACE) },
    { id: 'jarvis',  label: 'Ask Jarvis AI',     desc: 'Talk to your agent',       Icon: MessageCircle, keys: 'jarvis ai chat assistant ask', run: goJarvis },
    { id: 'chat',    label: 'Chat Terminal',     desc: 'chat.zerosoils.com',       Icon: MessageCircle, keys: 'chat terminal message app', run: () => openExt('https://chat.zerosoils.com') },
    { id: 'wallet',  label: 'Wallet',            desc: 'kingofyadav.in/wallet',    Icon: Wallet,        keys: 'wallet coin money assets rupeecoin', run: () => openExt('https://kingofyadav.in/wallet/') },
    { id: 'site',    label: 'Profile Site',      desc: 'kingofyadav.in',           Icon: ExternalLink,  keys: 'profile website portfolio blog', run: () => openExt('https://kingofyadav.in') },
  ], [setCurrentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Files: the user's HDI assets, searchable
  const FILES = useMemo(() => {
    const out = []
    ;(authAssets?.documents   || []).forEach(d => out.push({ id: 'f-doc-'  + d.id, label: d.title || d.name || 'Document', desc: 'Document',   Icon: FileText, run: () => setCurrentPage(PAGE.HDI) }))
    ;(authAssets?.credentials || []).forEach(c => out.push({ id: 'f-cred-' + c.id, label: c.name || 'Credential',         desc: 'Credential', Icon: Shield,   run: () => setCurrentPage(PAGE.HDI) }))
    ;(authAssets?.domains     || []).forEach(d => out.push({ id: 'f-dom-'  + d.id, label: d.name,                          desc: 'Domain',     Icon: Globe,    run: () => d.name && openExt('https://' + d.name.replace(/^https?:\/\//, '')) }))
    ;(authAssets?.wallets     || []).forEach(w => out.push({ id: 'f-wal-'  + w.id, label: w.label || w.address,            desc: 'Wallet',     Icon: Wallet,   run: () => setCurrentPage(PAGE.HDI) }))
    return out
  }, [authAssets, setCurrentPage])

  // Dot commands — config-like shortcuts (type "." to list them all)
  const DOT = useMemo(() => [
    { name: 'profile',   label: 'Profile',       desc: 'Open HDI identity',       Icon: Shield,          run: () => setCurrentPage(PAGE.HDI) },
    { name: 'dashboard', label: 'Dashboard',     desc: 'Solar system overview',   Icon: LayoutDashboard, run: () => setCurrentPage(null) },
    { name: 'world',     label: 'World',         desc: 'Nations & community',     Icon: Users,           run: () => setCurrentPage(PAGE.WORLD) },
    { name: 'surface',   label: 'Surface',       desc: 'White workspace',         Icon: Monitor,         run: () => setCurrentPage(PAGE.SURFACE) },
    { name: 'earth',     label: 'Earth Surface', desc: 'Territory map',           Icon: Globe2,          run: () => setCurrentPage(PAGE.EARTH_SURFACE) },
    { name: 'claim',     label: 'Claim',         desc: 'Claim territory',         Icon: MapPin,          run: () => setCurrentPage(PAGE.EARTH_SURFACE) },
    { name: 'wallet',    label: 'Wallet',        desc: 'Open your wallet',        Icon: Wallet,          run: () => openExt('https://kingofyadav.in/wallet/') },
    { name: 'jarvis',    label: 'Jarvis',        desc: 'Ask the AI agent',        Icon: MessageCircle,   run: goJarvis },
    { name: 'file',      label: 'File',          desc: 'Open a file from device', Icon: FolderOpen,      run: () => openDeviceFile(fileInputRef.current) },
    { name: 'web',       label: 'Web',           desc: 'Search the internet',     Icon: Globe,           run: () => openExt('https://duckduckgo.com') },
    { name: 'help',      label: 'Help',          desc: 'List all . commands',     Icon: Hash,            run: () => setQuery('.') },
  ], [setCurrentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const c = classify(query)
    if (c.mode === 'dot') {
      return DOT
        .filter(d => !c.term || d.name.startsWith(c.term) || d.label.toLowerCase().includes(c.term))
        .map(d => ({ id: 'dot-' + d.name, label: d.label, desc: d.desc, Icon: d.Icon, badge: '.' + d.name, run: d.run }))
    }
    if (c.mode === 'url') {
      return [{ id: 'url', label: `Open ${prettyHost(c.url)}`, desc: c.url, Icon: Globe, badge: 'WEB', run: () => openExt(c.url) }]
    }
    if (c.mode === 'search') {
      const local = [...APPS, ...FILES].filter(x =>
        (x.label + ' ' + (x.keys || '') + ' ' + (x.desc || '')).toLowerCase().includes(c.term)
      )
      const web = { id: 'web', label: `Search the web for “${c.raw}”`, desc: 'DuckDuckGo', Icon: Search, badge: 'WEB', run: () => openExt(webSearchUrl(c.raw)) }
      return [...local, web]
    }
    return APPS // browse
  }, [query, APPS, FILES, DOT])

  function runResult(cmd) {
    if (!cmd) return
    initAudio(); playSfx('click')
    cmd.run()
  }

  function handleSubmit(e) {
    e.preventDefault()
    runResult(results[0])
  }

  function handleMic() {
    initAudio()
    inputRef.current?.focus()
    voice.toggle()
  }

  return (
    <AnimatePresence>
      {currentPage === PAGE.EARTH_HERO && (
        <motion.div
          key="earth-hero"
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button className={styles.backBtn} onClick={() => setCurrentPage(null)} aria-label="Back to Solar System">
            <ArrowLeft size={13} /><span>Solar System</span>
          </button>

          {/* ── Three sections: Virtual · Search · Real ── */}
          <div className={styles.sections}>

            {/* Left — Virtual World */}
            <section className={`${styles.section} ${styles.virtualSection}`}>
              <div className={styles.sectionCanvas}>
                <Canvas camera={{ position: [0, 0, 11.6], fov: 54 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
                  <AutoFitCamera />
                  <Suspense fallback={null}><DotGlobe /></Suspense>
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} minPolarAngle={Math.PI * 0.25} maxPolarAngle={Math.PI * 0.75} />
                </Canvas>
              </div>
              <div className={styles.sectionTag}>
                <span className={styles.tagDot} style={{ background: '#4da6ff' }} />
                VIRTUAL WORLD
              </div>
            </section>

            {/* Middle — Clean search (mobile-first) */}
            <section className={`${styles.section} ${styles.searchSection}`}>
              <div className={styles.searchInner}>
                <h1 className={styles.searchTitle}>Magic Search</h1>

                <form className={styles.searchBox} onSubmit={handleSubmit}>
                  <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                  <input
                    ref={inputRef}
                    className={styles.searchInput}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search or type . for commands…"
                    aria-label="Magic search"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {voice.supported && (
                    <button
                      type="button"
                      className={`${styles.micBtn} ${voice.listening ? styles.micListening : ''}`}
                      onClick={handleMic}
                      aria-label={voice.listening ? 'Stop listening' : 'Speak'}
                      aria-pressed={voice.listening}
                    >
                      <Mic size={15} />
                    </button>
                  )}
                </form>

                {voice.listening && <p className={styles.listeningHint}>Listening…</p>}

                {/* Hints + results appear only once the user starts typing */}
                {query.trim() && (
                  <>
                    <ul className={styles.results}>
                      {results.map(cmd => (
                        <li key={cmd.id}>
                          <button className={styles.resultBtn} onClick={() => runResult(cmd)}>
                            <span className={styles.resultIcon}><cmd.Icon size={15} /></span>
                            <span className={styles.resultText}>
                              <span className={styles.resultLabel}>{cmd.label}</span>
                              <span className={styles.resultDesc}>{cmd.desc}</span>
                            </span>
                            {cmd.badge
                              ? <span className={styles.resultBadge}>{cmd.badge}</span>
                              : <ArrowRight size={13} className={styles.resultArrow} />}
                          </button>
                        </li>
                      ))}
                      {results.length === 0 && (
                        <li className={styles.noResult}>No match for “{query}”.</li>
                      )}
                    </ul>
                    <p className={styles.searchHint}>URL opens the site · keywords search web · <code>.</code> lists commands</p>
                  </>
                )}

                <input ref={fileInputRef} type="file" hidden aria-hidden="true" tabIndex={-1} onChange={() => {}} />
              </div>
            </section>

            {/* Right — Real live Earth */}
            <section className={`${styles.section} ${styles.realSection}`}>
              <div className={styles.sectionCanvas}>
                <Canvas camera={{ position: [0, 0, 11.6], fov: 54 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
                  <AutoFitCamera />
                  <ambientLight intensity={0.9} />
                  <hemisphereLight args={['#bcd8ff', '#0a1420', 0.55]} />
                  <directionalLight position={[3, 2, 6]} intensity={1.9} color="#fff6e8" />
                  <Suspense fallback={null}><RealEarth /></Suspense>
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.35} minPolarAngle={Math.PI * 0.25} maxPolarAngle={Math.PI * 0.75} />
                </Canvas>
              </div>
              <div className={styles.sectionTag}>
                <span className={styles.tagDot} style={{ background: '#22c55e' }} />
                REAL LIVE EARTH
              </div>
            </section>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
