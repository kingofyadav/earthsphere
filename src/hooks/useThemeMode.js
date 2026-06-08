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
    if (themeMode === 'day') { setResolvedTheme('day'); return }
    if (themeMode === 'night') { setResolvedTheme('night'); return }

    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (systemPrefersDark) { setResolvedTheme('night'); return }

    setResolvedTheme(getTimeBasedTheme())
  }, [themeMode, setResolvedTheme])
}
