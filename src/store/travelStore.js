import { create } from 'zustand'

export const useTravelStore = create((set) => ({
  isTraveling:      false,
  targetPlanetName: null,

  startTravel: (name) => set({ isTraveling: true, targetPlanetName: name }),
  endTravel:   ()    => set({ isTraveling: false, targetPlanetName: null }),
}))
