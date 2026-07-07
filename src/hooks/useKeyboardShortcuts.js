import { useEffect } from 'react'
import { useEarthStore } from '../store/earthStore'
import { useAuthStore } from '../store/authStore'

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e) {
      if (e.key !== 'Escape') return
      const earth = useEarthStore.getState()
      const auth  = useAuthStore.getState()
      // Close in priority order: modals first, then pages
      if (auth.isLoginOpen)             { auth.closeLoginModal(); return }
      if (earth.claimTarget)            { earth.clearClaimTarget(); return }
      if (earth.nationFounderZoneId)    { earth.setNationFounderZoneId(null); return }
      if (earth.isJarvisOpen)           { earth.closeJarvis(); return }
      if (earth.currentPage !== null)   { earth.setCurrentPage(null); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
