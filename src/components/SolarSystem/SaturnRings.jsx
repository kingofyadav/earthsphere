import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

const INNER_R = 0.35
const OUTER_R = 0.82
const SEGMENTS = 128
const PHI_SEGS = 6   // radial subdivisions for smooth texture gradient

function buildRingGeometry(innerR, outerR, thetaSegs, phiSegs) {
  const geo = new THREE.RingGeometry(innerR, outerR, thetaSegs, phiSegs)

  // RingGeometry lies in the XY plane. Fix UVs so U = angle and V = radial distance.
  const pos = geo.attributes.position
  const uv  = geo.attributes.uv
  const v3  = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i)
    // atan2 in XY plane → normalize to [0, 1]
    const angle   = (Math.atan2(v3.y, v3.x) / (Math.PI * 2) + 1) % 1
    const radialT = (v3.length() - innerR) / (outerR - innerR)
    uv.setXY(i, angle, radialT)
  }
  uv.needsUpdate = true
  return geo
}

export default function SaturnRings() {
  const [ringTex] = useTexture(['/textures/planets/saturn_rings.png'])

  const geometry = useMemo(
    () => buildRingGeometry(INNER_R, OUTER_R, SEGMENTS, PHI_SEGS),
    []
  )

  // The texture is RGBA — alpha channel carries ring transparency naturally.
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          map={ringTex}
          transparent
          opacity={0.92}
          side={2}
          depthWrite={false}
          alphaTest={0.01}
        />
      </mesh>
    </group>
  )
}
