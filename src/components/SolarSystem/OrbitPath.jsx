import { useMemo } from 'react'
import * as THREE from 'three'

export default function OrbitPath({ radius, opacity = 0.08, color = '#224488' }) {
  const geometry = useMemo(() => {
    const SEGMENTS = 128
    const positions = new Float32Array(SEGMENTS * 3)
    for (let i = 0; i < SEGMENTS; i++) {
      const a = (i / SEGMENTS) * Math.PI * 2
      positions[i * 3]     = Math.cos(a) * radius
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = Math.sin(a) * radius
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [radius])

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineLoop>
  )
}
