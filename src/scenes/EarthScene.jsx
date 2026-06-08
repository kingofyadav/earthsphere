import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEarthStore } from '../store/earthStore'
import { useDeviceType } from '../hooks/useDeviceType'
import Earth from '../components/Earth'
import Clouds from '../components/Clouds'
import Atmosphere from '../components/Atmosphere'
import Starfield from '../components/Starfield'
import DevOverlayR3F from '../components/UI/DevOverlay/DevOverlay'

const CAMERA_BY_DEVICE = {
  desktop: { fov: 45, z: 2.5 },
  tablet:  { fov: 55, z: 2.8 },
  mobile:  { fov: 65, z: 3.2 },
}

function FallbackSphere() {
  const ref = useRef()
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.005 })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#1a2a5a" />
    </mesh>
  )
}

function LoadTrigger() {
  const setLoaded = useEarthStore((s) => s.setLoaded)
  const triggered = useRef(false)

  useFrame(() => {
    if (!triggered.current) {
      triggered.current = true
      setLoaded()
    }
  })

  return null
}

function TexturedGroup() {
  return (
    <Suspense fallback={<FallbackSphere />}>
      <Earth />
      <Clouds />
      <Atmosphere />
      <LoadTrigger />
    </Suspense>
  )
}

function Lighting() {
  const resolvedTheme = useEarthStore((s) => s.resolvedTheme)
  const isDay = resolvedTheme === 'day'

  return (
    <>
      <ambientLight intensity={isDay ? 0.15 : 0.05} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={isDay ? 1.2 : 0.3}
        color={isDay ? '#ffffff' : '#4060ff'}
      />
      {!isDay && (
        <pointLight position={[-3, 0, -3]} intensity={0.2} color="#ff8844" />
      )}
    </>
  )
}

export default function EarthScene() {
  const device = useDeviceType()
  const isDevMode = useEarthStore((s) => s.isDevMode)
  const { fov, z } = CAMERA_BY_DEVICE[device]

  return (
    <Canvas
      camera={{ position: [0, 0, z], fov, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
      }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
      style={{ background: 'transparent' }}
    >
      <Lighting />
      <Starfield />
      <TexturedGroup />
      <DevOverlayR3F />
      <OrbitControls
        enableZoom={false}
        autoRotate={!isDevMode}
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
      />
    </Canvas>
  )
}
