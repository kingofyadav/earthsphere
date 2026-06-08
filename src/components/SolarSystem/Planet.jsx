import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useEarthStore } from '../../store/earthStore'
import { useTravelStore } from '../../store/travelStore'
import { useAuthStore } from '../../store/authStore'
import { registerPlanet, unregisterPlanet } from '../../travel/travelState'
import SaturnRings from './SaturnRings'
import { MOON } from './planetData'
import styles from './Planet.module.css'

// ── Shared orbit + hover + label shell ───────────────────────────────────────
function PlanetShell({ data, children }) {
  const orbitRef = useRef()
  const posRef   = useRef()
  const tiltRad  = ((data.tilt || 0) * Math.PI) / 180
  const [hovered, setHovered] = useState(false)
  const startTravel = useTravelStore((s) => s.startTravel)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const recordVisit = useAuthStore((s) => s.recordVisit)
  const openLoginModal = useAuthStore((s) => s.openLoginModal)

  useEffect(() => {
    registerPlanet(data.name, posRef)
    return () => unregisterPlanet(data.name)
  }, [data.name])

  const timeScale = useEarthStore((s) => s.timeScale)
  const setCurrentAngle = useEarthStore((s) => s.setCurrentAngle)
  const setAppStage = useEarthStore((s) => s.setAppStage)
  const setSceneBg = useEarthStore((s) => s.setSceneBg)
  const setCurrentPage = useEarthStore((s) => s.setCurrentPage)
  const targetPlanetName = useTravelStore((s) => s.targetPlanetName)

  function handlePlanetClick(e) {
    e.stopPropagation()
    setAppStage('explore')
    setSceneBg('off')
    setCurrentPage(null)
    startTravel(data.name)
    if (isLoggedIn) {
      recordVisit(data.name)
      if (data.name === 'Earth') setCurrentPage('earth-hero')
    } else {
      openLoginModal()
    }
  }

  useFrame(() => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += data.orbitSpeed * timeScale
      if (targetPlanetName === data.name) {
        const rad = orbitRef.current.rotation.y % (Math.PI * 2)
        const deg = (rad * 180) / Math.PI
        setCurrentAngle(deg < 0 ? deg + 360 : deg)
      }
    }
  })

  return (
    <group ref={orbitRef} rotation={[0, data.initialAngle || 0, 0]}>
      <group ref={posRef} position={[data.orbitRadius, 0, 0]}>
        <group 
          rotation={[0, 0, tiltRad]}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
          onClick={handlePlanetClick}
        >
          {children}
          {data.hasRings && <SaturnRings />}
        </group>

        {hovered && (
          <Html position={[0, data.radius + 0.25, 0]} center distanceFactor={9} zIndexRange={[50, 0]} occlude={false}>
            <div className={styles.label}>
              <span className={styles.labelName}>{data.name}</span>
              {data.role && <span className={styles.labelRole}>{data.role}</span>}
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}

// ── Moon orbiting Earth ───────────────────────────────────────────────────────
function MoonOrbit() {
  const orbitRef  = useRef()
  const meshRef   = useRef()
  const [hovered, setHovered] = useState(false)
  const timeScale      = useEarthStore(s => s.timeScale)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const isLoggedIn     = useAuthStore(s => s.isLoggedIn)
  const openLoginModal = useAuthStore(s => s.openLoginModal)
  const [moonMap] = useTexture([MOON.textureUrl])

  useFrame(() => {
    if (orbitRef.current) orbitRef.current.rotation.y += MOON.orbitSpeed * timeScale
    if (meshRef.current)  meshRef.current.rotation.y  += 0.002 * timeScale
  })

  function handleClick(e) {
    e.stopPropagation()
    if (isLoggedIn) { setCurrentPage('Moon') } else { openLoginModal() }
  }

  return (
    <group ref={orbitRef} rotation={[0, MOON.initialAngle, 0]}>
      <group position={[MOON.orbitRadius, 0, 0]}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={e => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer' }}
          onPointerOut={()  => {                      setHovered(false); document.body.style.cursor = 'default'  }}
        >
          <sphereGeometry args={[MOON.radius, ...MOON.segments]} />
          <meshStandardMaterial map={moonMap} roughness={0.9} metalness={0.0} />
        </mesh>

        {hovered && (
          <Html position={[0, MOON.radius + 0.04, 0]} center distanceFactor={9} zIndexRange={[50, 0]} occlude={false}>
            <div className={styles.label}>
              <span className={styles.labelName}>Moon</span>
              <span className={styles.labelRole}>{MOON.role}</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}

// ── Earth: day/night + clouds + atmosphere glow ──────────────────────────────
function EarthPlanetGroup({ data }) {
  const selfRef   = useRef()
  const cloudsRef = useRef()
  const isDevMode = useEarthStore((s) => s.isDevMode)
  const resolvedTheme = useEarthStore((s) => s.resolvedTheme)
  const timeScale = useEarthStore((s) => s.timeScale)

  const [dayMap, nightMap, normalMap, cloudsMap, specularMap] = useTexture([
    '/textures/earth_day.jpg',
    '/textures/earth_night.jpg',
    '/textures/earth_normal.png',
    '/textures/earth_clouds.jpg',
    '/textures/earth_specular.jpg',
  ])

  useEffect(() => {
    [dayMap, nightMap, normalMap, cloudsMap, specularMap].forEach(m => {
      if (m) { m.anisotropy = 16; m.needsUpdate = true }
    })
  }, [dayMap, nightMap, normalMap, cloudsMap, specularMap])

  useFrame(() => {
    if (selfRef.current)   selfRef.current.rotation.y   += 0.002 * timeScale
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00035 * timeScale
  })

  const isDay = resolvedTheme === 'day'
  const seg = data.segments ?? [128, 128]

  return (
    <PlanetShell data={data}>
      {/* Surface */}
      <mesh ref={selfRef}>
        <sphereGeometry args={[data.radius, ...seg]} />
        {isDevMode ? (
          <meshBasicMaterial color="#00ff41" wireframe />
        ) : (
          <meshStandardMaterial
            map={isDay ? dayMap : nightMap}
            normalMap={normalMap}
            normalScale={[0.85, 0.85]}
            specularMap={isDay ? specularMap : null}
            roughness={isDay ? 0.65 : 1.0}
            metalness={isDay ? 0.12 : 0.0}
            dithering
          />
        )}
      </mesh>

      {/* Cloud layer */}
      {!isDevMode && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[data.radius * 1.018, ...seg]} />
          <meshStandardMaterial map={cloudsMap} transparent opacity={0.36} depthWrite={false} dithering />
        </mesh>
      )}

      {/* Atmosphere glows */}
      {!isDevMode && (
        <>
          <mesh>
            <sphereGeometry args={[data.radius * 1.065, 128, 128]} />
            <meshBasicMaterial color="#4da6ff" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} dithering />
          </mesh>
          <mesh>
            <sphereGeometry args={[data.radius * 1.15, 128, 128]} />
            <meshBasicMaterial color="#2a7fff" transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} dithering />
          </mesh>
          <mesh>
            <sphereGeometry args={[data.radius * 1.25, 128, 128]} />
            <meshBasicMaterial color="#1a6fff" transparent opacity={0.03} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} dithering />
          </mesh>
        </>
      )}

      {/* Moon orbiting Earth */}
      {!isDevMode && <MoonOrbit />}
    </PlanetShell>
  )
}

// ── Standard planet ───────────────────────────────────────────────────────────
function StandardMesh({ data }) {
  const selfRef  = useRef()
  const isDevMode = useEarthStore((s) => s.isDevMode)
  const timeScale = useEarthStore((s) => s.timeScale)
  const isGasGiant = data.name === 'Jupiter' || data.name === 'Saturn'
  const [map] = useTexture([data.textureUrl])

  useFrame(() => {
    if (selfRef.current) selfRef.current.rotation.y += (isGasGiant ? 0.005 : 0.002) * timeScale
  })

  const seg = data.segments ?? [96, 96]

  return (
    <PlanetShell data={data}>
      <mesh ref={selfRef}>
        <sphereGeometry args={[data.radius, ...seg]} />
        {isDevMode ? (
          <meshBasicMaterial color="#00ff41" wireframe />
        ) : (
          <meshStandardMaterial map={map} roughness={0.85} metalness={0.04} dithering />
        )}
      </mesh>
      
      {!isDevMode && (
        <mesh>
          <sphereGeometry args={[data.radius * 1.012, 128, 128]} />
          <meshBasicMaterial color={data.color || "#ffffff"} transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} dithering />
        </mesh>
      )}
    </PlanetShell>
  )
}

export default function Planet({ data }) {
  return data.isEarth ? <EarthPlanetGroup data={data} /> : <StandardMesh data={data} />
}
