import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, Html } from '@react-three/drei'
import * as THREE from 'three'
import { SUN_RADIUS } from './planetData'
import { registerPlanet, unregisterPlanet } from '../../travel/travelState'
import { useTourStore } from '../../store/tourStore'
import { useEarthStore } from '../../store/earthStore'
import styles from './Planet.module.css'

export default function Sun() {
  const groupRef = useRef()
  const coreRef  = useRef()
  const c1Ref    = useRef()
  const c2Ref    = useRef()
  const c3Ref    = useRef()
  const [sunMap] = useTexture(['/textures/planets/sun.jpg'])
  const startTour = useTourStore((s) => s.startTour)
  const timeScale = useEarthStore((s) => s.timeScale)
  const [hovered, setHovered] = useState(false)

  // Register so TravelController + AutoTour can fly to the Sun
  useEffect(() => {
    registerPlanet('Sun', groupRef)
    return () => unregisterPlanet('Sun')
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (coreRef.current) coreRef.current.rotation.y += 0.0006 * timeScale

    // Breathing corona layers — each at different frequency
    if (c1Ref.current) c1Ref.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.022)
    if (c2Ref.current) c2Ref.current.scale.setScalar(1 + Math.sin(t * 0.7 + 1.3) * 0.038)
    if (c3Ref.current) c3Ref.current.scale.setScalar(1 + Math.sin(t * 0.4 + 2.8) * 0.055)
  })

  return (
    <group ref={groupRef}>
      {/* Scene key light */}
      <pointLight intensity={3.5} distance={100} decay={1.2} color="#fff6d0" />
      {/* Soft fill to avoid pitch-black sides */}
      <pointLight intensity={0.4}  distance={60}  decay={2}   color="#ff9900" />

      {/* Sun core — 128 segments for ultra-smooth silhouette */}
      <mesh 
        ref={coreRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
        onClick={(e) => { e.stopPropagation(); startTour() }}
      >
        <sphereGeometry args={[SUN_RADIUS, 128, 128]} />
        <meshBasicMaterial map={sunMap} color="#fffbe8" />
      </mesh>

      {hovered && (
        <Html position={[0, SUN_RADIUS + 0.3, 0]} center distanceFactor={9} zIndexRange={[50, 0]} occlude={false}>
          <div className={styles.label}>The Sun - Start Tour</div>
        </Html>
      )}

      {/* Corona 1 — tight, warm orange */}
      <mesh ref={c1Ref}>
        <sphereGeometry args={[SUN_RADIUS * 1.22, 128, 128]} />
        <meshBasicMaterial 
          color="#ff7700" 
          transparent 
          opacity={0.10} 
          side={THREE.BackSide} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          dithering 
        />
      </mesh>

      {/* Corona 2 — mid, cooler */}
      <mesh ref={c2Ref}>
        <sphereGeometry args={[SUN_RADIUS * 1.58, 128, 128]} />
        <meshBasicMaterial 
          color="#ff5500" 
          transparent 
          opacity={0.055} 
          side={THREE.BackSide} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          dithering 
        />
      </mesh>

      {/* Corona 3 — wide, very faint halo */}
      <mesh ref={c3Ref}>
        <sphereGeometry args={[SUN_RADIUS * 2.20, 128, 128]} />
        <meshBasicMaterial 
          color="#ff3300" 
          transparent 
          opacity={0.022} 
          side={THREE.BackSide} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          dithering 
        />
      </mesh>

      {/* Corona 4 — extra wide ultra-faint glow */}
      <mesh>
        <sphereGeometry args={[SUN_RADIUS * 3.80, 128, 128]} />
        <meshBasicMaterial 
          color="#ff1100" 
          transparent 
          opacity={0.005} 
          side={THREE.BackSide} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          dithering 
        />
      </mesh>

      {/* Ambient warmth diffusion */}
      <mesh>
        <sphereGeometry args={[SUN_RADIUS * 5.5, 128, 128]} />
        <meshBasicMaterial 
          color="#ff6600" 
          transparent 
          opacity={0.004} 
          side={THREE.BackSide} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          dithering 
        />
      </mesh>
    </group>
  )
}
