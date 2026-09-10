import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { INDIA_NATION, INDIA_TX, SEED_FOUNDER_HID, mergeSeed } from '../data/seed'

function genId(prefix) {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

export { INDIA_NATION, SEED_FOUNDER_HID }

// Seed the founding nation so the World hub is never empty; every other nation
// is created by users through the Found-a-Nation flow. `mergeSeed` keeps live
// citizens / zones / treasury but pins the seed's identity (name, flag, founder).
const withNationSeed = (nations) =>
  mergeSeed(nations, [INDIA_NATION], ['name', 'flag', 'founder_hid', 'seed'])
const withTxSeed = (txLog) => mergeSeed(txLog, INDIA_TX, ['nation_id', 'ts', 'note'])

export const useNationStore = create(
  devtools(
  persist(
    (set, get) => ({
      nations: withNationSeed([]),
      txLog:   withTxSeed([]),

      foundNation: ({ name, flag, capital_zone_id, constitution, founder_hid }) => {
        const nation = {
          id:               genId('nation'),
          name,
          flag,
          capital_zone_id,
          zones:            [capital_zone_id],
          constitution,
          citizen_hids:     [founder_hid],
          treasury_balance: 0,
          founded_at:       new Date().toISOString(),
          founder_hid,
          status:           'active',
        }
        set(s => ({ nations: [...s.nations, nation] }))
        return nation
      },

      joinNation: (nation_id, hid) => set(s => ({
        nations: s.nations.map(n =>
          n.id === nation_id && !n.citizen_hids.includes(hid)
            ? { ...n, citizen_hids: [...n.citizen_hids, hid] }
            : n
        ),
      })),

      leaveNation: (nation_id, hid) => set(s => ({
        nations: s.nations.map(n =>
          n.id === nation_id
            ? { ...n, citizen_hids: n.citizen_hids.filter(h => h !== hid) }
            : n
        ),
      })),

      addZoneToNation: (nation_id, zone_id) => set(s => ({
        nations: s.nations.map(n =>
          n.id === nation_id && !n.zones.includes(zone_id)
            ? { ...n, zones: [...n.zones, zone_id] }
            : n
        ),
      })),

      depositTreasury: (nation_id, hid, amount, note = '') => set(s => ({
        nations: s.nations.map(n =>
          n.id === nation_id
            ? { ...n, treasury_balance: n.treasury_balance + amount }
            : n
        ),
        txLog: [
          { id: genId('tx'), nation_id, hid, amount, type: 'deposit', note, ts: new Date().toISOString() },
          ...s.txLog,
        ].slice(0, 200),
      })),

      withdrawTreasury: (nation_id, hid, amount, note = '') => set(s => {
        const nation = s.nations.find(n => n.id === nation_id)
        if (!nation || nation.treasury_balance < amount) return {}
        return {
          nations: s.nations.map(n =>
            n.id === nation_id
              ? { ...n, treasury_balance: n.treasury_balance - amount }
              : n
          ),
          txLog: [
            { id: genId('tx'), nation_id, hid, amount, type: 'withdrawal', note, ts: new Date().toISOString() },
            ...s.txLog,
          ].slice(0, 200),
        }
      }),

      getNation:        (id)      => get().nations.find(n => n.id === id) ?? null,
      getNationByZone:  (zone_id) => get().nations.find(n => n.zones.includes(zone_id)) ?? null,
      getTxLog:         (nation_id) => get().txLog.filter(t => t.nation_id === nation_id),
    }),
    {
      name: 'earthsphere-nations',
      version: 2,
      // Backfill the seed nation + its treasury history into older stores.
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          persisted.nations = withNationSeed(persisted.nations || [])
          persisted.txLog   = withTxSeed(persisted.txLog || [])
        }
        return persisted
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        nations: withNationSeed(persisted?.nations ?? current.nations),
        txLog:   withTxSeed(persisted?.txLog ?? current.txLog),
      }),
    }
  ),
  { name: 'NationStore' }
  )
)
