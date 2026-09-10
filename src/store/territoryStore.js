import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { INDIA_ZONES, mergeSeed } from '../data/seed'

function genZoneId() {
  return 'zone:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 6)
}

// Seed India's zones; user-claimed zones keep whatever nation they've been
// assigned to, but the seed zones stay pinned to India.
const withZoneSeed = (zones) =>
  mergeSeed(zones, INDIA_ZONES, ['nation_id', 'owner_hid', 'name', 'lat', 'lng', 'radius'])

export const useTerritoryStore = create(
  devtools(
  persist(
    (set) => ({
      zones: withZoneSeed([]),

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
    {
      name: 'earthsphere-territory',
      version: 1,
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          persisted.zones = withZoneSeed(persisted.zones || [])
        }
        return persisted
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        zones: withZoneSeed(persisted?.zones ?? current.zones),
      }),
    }
  ),
  { name: 'TerritoryStore' }
  )
)
