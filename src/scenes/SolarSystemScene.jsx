import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls, useProgress } from '@react-three/drei'
import { useEarthStore } from '../store/earthStore'
import { useTourStore } from '../store/tourStore'
import { useDeviceType } from '../hooks/useDeviceType'
import { PAGE, PLANET_PAGE_NAMES } from '../lib/pages'
import Starfield from '../components/Starfield'
import MilkyWay from '../components/SolarSystem/MilkyWay'
import DevOverlayR3F from '../components/UI/DevOverlay/DevOverlay'
import { Sun, OrbitPath, Planet, PLANETS } from '../components/SolarSystem'
import TravelController from '../components/SolarSystem/TravelController'
import AutoTourController from '../components/SolarSystem/AutoTourController'

const DEVICE_CONFIG = {
  desktop: { position: [0, 22, 14], fov: 52, scale: 1.00 },
  tablet:  { position: [0, 20, 12], fov: 56, scale: 0.80 },
  mobile:  { position: [0, 18, 10], fov: 64, scale: 0.50 },
}

function LoadWatcher() {
  const setLoaded = useEarthStore((s) => s.setLoaded)
  const triggered = useRef(false)

  useEffect(() => {
    const fire = () => {
      if (!triggered.current) { triggered.current = true; setTimeout(setLoaded, 400) }
    }
    // Subscribe outside render to avoid setState-during-render in React 19
    // when useTexture in child components synchronously updates the progress store
    if (useProgress.getState().progress >= 100) { fire(); return }
    const unsub = useProgress.subscribe(({ progress }) => { if (progress >= 100) fire() })
    const fallback = setTimeout(fire, 4000)
    return () => { unsub(); clearTimeout(fallback) }
  }, [setLoaded])

  return null
}

function SceneLighting() {
  const resolvedTheme = useEarthStore((s) => s.resolvedTheme)
  const isDay = resolvedTheme === 'day'
  return (
    <>
      {/*
        The Sun (Sun.jsx) already provides a pointLight intensity=3.5 that illuminates
        all planets. This ambient is ONLY a subtle tonal fill so dark sides aren't
        pitch-black — keep it very low so it doesn't compete with the Sun's point light
        and break the tone mapper's exposure.
      */}
      <ambientLight
        intensity={isDay ? 0.10 : 0.04}
        color={isDay ? '#c8dcff' : '#080818'}
      />
    </>
  )
}

// Sync camera position/fov when the device breakpoint changes, without tearing
// down the WebGL context. The three.js camera is a mutable external object and
// updateProjectionMatrix() commits the change — this is the sanctioned R3F
// escape hatch, so the immutability lint is suppressed for that one line.
function CameraSync({ device }) {
  const { camera, invalidate } = useThree()
  useEffect(() => {
    const cfg = DEVICE_CONFIG[device]
    camera.position.set(...cfg.position)
    // eslint-disable-next-line react-hooks/immutability -- three.js camera is externally mutable; see note above
    camera.fov = cfg.fov
    camera.updateProjectionMatrix()
    invalidate()
  }, [device, camera, invalidate])
  return null
}

// Pause auto-rotate when touring so camera is controlled by TravelController
function AutoRotateSync({ orbitControlsRef }) {
  const isTouring = useTourStore((s) => s.isTouring)
  useFrame(() => {
    if (!orbitControlsRef?.current) return
    const isDevMode = useEarthStore.getState().isDevMode
    orbitControlsRef.current.autoRotate = !isDevMode && !isTouring
  })
  return null
}

// Full-screen pages that completely occlude the scene canvas — no reason to keep
// rendering (and burning CPU/GPU + battery) behind them.
const COVERING_PAGES = new Set([
  PAGE.HDI, PAGE.WORLD, PAGE.NATION, PAGE.SURFACE, PAGE.EARTH_SURFACE, PAGE.EARTH_HERO,
  ...PLANET_PAGE_NAMES,
])

export default function SolarSystemScene() {
  const device          = useDeviceType()
  const isDevMode       = useEarthStore((s) => s.isDevMode)
  const currentPage     = useEarthStore((s) => s.currentPage)
  const appStage        = useEarthStore((s) => s.appStage)
  const { position, fov, scale } = DEVICE_CONFIG[device]
  const orbitControlsRef = useRef()

  const covered = appStage === 'genesis' || COVERING_PAGES.has(currentPage)

  return (
    <Canvas
      frameloop={covered ? 'never' : 'always'}
      camera={{ position, fov, near: 0.1, far: 10000 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
      }}
      dpr={[1, device === 'mobile' ? 1.5 : 2]}
      performance={{ min: 0.5 }}
      style={{ background: 'transparent' }}
    >
      <SceneLighting />
      {/* Galaxy background — far plane, always rendered */}
      <MilkyWay />

      {/* Solar system group — scales per device */}
      <group scale={scale}>
        <Suspense fallback={null}>
          <Sun />
        </Suspense>

        {PLANETS.map((p) => (
          <OrbitPath
            key={p.name + '-orbit'}
            radius={p.orbitRadius}
            color={isDevMode ? '#00ff41' : '#4466aa'}
            opacity={isDevMode ? 0.4 : 0.15}
          />
        ))}

        {PLANETS.map((p) => (
          <Suspense key={p.name} fallback={null}>
            <Planet data={p} />
          </Suspense>
        ))}
      </group>

      {/* Background stars */}
      <Starfield />

      <CameraSync device={device} />
      <LoadWatcher />
      <DevOverlayR3F />

      <AutoTourController />
      <TravelController orbitControlsRef={orbitControlsRef} scale={scale} />
      <AutoRotateSync orbitControlsRef={orbitControlsRef} />

      <OrbitControls
        ref={orbitControlsRef}
        enableZoom
        enablePan={false}
        autoRotate={!isDevMode}
        autoRotateSpeed={0.22}
        enableDamping
        dampingFactor={0.055}
        minDistance={0.5}
        maxDistance={device === 'mobile' ? 35 : 60}
        minPolarAngle={Math.PI * 0.04}
        maxPolarAngle={Math.PI * 0.88}
      />
    </Canvas>
  )
}
