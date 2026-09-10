// Seed content for the founding nation (India). Every other nation, zone,
// proposal and treaty is created by users at runtime — this only guarantees the
// World hub and the Nation panel's four tabs have something real to show.

export const SEED_FOUNDER_HID = '@kingofyadav'
export const INDIA_NATION_ID  = 'nation:seed:india'

const DELHI_ZONE_ID     = 'zone:seed:delhi'
const MUMBAI_ZONE_ID    = 'zone:seed:mumbai'
const BENGALURU_ZONE_ID = 'zone:seed:bengaluru'

export const INDIA_ZONES = [
  { id: DELHI_ZONE_ID,     lat: 28.6139, lng: 77.2090, radius: 60, name: 'New Delhi',
    owner_hid: SEED_FOUNDER_HID, owner_name: 'India', claimed_at: '2026-01-01T00:00:00.000Z', nation_id: INDIA_NATION_ID },
  { id: MUMBAI_ZONE_ID,    lat: 19.0760, lng: 72.8777, radius: 45, name: 'Mumbai',
    owner_hid: SEED_FOUNDER_HID, owner_name: 'India', claimed_at: '2026-01-01T00:00:00.000Z', nation_id: INDIA_NATION_ID },
  { id: BENGALURU_ZONE_ID, lat: 12.9716, lng: 77.5946, radius: 40, name: 'Bengaluru',
    owner_hid: SEED_FOUNDER_HID, owner_name: 'India', claimed_at: '2026-01-01T00:00:00.000Z', nation_id: INDIA_NATION_ID },
]

export const INDIA_NATION = {
  id:               INDIA_NATION_ID,
  name:             'India',
  flag:             '🇮🇳',
  capital_zone_id:  DELHI_ZONE_ID,
  zones:            INDIA_ZONES.map(z => z.id),
  constitution:
    'The Republic of India on the sovereign network — the founding nation of the Digital Earth. ' +
    'Every verified citizen carries their HDI as a portable, self-sovereign passport. Territory is ' +
    'held in common, the treasury is transparent, and every citizen holds one equal vote.',
  citizen_hids:     [SEED_FOUNDER_HID],
  treasury_balance: 25000,
  founded_at:       '2026-01-01T00:00:00.000Z',
  founder_hid:      SEED_FOUNDER_HID,
  status:           'active',
  seed:             true,
}

export const INDIA_TX = [
  { id: 'tx:seed:endowment', nation_id: INDIA_NATION_ID, hid: SEED_FOUNDER_HID,
    amount: 20000, type: 'deposit', note: 'Founding endowment', ts: '2026-01-01T00:00:00.000Z' },
  { id: 'tx:seed:republic',  nation_id: INDIA_NATION_ID, hid: SEED_FOUNDER_HID,
    amount: 5000,  type: 'deposit', note: 'Republic Day contribution', ts: '2026-01-26T09:00:00.000Z' },
]

export const INDIA_PROPOSALS = [
  {
    id: 'prop:seed:passport', nation_id: INDIA_NATION_ID,
    title: 'Adopt the Digital Passport v1 standard',
    description:
      'Ratify HDI Digital Passport v1 as the official identity credential for all citizens of India — ' +
      'portable across nations, verifiable offline, revocable only by the holder.',
    proposer_hid: SEED_FOUNDER_HID,
    created_at: '2026-08-15T00:00:00.000Z',
    deadline:   '2027-01-01T00:00:00.000Z',
    votes_for: [SEED_FOUNDER_HID], votes_against: [],
    status: 'open',
  },
  {
    id: 'prop:seed:grant', nation_id: INDIA_NATION_ID,
    title: 'Fund the first citizen grant pool (10,000 RPC)',
    description:
      'Allocate 10,000 RPC from the national treasury to a grant pool for citizens building public ' +
      'infrastructure on the sovereign network. Disbursed by simple-majority vote per application.',
    proposer_hid: SEED_FOUNDER_HID,
    created_at: '2026-05-20T00:00:00.000Z',
    deadline:   '2026-06-03T00:00:00.000Z',
    votes_for: [SEED_FOUNDER_HID], votes_against: [],
    status: 'passed',
  },
]

// Ensure `seeds` are present in `list` exactly once. A live row with the same id
// wins for everything except:
//   identity  — always taken from the seed (name/flag/founder …)
//   union     — array fields merged (seed values ∪ live values), so seed zones /
//               citizens can't be lost even if an earlier build persisted them empty
//   restore   — seed value used when the live one is null / '' / []
// The third arg may be an array (shorthand for { identity }) or an options object.
export function mergeSeed(list = [], seeds, opts = []) {
  const { identity = [], union = [], restore = [] } = Array.isArray(opts) ? { identity: opts } : opts
  const arr = Array.isArray(list) ? list : []
  const seedIds = new Set(seeds.map(s => s.id))
  const rest = arr.filter(x => x && !seedIds.has(x.id))
  const merged = seeds.map(seed => {
    const live = arr.find(x => x && x.id === seed.id)
    if (!live) return seed
    const out = { ...seed, ...live }
    for (const k of identity) out[k] = seed[k]
    for (const k of union) {
      out[k] = [...new Set([...(seed[k] || []), ...(Array.isArray(live[k]) ? live[k] : [])])]
    }
    for (const k of restore) {
      const v = out[k]
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) out[k] = seed[k]
    }
    return out
  })
  // Live rows first (they're the newest for tx logs / feeds); seeds trail.
  return [...rest, ...merged]
}
