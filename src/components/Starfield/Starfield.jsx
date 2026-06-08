import { Stars } from '@react-three/drei'
import { useDeviceType } from '../../hooks/useDeviceType'
import { useEarthStore } from '../../store/earthStore'

export default function Starfield() {
  const device = useDeviceType()
  const isDevMode = useEarthStore((s) => s.isDevMode)

  const count = isDevMode ? 500 : device === 'mobile' ? 800 : device === 'tablet' ? 1500 : 3000

  return (
    <Stars
      radius={500}
      depth={0}
      count={count}
      factor={3}
      saturation={0}
      fade
      speed={0.1}
    />
  )
}
