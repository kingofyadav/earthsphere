import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useEarthStore } from '../../store/earthStore'
import ProfilePin from './ProfilePin'
import TerritoryZones from './TerritoryZones'
import GlobeHoverRing from './GlobeHoverRing'
import { vec3ToLatLng } from './geoUtils'

const _localPt = new THREE.Vector3()

export default function Earth() {
  const groupRef       = useRef()
  const hoverPosRef    = useRef(new THREE.Vector3())
  const isHoveringRef  = useRef(false)

  const resolvedTheme  = useEarthStore((s) => s.resolvedTheme)
  const isDevMode      = useEarthStore((s) => s.isDevMode)
  const appStage       = useEarthStore((s) => s.appStage)
  const setClaimTarget = useEarthStore((s) => s.setClaimTarget)

  const canInteract = appStage === 'explore'

  function handlePointerMove(e) {
    if (!canInteract) return
    _localPt.copy(e.point)
    groupRef.current.worldToLocal(_localPt)
    hoverPosRef.current.copy(_localPt)
    isHoveringRef.current = true
  }

  function handlePointerLeave() {
    isHoveringRef.current = false
  }

  function handleGlobeClick(e) {
    if (!canInteract) return
    e.stopPropagation()
    _localPt.copy(e.point)
    groupRef.current.worldToLocal(_localPt)
    const { lat, lng } = vec3ToLatLng(_localPt)
    setClaimTarget({ lat, lng })
  }

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.0008
  })

  const [dayMap, nightMap, normalMap] = useTexture([
    '/textures/earth_day.jpg',
    '/textures/earth_night.jpg',
    '/textures/earth_normal.jpg',
  ])

  const meshProps = {
    onClick:        handleGlobeClick,
    onPointerMove:  handlePointerMove,
    onPointerLeave: handlePointerLeave,
    onPointerOver:  () => { document.body.style.cursor = canInteract ? 'crosshair' : 'auto' },
    onPointerOut:   () => { document.body.style.cursor = 'auto' },
  }

  if (isDevMode) {
    return (
      <group ref={groupRef}>
        <mesh {...meshProps}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial color="#00ff41" wireframe />
        </mesh>
        <ProfilePin />
        <TerritoryZones />
        <GlobeHoverRing hoverPosRef={hoverPosRef} isHoveringRef={isHoveringRef} />
      </group>
    )
  }

  const isDay = resolvedTheme === 'day'

  return (
    <group ref={groupRef}>
      <mesh {...meshProps}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={isDay ? dayMap : nightMap}
          normalMap={normalMap}
          roughness={isDay ? 0.8 : 1.0}
          metalness={isDay ? 0.1 : 0.0}
          dithering
        />
      </mesh>
      <ProfilePin />
      <TerritoryZones />
      <GlobeHoverRing hoverPosRef={hoverPosRef} isHoveringRef={isHoveringRef} />
    </group>
  )
}
