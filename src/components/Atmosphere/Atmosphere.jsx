import * as THREE from 'three'
import { useEarthStore } from '../../store/earthStore'

export default function Atmosphere() {
  const resolvedTheme = useEarthStore((s) => s.resolvedTheme)
  const isDevMode = useEarthStore((s) => s.isDevMode)

  if (isDevMode) return null

  const isDay = resolvedTheme === 'day'
  const color = isDay ? '#4da6ff' : '#1a1a3e'
  const opacity = isDay ? 0.15 : 0.12

  return (
    <mesh>
      <sphereGeometry args={[1.03, 128, 128]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.BackSide}
        depthWrite={false}
        dithering
      />
    </mesh>
  )
}
