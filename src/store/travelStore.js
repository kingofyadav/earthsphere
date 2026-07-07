import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useTravelStore = create(
  devtools(
    (set) => ({
      isTraveling:      false,
      targetPlanetName: null,

      startTravel: (name) => set({ isTraveling: true, targetPlanetName: name }),
      endTravel:   ()    => set({ isTraveling: false, targetPlanetName: null }),
    }),
    { name: 'TravelStore' }
  )
)
