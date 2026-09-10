import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

function genId(prefix) {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

// Founding nation. Seeded so the World hub is never empty — every other nation
// is created by users through the Found-a-Nation flow.
export const SEED_FOUNDER_HID = '@kingofyadav'
export const INDIA_NATION = {
  id:               'nation:seed:india',
  name:             'India',
  flag:             '🇮🇳',
  capital_zone_id:  null,
  zones:            [],
  constitution:
    'The Republic of India on the sovereign network — the founding nation of the Digital Earth. ' +
    'Every verified citizen carries their HDI as a portable, self-sovereign passport.',
  citizen_hids:     [SEED_FOUNDER_HID],
  treasury_balance: 0,
  founded_at:       '2026-01-01T00:00:00.000Z',
  founder_hid:      SEED_FOUNDER_HID,
  status:           'active',
  seed:             true,
}

// Ensure the seed nation is present exactly once, at the front of the list.
function withSeed(nations = []) {
  const rest = nations.filter(n => n.id !== INDIA_NATION.id)
  const existing = nations.find(n => n.id === INDIA_NATION.id)
  // Keep any user-accrued citizens/zones/treasury on the seed nation across reloads.
  const india = existing
    ? { ...INDIA_NATION, ...existing, name: INDIA_NATION.name, flag: INDIA_NATION.flag, seed: true }
    : INDIA_NATION
  return [india, ...rest]
}

export const useNationStore = create(
  devtools(
  persist(
    (set, get) => ({
      nations: withSeed([]),
      txLog:   [],

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
      version: 1,
      // Backfill the seed nation into stores persisted before it existed.
      migrate: (persisted) => {
        if (persisted && typeof persisted === 'object') {
          persisted.nations = withSeed(persisted.nations || [])
        }
        return persisted
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        nations: withSeed(persisted?.nations || current.nations),
      }),
    }
  ),
  { name: 'NationStore' }
  )
)
