import { useEffect } from 'react'
import { useEarthStore } from '../store/earthStore'

function getTimeBasedTheme() {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 18 ? 'day' : 'night'
}

export function useThemeMode() {
  const themeMode = useEarthStore((s) => s.themeMode)
  const setResolvedTheme = useEarthStore((s) => s.setResolvedTheme)

  useEffect(() => {
    function resolve() {
      if (themeMode === 'day')   { setResolvedTheme('day');   return }
      if (themeMode === 'night') { setResolvedTheme('night'); return }
      // Auto: system preference takes priority over clock
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setResolvedTheme('night'); return
      }
      setResolvedTheme(getTimeBasedTheme())
    }

    resolve()

    if (themeMode !== 'auto') return

    // Re-check on OS dark-mode toggle
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', resolve)

    // Re-check every minute so 6 am / 6 pm crossing works live
    const timer = setInterval(resolve, 60_000)

    // Re-check when the tab comes back to the foreground
    const onVisible = () => { if (!document.hidden) resolve() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      mq.removeEventListener('change', resolve)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [themeMode, setResolvedTheme])
}
