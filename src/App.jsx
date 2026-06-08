import { lazy, Suspense, useEffect } from 'react'
import { useThemeMode } from './hooks/useThemeMode'
import { useDevMode } from './hooks/useDevMode'
import Header from './components/UI/Header/Header'
import LoadingScreen from './components/UI/LoadingScreen/LoadingScreen'
import DevOverlayHUD from './components/UI/DevOverlay/DevOverlayHUD'
import TravelHUD from './components/UI/TravelHUD/TravelHUD'
import AuthModal from './components/UI/AuthModal/AuthModal'
import HeroOverlay from './components/UI/HeroOverlay/HeroOverlay'
import HeroStats from './components/UI/HeroStats/HeroStats'
import TourHUD from './components/UI/TourHUD/TourHUD'
import HDIPage from './components/UI/HDIPage/HDIPage'
import GenesisScreen from './components/UI/GenesisScreen/GenesisScreen'
import EarthHero from './components/UI/EarthHero/EarthHero'
import PlanetPage, { PLANET_PAGE_NAMES } from './components/UI/PlanetPage/PlanetPage'
import JarvisCard from './components/UI/JarvisCard/JarvisCard'
import ClaimModal from './components/UI/ClaimModal/ClaimModal'
import NationFounder from './components/UI/NationFounder/NationFounder'
import NationPanel from './components/UI/NationPanel/NationPanel'
import WorldPage from './components/UI/WorldPage/WorldPage'
import SurfacePage from './components/UI/SurfacePage/SurfacePage'
import EarthSurfacePage from './components/UI/EarthSurfacePage/EarthSurfacePage'
import { useEarthStore } from './store/earthStore'
import { useTravelStore } from './store/travelStore'
import { useTourStore } from './store/tourStore'
import styles from './App.module.css'

const SolarSystemScene = lazy(() => import('./scenes/SolarSystemScene'))

export default function App() {
  useThemeMode()
  useDevMode()

  const setCurrentNationId = useEarthStore((s) => s.setCurrentNationId)
  const setCurrentPage     = useEarthStore((s) => s.setCurrentPage)
  const resolvedTheme      = useEarthStore((s) => s.resolvedTheme)
  const isDevMode          = useEarthStore((s) => s.isDevMode)
  const sceneBg            = useEarthStore((s) => s.sceneBg)
  const appStage           = useEarthStore((s) => s.appStage)
  const currentPage        = useEarthStore((s) => s.currentPage)
  const isTraveling        = useTravelStore((s) => s.isTraveling)
  const targetPlanetName   = useTravelStore((s) => s.targetPlanetName)
  const isTouring          = useTourStore((s) => s.isTouring)

  /* Step 10: read ?nation=<id> from URL on first mount */
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const nationId = params.get('nation')
    if (nationId) {
      setCurrentNationId(nationId)
      setCurrentPage('nation')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={styles.root}
      data-theme={resolvedTheme}
      data-dev={isDevMode ? 'true' : 'false'}
    >
      {/* 3D scene — always rendered */}
      <main className={styles.canvas}>
        <Suspense fallback={null}>
          <SolarSystemScene />
        </Suspense>
      </main>

      {/* Scene background overlay — glass / dark / light protection layer */}
      {sceneBg !== 'off' && (
        <div className={styles.sceneOverlay} data-layer={sceneBg} aria-hidden="true" />
      )}

      {/* Surface — scrollable content zone above 3D scene */}
      <div className={styles.surface} id="surface" />

      {/* Loading screen — above scene, below everything else */}
      <LoadingScreen />

      {/* Global header — hidden when any full-screen planet page is open */}
      {currentPage !== 'earth-hero' && currentPage !== 'nation' && currentPage !== 'world' && currentPage !== 'surface' && currentPage !== 'earth-surface' && !PLANET_PAGE_NAMES.includes(currentPage) && <Header />}

      {/* Auth modal — mounts always, visible only when isLoginOpen */}
      <AuthModal />

      {/* Hero copy + stats — left-side overlay, fades in after load */}
      <HeroOverlay />
      <HeroStats />

      {/* Tour launcher + tour HUD — always mounted */}
      <TourHUD />

      {/* Genesis screen — full-screen identity creation (Act 2) */}
      <GenesisScreen />

      {/* HDI profile page */}
      <HDIPage />

      {/* Earth Hero page */}
      <EarthHero />

      {/* Planet intro pages — all non-Earth planets */}
      <PlanetPage />

      {/* Jarvis profile card — opens on Earth pin click */}
      <JarvisCard />

      {/* Territory claim modal — opens on Earth globe click in explore mode */}
      <ClaimModal />

      {/* Nation founder — multi-step modal triggered from ZonePin or post-claim */}
      <NationFounder />

      {/* Nation panel — full-screen overlay for nation overview/treasury/governance */}
      <NationPanel />

      {/* World page — nations discovery */}
      <WorldPage />

      {/* Surface — blank canvas workspace */}
      <SurfacePage />

      {/* Earth Surface — paper-world globe at Level 0 */}
      <EarthSurfacePage />

      {/* Dev diagnostics */}
      <DevOverlayHUD />

      {/* Travel HUD — explore mode only, not during auto-tour */}
      {appStage === 'explore' && !isTouring && (isTraveling || targetPlanetName) && <TravelHUD />}
    </div>
  )
}
