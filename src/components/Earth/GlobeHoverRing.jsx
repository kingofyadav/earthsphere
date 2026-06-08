import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const _normal  = new THREE.Vector3()
const _zAxis   = new THREE.Vector3(0, 0, 1)
const _q       = new THREE.Quaternion()

export default function GlobeHoverRing({ hoverPosRef, isHoveringRef, radius = 1 }) {
  const groupRef  = useRef()
  const opRef     = useRef(0)
  const innerRef  = useRef()
  const outerRef  = useRef()

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetOp = isHoveringRef.current ? 1 : 0
    opRef.current += (targetOp - opRef.current) * Math.min(1, delta * 12)
    const op = opRef.current

    if (innerRef.current) innerRef.current.material.opacity = op * 0.85
    if (outerRef.current) outerRef.current.material.opacity = op * 0.45

    if (op < 0.01) return

    _normal.copy(hoverPosRef.current).normalize()
    groupRef.current.position.copy(_normal).multiplyScalar(radius * 1.006)
    _q.setFromUnitVectors(_zAxis, _normal)
    groupRef.current.quaternion.copy(_q)
  })

  const r1 = radius * 0.055
  const r2 = radius * 0.075
  const r3 = radius * 0.095

  return (
    <group ref={groupRef}>
      <mesh ref={innerRef}>
        <ringGeometry args={[r1, r2, 40]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={outerRef}>
        <ringGeometry args={[r2 * 1.08, r3, 40]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
