import { useMemo, useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { PAGE } from '../../../lib/pages'
import MagicSearch from './MagicSearch'
import styles from './EarthHero.module.css'

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

// Pull the camera back so the globe stays framed as the canvas resizes. The
// three.js camera is a mutable external object (standard R3F escape hatch), so
// the immutability lint is suppressed for that one assignment.
function AutoFitCamera() {
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    if (!camera.isPerspectiveCamera) return
    const fovRad = (camera.fov * Math.PI) / 180
    const aspect = size.width / size.height
    const fill   = aspect >= 0.7 ? 0.52 : 0.42
    const dim    = aspect >= 0.7 ? 1 : aspect
    const dist   = (SPHERE_R * 2) / (fill * dim * 2 * Math.tan(fovRad / 2))
    // eslint-disable-next-line react-hooks/immutability -- three.js camera is externally mutable
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

// ── Main component ────────────────────────────────────────────────────────────
export default function EarthHero() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)

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

            {/* Middle — Magic Search command palette */}
            <section className={`${styles.section} ${styles.searchSection}`}>
              <MagicSearch />
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
