import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useEarthStore } from '../../../store/earthStore'

export default function DevOverlayR3F() {
  const frameCount = useRef(0)
  const lastTime   = useRef(0)

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    if (!lastTime.current) lastTime.current = now
    if (now - lastTime.current >= 1000) {
      const count = frameCount.current
      frameCount.current = 0
      lastTime.current   = now
      // getState() avoids a Zustand subscription — this component never needs to re-render
      if (useEarthStore.getState().isDevMode) {
        useEarthStore.getState().setFps(count)
      }
    }
  })

  return null
}
