import { create } from 'zustand'

export const useEarthStore = create((set) => ({
  themeMode: 'auto',
  resolvedTheme: 'day',
  setThemeMode: (mode) => set({ themeMode: mode }),
  setResolvedTheme: (t) => set({ resolvedTheme: t }),

  isDevMode: false,
  toggleDevMode: () => set((s) => ({ isDevMode: !s.isDevMode })),

  isLoaded: false,
  setLoaded: () => set({ isLoaded: true }),

  fps: 0,
  setFps: (fps) => set({ fps }),

  timeScale: 1,
  setTimeScale: (v) => set({ timeScale: v }),

  currentAngle: 0,
  setCurrentAngle: (a) => set({ currentAngle: a }),

  // Scene overlay: 'off' | 'glass' | 'dark' | 'light'
  sceneBg: 'off',
  setSceneBg: (v) => set({ sceneBg: v }),

  // App stage: 'landing' | 'genesis' (identity creation) | 'explore'
  appStage: 'landing',
  setAppStage: (s) => set({ appStage: s }),

  // Active page in the main nav (null = solar system overview)
  currentPage: null,
  setCurrentPage: (p) => set({ currentPage: p }),

  // Jarvis profile card
  isJarvisOpen: false,
  jarvisTab:    'profile',
  openJarvis:      () => set({ isJarvisOpen: true, jarvisTab: 'profile' }),
  openJarvisChat:  () => set({ isJarvisOpen: true, jarvisTab: 'chat' }),
  closeJarvis:     () => set({ isJarvisOpen: false }),

  // Territory claim — set when user clicks the Earth globe
  claimTarget: null,
  setClaimTarget:   (pos) => set({ claimTarget: pos }),
  clearClaimTarget: ()    => set({ claimTarget: null }),

  // Nation panel
  currentNationId: null,
  setCurrentNationId: (id) => set({ currentNationId: id }),

  // Where to return after closing NationPanel ('world' | 'hdi' | null)
  nationReturnPage: null,
  setNationReturnPage: (p) => set({ nationReturnPage: p }),

  // Nation founder — which zone to found a nation on
  nationFounderZoneId: null,
  setNationFounderZoneId: (id) => set({ nationFounderZoneId: id }),

  // World page — nations discovery
  // currentPage === 'world' shows WorldPage
}))
