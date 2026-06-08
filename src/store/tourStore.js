import { create } from 'zustand'
import { SUN_STOP, PLANETS, GALAXY_STOP } from '../components/SolarSystem/planetData'

export const DWELL_SECONDS = 6

export const TOUR_STOPS = [
  SUN_STOP,
  ...PLANETS.map((p) => ({ name: p.name, fact: p.fact })),
  GALAXY_STOP,
]

export const useTourStore = create((set) => ({
  isTouring:     false,
  isPaused:      false,
  stopIndex:     0,
  dwellProgress: 0,
  skipRequested: false,
  prevRequested: false,

  startTour:    () => set({ isTouring: true, isPaused: false, stopIndex: 0, dwellProgress: 0, skipRequested: false, prevRequested: false }),
  stopTour:     () => set({ isTouring: false, isPaused: false, stopIndex: 0, dwellProgress: 0 }),
  togglePause:  () => set((s) => ({ isPaused: !s.isPaused })),
  requestSkip:  () => set({ skipRequested: true }),
  requestPrev:  () => set({ prevRequested: true }),
}))
