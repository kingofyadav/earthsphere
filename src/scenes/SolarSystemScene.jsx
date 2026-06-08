import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls, useProgress } from '@react-three/drei'
import { useEarthStore } from '../store/earthStore'
import { useTourStore } from '../store/tourStore'
import { useDeviceType } from '../hooks/useDeviceType'
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
  const { progress } = useProgress()
  const setLoaded    = useEarthStore((s) => s.setLoaded)
  const triggered    = useRef(false)
  const fire         = useRef(() => {
    if (!triggered.current) { triggered.current = true; setTimeout(setLoaded, 400) }
  })
  useEffect(() => { if (progress >= 100) fire.current() }, [progress])
  useEffect(() => { const t = setTimeout(fire.current, 8000); return () => clearTimeout(t) }, [])
  return null
}

function SceneLighting() {
  const resolvedTheme = useEarthStore((s) => s.resolvedTheme)
  const isDay = resolvedTheme === 'day'
  return (
    <>
      <ambientLight intensity={isDay ? 0.35 : 0.08} color={isDay ? '#e8f0ff' : '#080818'} />
      {/* Subtle fill light to ensure planets aren't silhouettes from certain angles */}
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={isDay ? 0.4 : 0.1} 
        color={isDay ? '#ffffff' : '#4466ff'} 
      />
    </>
  )
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

export default function SolarSystemScene() {
  const device          = useDeviceType()
  const isDevMode       = useEarthStore((s) => s.isDevMode)
  const { position, fov, scale } = DEVICE_CONFIG[device]
  const orbitControlsRef = useRef()

  return (
    <Canvas
      key={device}
      camera={{ position, fov, near: 0.1, far: 10000 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
      }}
      dpr={[1, device === 'mobile' ? 1.5 : 2.5]}
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
