import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

function normalizeUser(user = {}) {
  const email = user.email?.trim() || ''
  const name = cleanName(user.name || deriveNameFromEmail(email))
  const phone = user.phone || ''
  return {
    ...user,
    name,
    email,
    phone,
    hdi:        user.hdi || generateHDI(name, phone, email),
    rpcBalance: user.rpcBalance ?? 1000,
    rcAddress:  user.rcAddress  ?? null,
    createdAt:  user.createdAt || Date.now(),
  }
}

export const useAuthStore = create(
  persist(
    (set) => ({
      isLoggedIn: false, user: null, isLoginOpen: false, orbitHistory: [],
      permissions:   { ...DEF_PERMS  },
      verifications: { ...DEF_VERIF  },
      recovery:      { ...DEF_REC    },
      relationships: [],
      assets:        { ...DEF_ASSETS },
      disclosure:    { ...DEF_DISC   },

      login: (user) => set((s) => {
        // Preserve existing user data when re-logging in with the same email
        const incoming = { ...(s.user?.email === (user.email || '').trim() ? s.user : {}), ...user }
        const nextUser = normalizeUser(incoming)
        return {
          isLoggedIn: true, user: nextUser, isLoginOpen: false,
          verifications: { ...s.verifications, email: Boolean(nextUser.email), phone: Boolean(nextUser.phone) },
        }
      }),

      logout: () => set({
        isLoggedIn: false, user: null,
        permissions: { ...DEF_PERMS }, verifications: { ...DEF_VERIF },
        recovery: { ...DEF_REC }, relationships: [], assets: { ...DEF_ASSETS }, disclosure: { ...DEF_DISC },
      }),

      openLoginModal:  () => set({ isLoginOpen: true }),
      closeLoginModal: () => set({ isLoginOpen: false }),

      recordVisit: (planet) => set((s) => {
        if (!s.isLoggedIn) return {}
        const rest = s.orbitHistory.filter(v => v.planet !== planet)
        return { orbitHistory: [{ planet, ts: Date.now() }, ...rest].slice(0, 50) }
      }),

      /* sync existing sessions that predate verifications field */
      syncVerifications: () => set((s) => {
        const nextUser = s.user ? normalizeUser(s.user) : s.user
        return {
          user: nextUser,
          verifications: {
            ...s.verifications,
            email: s.verifications.email || Boolean(nextUser?.email),
            phone: s.verifications.phone || Boolean(nextUser?.phone),
          },
        }
      }),

      /* Phase 2 */
      addVerification: (key) => set(s => ({ verifications: { ...s.verifications, [key]: true } })),

      /* Phase 3 */
      togglePermission: (key) => set(s => ({ permissions: { ...s.permissions, [key]: !s.permissions[key] } })),

      /* Phase 4 */
      setRecovery:   (type, data) => set(s => ({ recovery: { ...s.recovery, [type]: data } })),
      clearRecovery: (type)       => set(s => ({ recovery: { ...s.recovery, [type]: null } })),

      /* Phase 5 */
      addRelationship:    (rel) => set(s => ({ relationships: [...s.relationships, { ...rel, id: Date.now().toString(36), ts: Date.now() }] })),
      removeRelationship: (id)  => set(s => ({ relationships: s.relationships.filter(r => r.id !== id) })),

      /* Phase 6 */
      addAsset:    (type, data) => set(s => ({ assets: { ...s.assets, [type]: [...(s.assets[type] || []), { ...data, id: Date.now().toString(36), ts: Date.now() }] } })),
      removeAsset: (type, id)   => set(s => ({ assets: { ...s.assets, [type]: (s.assets[type] || []).filter(a => a.id !== id) } })),

      /* Phase 7 */
      toggleDisclosure: (key) => set(s => ({ disclosure: { ...s.disclosure, [key]: !s.disclosure[key] } })),

      /* RPC economy */
      earnRPC:  (amount) => set(s => ({ user: s.user ? { ...s.user, rpcBalance: (s.user.rpcBalance ?? 0) + amount } : s.user })),
      spendRPC: (amount) => set(s => {
        if (!s.user || (s.user.rpcBalance ?? 0) < amount) return {}
        return { user: { ...s.user, rpcBalance: s.user.rpcBalance - amount } }
      }),

      /* On-chain wallet address (RupeeCoin) */
      setRcAddress: (address) => set(s => ({ user: s.user ? { ...s.user, rcAddress: address } : s.user })),
    }),
    {
      name: 'earthsphere-auth',
      partialize: s => ({
        isLoggedIn: s.isLoggedIn, user: s.user, orbitHistory: s.orbitHistory,
        permissions: s.permissions, verifications: s.verifications,
        recovery: s.recovery, relationships: s.relationships,
        assets: s.assets, disclosure: s.disclosure,
      }),
    }
  )
)
