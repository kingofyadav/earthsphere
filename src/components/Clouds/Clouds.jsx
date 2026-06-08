import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useEarthStore } from '../../store/earthStore'

export default function Clouds() {
  const ref = useRef()
  const isDevMode = useEarthStore((s) => s.isDevMode)
  const cloudMap = useTexture('/textures/earth_clouds.jpg')

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0003
  })

  if (isDevMode) return null

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.015, 64, 64]} />
      <meshStandardMaterial
        map={cloudMap}
        transparent
        opacity={0.4}
        depthWrite={false}
        dithering
      />
    </mesh>
  )
}
