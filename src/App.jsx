import { lazy, Suspense, useEffect } from 'react'
import { useThemeMode } from './hooks/useThemeMode'
import { useDevMode } from './hooks/useDevMode'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSystemsBridge } from './hooks/useSystemsBridge'
import Header from './components/UI/Header/Header'
import LoadingScreen from './components/UI/LoadingScreen/LoadingScreen'
import LightSpeed from './components/UI/LightSpeed/LightSpeed'
import TravelHUD from './components/UI/TravelHUD/TravelHUD'
import AuthModal from './components/UI/AuthModal/AuthModal'
import HeroOverlay from './components/UI/HeroOverlay/HeroOverlay'
import HeroStats from './components/UI/HeroStats/HeroStats'
import TourHUD from './components/UI/TourHUD/TourHUD'
import ClaimModal from './components/UI/ClaimModal/ClaimModal'
import ErrorBoundary from './components/UI/ErrorBoundary/ErrorBoundary'
import { useEarthStore } from './store/earthStore'
import { useAuthStore } from './store/authStore'
import { useTravelStore } from './store/travelStore'
import { useTourStore } from './store/tourStore'
import { PAGE, PLANET_PAGE_NAMES } from './lib/pages'
import styles from './App.module.css'

// Heavy pages are lazy-loaded — initial bundle stays lean
const SolarSystemScene = lazy(() => import('./scenes/SolarSystemScene'))
const DevOverlayHUD    = lazy(() => import('./components/UI/DevOverlay/DevOverlayHUD'))
const GenesisScreen    = lazy(() => import('./components/UI/GenesisScreen/GenesisScreen'))
const HDIPage          = lazy(() => import('./components/UI/HDIPage/HDIPage'))
const EarthHero        = lazy(() => import('./components/UI/EarthHero/EarthHero'))
const PlanetPage       = lazy(() => import('./components/UI/PlanetPage/PlanetPage'))
const JarvisCard       = lazy(() => import('./components/UI/JarvisCard/JarvisCard'))
const NationFounder    = lazy(() => import('./components/UI/NationFounder/NationFounder'))
const NationPanel      = lazy(() => import('./components/UI/NationPanel/NationPanel'))
const WorldPage        = lazy(() => import('./components/UI/WorldPage/WorldPage'))
const SurfacePage      = lazy(() => import('./components/UI/SurfacePage/SurfacePage'))
const EarthSurfacePage = lazy(() => import('./components/UI/EarthSurfacePage/EarthSurfacePage'))

const CANVAS_ERROR = (
  <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
    background:'#000005', color:'#fff', fontSize:'0.9rem', textAlign:'center', padding:'2rem' }}>
    <div>
      <p style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>⚠️</p>
      <p>3D engine failed to initialise.</p>
      <p style={{ opacity:0.5, marginTop:'0.25rem', fontSize:'0.78rem' }}>
        Try refreshing or switching to a browser with WebGL support.
      </p>
    </div>
  </div>
)

export default function App() {
  useThemeMode()
  useDevMode()
  useKeyboardShortcuts()
  useSystemsBridge()

  const setCurrentNationId = useEarthStore((s) => s.setCurrentNationId)
  const setCurrentPage     = useEarthStore((s) => s.setCurrentPage)
  const setAppStage        = useEarthStore((s) => s.setAppStage)
  const setSceneBg         = useEarthStore((s) => s.setSceneBg)
  const resolvedTheme      = useEarthStore((s) => s.resolvedTheme)
  const isDevMode          = useEarthStore((s) => s.isDevMode)
  const sceneBg            = useEarthStore((s) => s.sceneBg)
  const appStage           = useEarthStore((s) => s.appStage)
  const currentPage        = useEarthStore((s) => s.currentPage)
  const isTraveling        = useTravelStore((s) => s.isTraveling)
  const targetPlanetName   = useTravelStore((s) => s.targetPlanetName)
  const isTouring          = useTourStore((s) => s.isTouring)
  const isLoggedIn         = useAuthStore((s) => s.isLoggedIn)

  // Deep-link: ?nation=<id>
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const nationId = params.get('nation')
    if (nationId) {
      setCurrentNationId(nationId)
      setCurrentPage(PAGE.NATION)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-restore logged-in users directly into explore mode on page refresh.
  // Scene stays live ('off') — the home dashboard shows the sun view between panels.
  useEffect(() => {
    if (isLoggedIn && appStage === 'landing') {
      setAppStage('explore')
      setSceneBg('off')
    }
  }, [isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // HDI + World + Earth hub keep the global header (overlays start 66px below it)
  const hideHeader =
    currentPage === PAGE.NATION ||
    currentPage === PAGE.SURFACE    || currentPage === PAGE.EARTH_SURFACE ||
    PLANET_PAGE_NAMES.includes(currentPage)

  return (
    <div
      className={styles.root}
      data-theme={resolvedTheme}
      data-dev={isDevMode ? 'true' : 'false'}
    >
      {/* 3D scene — always rendered, error-bounded against WebGL crashes */}
      <main className={styles.canvas}>
        <ErrorBoundary fallback={CANVAS_ERROR}>
          <Suspense fallback={null}>
            <SolarSystemScene />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Scene background overlay */}
      {sceneBg !== 'off' && (
        <div className={styles.sceneOverlay} data-layer={sceneBg} aria-hidden="true" />
      )}

      {/* Light-speed travel effect */}
      <LightSpeed />

      <div className={styles.surface} id="surface" />

      <LoadingScreen />

      {/* Global header — hidden on full-screen pages */}
      {!hideHeader && <Header />}

      {/* Auth modal — always mounted, visible when isLoginOpen */}
      <AuthModal />

      <HeroOverlay />
      <HeroStats />
      <TourHUD />

      {/* Claim modal eager — needed immediately when user clicks globe */}
      <ClaimModal />

      {/* All heavy pages lazy-loaded in one Suspense boundary */}
      <Suspense fallback={null}>
        <GenesisScreen />
        <HDIPage />
        <EarthHero />
        <PlanetPage />
        <JarvisCard />
        <NationFounder />
        <NationPanel />
        <WorldPage />
        <SurfacePage />
        <EarthSurfacePage />
      </Suspense>

      {/* Dev overlay in its own boundary so it never crashes the app */}
      <Suspense fallback={null}>
        <DevOverlayHUD />
      </Suspense>

      {appStage === 'explore' && !isTouring && (isTraveling || targetPlanetName) && <TravelHUD />}
    </div>
  )
}
