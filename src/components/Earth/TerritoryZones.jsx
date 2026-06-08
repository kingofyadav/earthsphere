import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTerritoryStore } from '../../store/territoryStore'
import { useNationStore } from '../../store/nationStore'
import { useAuthStore } from '../../store/authStore'
import { useEarthStore } from '../../store/earthStore'
import { latLngToVec3 } from './geoUtils'

// cyan = personal zone  |  green = nation zone  |  gold = nation capital
const PALETTE = {
  personal: { dot: '#00e5ff', emissive: '#0090b8', glow: '#00e5ff' },
  nation:   { dot: '#00ff88', emissive: '#00cc66', glow: '#00ff88' },
  capital:  { dot: '#FFD700', emissive: '#FFA500', glow: '#FFD700' },
}

function ZonePin({ zone, radius, nationInfo }) {
  const dotRef  = useRef()
  const glowRef = useRef()

  const setCurrentPage         = useEarthStore(s => s.setCurrentPage)
  const setCurrentNationId     = useEarthStore(s => s.setCurrentNationId)
  const setNationFounderZoneId = useEarthStore(s => s.setNationFounderZoneId)
  const userHdi                = useAuthStore(s => s.user?.hdi)
  const appStage               = useEarthStore(s => s.appStage)

  const isCapital = nationInfo?.isCapital ?? false
  const hasNation = Boolean(nationInfo)
  const palette   = isCapital ? PALETTE.capital : hasNation ? PALETTE.nation : PALETTE.personal

  const pos  = useMemo(() => latLngToVec3(zone.lat, zone.lng, radius * 1.013), [zone.lat, zone.lng, radius])
  const dotR = radius * 0.09
  const glwR = radius * 0.18

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (glowRef.current) {
      const p = (t * 0.6 + zone.lat * 0.01) % 1
      glowRef.current.scale.setScalar(1 + p * 0.7)
      glowRef.current.material.opacity = 0.5 * (1 - p)
    }
    if (dotRef.current) {
      dotRef.current.material.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 2.8 + zone.lng * 0.05)
    }
  })

  function handleClick(e) {
    if (appStage !== 'explore') return
    e.stopPropagation()
    if (hasNation) {
      setCurrentNationId(nationInfo.nation.id)
      setCurrentPage('nation')
    } else if (userHdi === zone.owner_hid) {
      setNationFounderZoneId(zone.id)
    }
  }

  const canClick = hasNation || userHdi === zone.owner_hid

  return (
    <group position={pos}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[glwR, 8, 8]} />
        <meshBasicMaterial
          color={palette.glow}
          transparent opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh
        ref={dotRef}
        onClick={canClick ? handleClick : undefined}
        onPointerOver={canClick ? () => { document.body.style.cursor = 'pointer' } : undefined}
        onPointerOut={canClick  ? () => { document.body.style.cursor = 'auto'    } : undefined}
      >
        <sphereGeometry args={[dotR, 16, 16]} />
        <meshStandardMaterial
          color={palette.dot}
          emissive={palette.emissive}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      <pointLight color={palette.glow} intensity={0.35} distance={radius * 2} decay={2} />
    </group>
  )
}

export default function TerritoryZones({ radius = 1 }) {
  const zones   = useTerritoryStore(s => s.zones)
  const nations = useNationStore(s => s.nations)

  const zoneNationMap = useMemo(() => {
    const map = {}
    nations.forEach(n => {
      n.zones.forEach(zid => {
        map[zid] = { nation: n, isCapital: zid === n.capital_zone_id }
      })
    })
    return map
  }, [nations])

  return zones.map(zone => (
    <ZonePin
      key={zone.id}
      zone={zone}
      radius={radius}
      nationInfo={zoneNationMap[zone.id] ?? null}
    />
  ))
}
