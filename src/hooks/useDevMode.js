import { useEffect } from 'react'
import { useEarthStore } from '../store/earthStore'

export function useDevMode() {
  const toggleDevMode = useEarthStore((s) => s.toggleDevMode)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('dev') === 'true') toggleDevMode()

    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleDevMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleDevMode])
}
