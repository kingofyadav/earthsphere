import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { patchProfile } from '../lib/api.js'

const DEF_PERMS  = { CAN_VIEW: true, CAN_VERIFY: true, CAN_TRANSFER: false, CAN_SHARE: false, CAN_RECOVER: false, CAN_CLAIM: false }
const DEF_VERIF  = { email: false, phone: false, govId: false, employer: false, university: false, socialTrust: false }
const DEF_REC    = { guardian: null, family: false, timelock: null, multisig: null }
const DEF_ASSETS = { wallets: [], domains: [], credentials: [], documents: [] }
const DEF_DISC   = { name: true, email: false, phone: false, employer: false, university: false }

function cleanName(input = '') {
  return input.trim().replace(/\s+/g, ' ')
}

export function deriveNameFromEmail(email = '') {
  const local = email.split('@')[0] || 'traveler'
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Digital Traveler'
}

function stableDigits(seed = '') {
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) % 10000
  return String(n).padStart(4, '0')
}

export function generateHDI(name = '', phone = '', email = '') {
  const parts = cleanName(name || deriveNameFromEmail(email)).toLowerCase().split(/\s+/)
  const first = (parts[0] || 'user').replace(/[^a-z]/g, '').slice(0, 6) || 'user'
  const lastInitial = parts[1] ? '.' + (parts[1][0] || '').replace(/[^a-z]/g, '') : ''
  const phoneDigits = phone.replace(/\D/g, '')
  const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : stableDigits(email || name)
  return `@${first}${lastInitial}.${last4}`
}

// ── Clerk bridge seam ────────────────────────────────────────────────
// Real identity/session lives in Clerk; this store only holds the app-side
// profile (Neon-backed via /api/profile). useAuthBridge() wires these in
// once Clerk has loaded, so mutation actions below can persist server-side
// without store code importing React hooks directly.
let getTokenFn = null
let signOutFn = null

export function registerClerkBridge({ getToken, signOut }) {
  getTokenFn = getToken
  signOutFn = signOut
}

async function persistPatch(patch) {
  if (!getTokenFn) return
  try {
    const token = await getTokenFn()
    if (!token) return
    await patchProfile(token, patch)
  } catch {
    // Best-effort — local state already applied optimistically; the next
    // successful patch (or a fresh hydrate on reload) reconciles the server.
  }
}

export const useAuthStore = create(
  devtools(
    (set, get) => ({
      isLoggedIn: false, user: null, isLoginOpen: false, orbitHistory: [],
      permissions:   { ...DEF_PERMS  },
      verifications: { ...DEF_VERIF  },
      recovery:      { ...DEF_REC    },
      relationships: [],
      assets:        { ...DEF_ASSETS },
      disclosure:    { ...DEF_DISC   },

      // Called by useAuthBridge once Clerk is signed in and /api/profile has
      // been fetched-or-created for this user.
      hydrate: (profile) => set({
        isLoggedIn: true,
        user: profile.user,
        orbitHistory: profile.orbitHistory ?? [],
        permissions:   { ...DEF_PERMS,  ...profile.permissions   },
        verifications: { ...DEF_VERIF,  ...profile.verifications },
        recovery:      { ...DEF_REC,    ...profile.recovery      },
        relationships: profile.relationships ?? [],
        assets:        { ...DEF_ASSETS, ...profile.assets        },
        disclosure:    { ...DEF_DISC,   ...profile.disclosure    },
      }),

      logout: () => {
        signOutFn?.().catch(() => {})
        set({
          isLoggedIn: false, user: null,
          permissions: { ...DEF_PERMS }, verifications: { ...DEF_VERIF },
          recovery: { ...DEF_REC }, relationships: [], assets: { ...DEF_ASSETS }, disclosure: { ...DEF_DISC },
        })
      },

      openLoginModal:  () => set({ isLoginOpen: true }),
      closeLoginModal: () => set({ isLoginOpen: false }),

      recordVisit: (planet) => {
        if (!get().isLoggedIn) return
        const rest = get().orbitHistory.filter(v => v.planet !== planet)
        const orbitHistory = [{ planet, ts: Date.now() }, ...rest].slice(0, 50)
        set({ orbitHistory })
        persistPatch({ appState: { orbitHistory } })
      },

      syncVerifications: () => {
        const s = get()
        const verifications = {
          ...s.verifications,
          email: s.verifications.email || Boolean(s.user?.email),
          phone: s.verifications.phone || Boolean(s.user?.phone),
        }
        set({ verifications })
        persistPatch({ appState: { verifications } })
      },

      addVerification: (key) => {
        const verifications = { ...get().verifications, [key]: true }
        set({ verifications })
        persistPatch({ appState: { verifications } })
      },

      togglePermission: (key) => {
        const permissions = { ...get().permissions, [key]: !get().permissions[key] }
        set({ permissions })
        persistPatch({ appState: { permissions } })
      },

      setRecovery: (type, data) => {
        const recovery = { ...get().recovery, [type]: data }
        set({ recovery })
        persistPatch({ appState: { recovery } })
      },
      clearRecovery: (type) => {
        const recovery = { ...get().recovery, [type]: null }
        set({ recovery })
        persistPatch({ appState: { recovery } })
      },

      addRelationship: (rel) => {
        const relationships = [...get().relationships, { ...rel, id: Date.now().toString(36), ts: Date.now() }]
        set({ relationships })
        persistPatch({ appState: { relationships } })
      },
      removeRelationship: (id) => {
        const relationships = get().relationships.filter(r => r.id !== id)
        set({ relationships })
        persistPatch({ appState: { relationships } })
      },

      addAsset: (type, data) => {
        const assets = { ...get().assets, [type]: [...(get().assets[type] || []), { ...data, id: Date.now().toString(36), ts: Date.now() }] }
        set({ assets })
        persistPatch({ appState: { assets } })
      },
      removeAsset: (type, id) => {
        const assets = { ...get().assets, [type]: (get().assets[type] || []).filter(a => a.id !== id) }
        set({ assets })
        persistPatch({ appState: { assets } })
      },

      toggleDisclosure: (key) => {
        const disclosure = { ...get().disclosure, [key]: !get().disclosure[key] }
        set({ disclosure })
        persistPatch({ appState: { disclosure } })
      },

      /* RPC economy */
      earnRPC: (amount) => {
        const s = get()
        if (!s.user) return
        const rpcBalance = (s.user.rpcBalance ?? 0) + amount
        set({ user: { ...s.user, rpcBalance } })
        persistPatch({ rpcBalance })
      },
      spendRPC: (amount) => {
        const s = get()
        if (!s.user || (s.user.rpcBalance ?? 0) < amount) return
        const rpcBalance = s.user.rpcBalance - amount
        set({ user: { ...s.user, rpcBalance } })
        persistPatch({ rpcBalance })
      },

      /* On-chain wallet address (RupeeCoin) */
      setRcAddress: (address) => {
        const s = get()
        if (!s.user) return
        set({ user: { ...s.user, rcAddress: address } })
        persistPatch({ rcAddress: address })
      },
    }),
    { name: 'AuthStore' }
  )
)
