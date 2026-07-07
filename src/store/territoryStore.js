import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

function genZoneId() {
  return 'zone:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 6)
}

export const useTerritoryStore = create(
  devtools(
  persist(
    (set) => ({
      zones: [],

      claimZone: ({ lat, lng, radius, name, owner_hid, owner_name }) => {
        const zone = {
          id: genZoneId(),
          lat, lng, radius,
          name,
          owner_hid,
          owner_name,
          claimed_at: new Date().toISOString(),
          nation_id: null,
        }
        set(s => ({ zones: [...s.zones, zone] }))
        return zone
      },

      removeZone:    (id)           => set(s => ({ zones: s.zones.filter(z => z.id !== id) })),
      setZoneNation: (id, nation_id) => set(s => ({
        zones: s.zones.map(z => z.id === id ? { ...z, nation_id } : z),
      })),
    }),
    { name: 'earthsphere-territory' }
  ),
  { name: 'TerritoryStore' }
  )
)
