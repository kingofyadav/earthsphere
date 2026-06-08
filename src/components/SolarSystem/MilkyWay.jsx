import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { registerPlanet, unregisterPlanet } from '../../travel/travelState'

const STAR_COUNT = 8000

function createRandom(seed = 42) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function buildStars() {
  const random = createRandom(20260601)
  const positions = new Float32Array(STAR_COUNT * 3)
  const colors    = new Float32Array(STAR_COUNT * 3)
  const sizes     = new Float32Array(STAR_COUNT)

  for (let i = 0; i < STAR_COUNT; i++) {
    const inBulge = random() < 0.18
    let x, y, z

    if (inBulge) {
      const r = random() * 18
      const a = random() * Math.PI * 2
      const b = random() * Math.PI * 2
      x = r * Math.sin(a) * Math.cos(b)
      y = r * Math.sin(a) * Math.sin(b) * 0.25
      z = r * Math.cos(a)
    } else {
      const arm    = Math.floor(random() * 2)
      const dist   = 12 + random() * 110
      const angle  = (arm / 2) * Math.PI * 2 + dist * 0.022 + (random() - 0.5) * 0.9
      const spread = dist * 0.10
      x = Math.cos(angle) * dist + (random() - 0.5) * spread
      y = (random() - 0.5) * 0.5
      z = Math.sin(angle) * dist + (random() - 0.5) * spread
    }

    positions[i * 3]     = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    const t = random()
    if (t < 0.25) {
      colors[i * 3] = 0.65; colors[i * 3 + 1] = 0.78; colors[i * 3 + 2] = 1.0
    } else if (t < 0.65) {
      colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.92
    } else {
      colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 0.62
    }

    sizes[i] = inBulge ? 0.18 + random() * 0.28 : 0.08 + random() * 0.18
  }

  return { positions, colors, sizes }
}

const STAR_DATA = buildStars()

export default function MilkyWay() {
  const groupRef = useRef()

  // Register so it can be visited in the tour
  useEffect(() => {
    registerPlanet('Milky Way', groupRef)
    return () => unregisterPlanet('Milky Way')
  }, [])

  const { positions, colors, sizes } = STAR_DATA

  return (
    <group ref={groupRef}>
      <points rotation={[0.35, 0.4, 0.12]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={STAR_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-color"    array={colors}    count={STAR_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-size"     array={sizes}     count={STAR_COUNT} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          vertexColors
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={`
            attribute float size;
            varying vec3 vColor;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              // Circular stars with distance-based sizing — capped at 64px to prevent giant artifacts
              gl_PointSize = min(size * (400.0 / -mvPosition.z), 64.0);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vColor;
            void main() {
              float d = distance(gl_PointCoord, vec2(0.5));
              if (d > 0.5) discard;
              // Soft radial falloff for natural star look
              float glow = pow(1.0 - d * 2.0, 3.0);
              gl_FragColor = vec4(vColor, glow * 0.45);
            }
          `}
        />
      </points>
    </group>
  )
}
