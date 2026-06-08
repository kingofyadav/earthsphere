import { useState, useEffect } from 'react'

export function useDeviceType() {
  const [device, setDevice] = useState('desktop')

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setDevice(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return device
}
