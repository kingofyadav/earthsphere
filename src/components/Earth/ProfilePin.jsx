import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEarthStore } from '../../store/earthStore'
import { useTravelStore } from '../../store/travelStore'
import { JARVIS_DNA } from '../../data/jarvis.dna'
import { latLngToVec3 } from './geoUtils'

// radius — the Earth sphere's radius in the scene (1.0 for EarthScene, 0.115 for SolarSystem)
export default function ProfilePin({ radius = 1 }) {
  const openJarvis   = useEarthStore((s) => s.openJarvis)
  const isJarvisOpen = useEarthStore((s) => s.isJarvisOpen)
  const startTravel  = useTravelStore((s) => s.startTravel)
  const isTraveling  = useTravelStore((s) => s.isTraveling)
  const { lat, lng } = JARVIS_DNA.location

  // Pending flag: set when pin clicked, cleared when travel ends → then open card
  const pendingRef = useRef(false)

  useEffect(() => {
    if (!isTraveling && pendingRef.current) {
      pendingRef.current = false
      openJarvis()
    }
  }, [isTraveling, openJarvis])

  const pulse1Ref = useRef()
  const pulse2Ref = useRef()
  const dotRef    = useRef()

  const dotR   = radius * 0.11     // core dot
  const pulseR = radius * 0.21     // pulse sphere base

  const pos = useMemo(() => latLngToVec3(lat, lng, radius * 1.013), [lat, lng, radius])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (pulse1Ref.current) {
      const p = (t * 0.7) % 1
      pulse1Ref.current.scale.setScalar(1 + p * 0.9)
      pulse1Ref.current.material.opacity = 0.75 * (1 - p)
    }
    if (pulse2Ref.current) {
      const p = ((t * 0.7) + 0.5) % 1
      pulse2Ref.current.scale.setScalar(1 + p * 0.9)
      pulse2Ref.current.material.opacity = 0.75 * (1 - p)
    }
    if (dotRef.current) {
      dotRef.current.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 3.5)
    }
  })

  return (
    <group position={pos}>
      <mesh ref={pulse1Ref}>
        <sphereGeometry args={[pulseR, 8, 8]} />
        <meshBasicMaterial color="#FF9933" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={pulse2Ref}>
        <sphereGeometry args={[pulseR, 8, 8]} />
        <meshBasicMaterial color="#FF9933" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh
        ref={dotRef}
        onClick={(e) => {
          e.stopPropagation()
          if (isJarvisOpen) return
          pendingRef.current = true
          startTravel('Earth')
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[dotR, 16, 16]} />
        <meshStandardMaterial color="#FF9933" emissive="#FF6600" emissiveIntensity={0.8} roughness={0.2} metalness={0.0} />
      </mesh>

      <pointLight color="#FF9933" intensity={0.5} distance={radius * 2.5} decay={2} />
    </group>
  )
}
