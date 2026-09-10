import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function zonesOverlap(z1, z2) {
  return haversine(z1.lat, z1.lng, z2.lat, z2.lng) < z1.radius + z2.radius
}

function genId(p) {
  return `${p}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

export const useRelationStore = create(
  devtools(
  persist(
    (set, get) => ({
      alliances: [],
      treaties:  [],
      conflicts: [],

      proposeAlliance: (nation_a, nation_b) => {
        const existing = get().alliances.find(a =>
          (a.nation_a === nation_a && a.nation_b === nation_b) ||
          (a.nation_a === nation_b && a.nation_b === nation_a)
        )
        if (existing) return existing
        const a = { id: genId('alli'), nation_a, nation_b, status: 'pending', proposed_by: nation_a, proposed_at: new Date().toISOString() }
        set(s => ({ alliances: [...s.alliances, a] }))
        return a
      },

      acceptAlliance: (alliance_id) => set(s => ({
        alliances: s.alliances.map(a =>
          a.id === alliance_id ? { ...a, status: 'active', accepted_at: new Date().toISOString() } : a
        ),
      })),

      rejectAlliance: (alliance_id) => set(s => ({
        alliances: s.alliances.map(a =>
          a.id === alliance_id ? { ...a, status: 'rejected' } : a
        ),
      })),

      proposeTreaty: (nation_a, nation_b, type, terms = '') => {
        const t = { id: genId('treaty'), nation_a, nation_b, type, terms, status: 'pending', proposed_at: new Date().toISOString() }
        set(s => ({ treaties: [...s.treaties, t] }))
        return t
      },

      acceptTreaty: (treaty_id) => set(s => ({
        treaties: s.treaties.map(t =>
          t.id === treaty_id ? { ...t, status: 'active', signed_at: new Date().toISOString() } : t
        ),
      })),

      rejectTreaty: (treaty_id) => set(s => ({
        treaties: s.treaties.map(t =>
          t.id === treaty_id ? { ...t, status: 'rejected' } : t
        ),
      })),

      detectConflicts: (zones) => {
        const fresh = []
        const samePair = (c, a, b) =>
          (c.zone_a === a && c.zone_b === b) || (c.zone_a === b && c.zone_b === a)
        for (let i = 0; i < zones.length; i++) {
          for (let j = i + 1; j < zones.length; j++) {
            const z1 = zones[i]; const z2 = zones[j]
            if (!z1.nation_id || !z2.nation_id || z1.nation_id === z2.nation_id) continue
            if (!zonesOverlap(z1, z2)) continue
            // Skip a pair that's already tracked — active OR resolved, so
            // resolving a conflict actually sticks instead of reappearing.
            const dup = get().conflicts.find(c => samePair(c, z1.id, z2.id))
            if (!dup) fresh.push({ id: genId('conflict'), nation_a: z1.nation_id, nation_b: z2.nation_id, zone_a: z1.id, zone_b: z2.id, detected_at: new Date().toISOString(), status: 'active' })
          }
        }
        if (fresh.length) set(s => ({ conflicts: [...s.conflicts, ...fresh] }))
        return fresh
      },

      // Mark resolved rather than delete — detectConflicts keeps skipping the
      // pair, so it won't pop back up on the next zone change.
      resolveConflict: (id) => set(s => ({
        conflicts: s.conflicts.map(c =>
          c.id === id ? { ...c, status: 'resolved', resolved_at: new Date().toISOString() } : c
        ),
      })),

      getAlliancesFor:  (nid) => get().alliances.filter(a => a.nation_a === nid || a.nation_b === nid),
      getTreatiesFor:  (nid) => get().treaties.filter(t => t.nation_a === nid || t.nation_b === nid),
      getConflictsFor: (nid) => get().conflicts.filter(c => c.nation_a === nid || c.nation_b === nid),
    }),
    { name: 'earthsphere-relations' }
  ),
  { name: 'RelationStore' }
  )
)
