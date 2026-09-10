// Local-first auto-sync engine.
//
// Today it mirrors HDI/identity state across browser tabs in real time via
// BroadcastChannel and reports a sync status to the store. The remote adapter
// is a clean seam: drop a Supabase (or any) implementation into `remoteAdapter`
// and the same push/pull flow syncs to the cloud — no call-site changes.

import { useEarthStore } from '../store/earthStore'
import { useAuthStore } from '../store/authStore'

const CHANNEL = 'earthsphere-sync'

// Storage key → store hook. Only the partialized (persisted) slice of each store
// is synced across tabs.
const STORES = {
  'earthsphere-auth':  useAuthStore,
  'earthsphere-earth': useEarthStore,
}

let channel = null
let started = false
let settleTimer = null
let applyingRemote = false

// key → JSON string of the last partialized slice we broadcast or applied.
// The broadcast trigger compares against this, so a store write that doesn't
// change the persisted slice (e.g. an FPS tick, or an encrypted re-write with a
// fresh IV) never reaches other tabs.
const lastSnapshot = {}

function setStatus(status) {
  useEarthStore.getState().setSyncStatus(status)
}

// ── Remote adapter seam ──────────────────────────────────────────────
// Replace with a real backend later. Each method returns a Promise.
// Wire env (e.g. VITE_SUPABASE_URL/ANON_KEY) and implement push/pull.
const remoteAdapter = {
  enabled: false,
  async push(/* key, snapshot */) {},
  async pull(/* key */) { return null },
}

// Flag a brief "syncing" state that auto-settles to "synced".
function markSyncing() {
  if (!navigator.onLine) { setStatus('offline'); return }
  setStatus('syncing')
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => {
    setStatus(navigator.onLine ? 'synced' : 'offline')
  }, 650)
}

// Serialize a store's persisted slice — the exact shape `persist` would write.
function snapshotOf(store) {
  const partialize = store.persist?.getOptions?.().partialize
  const state = store.getState()
  return JSON.stringify(partialize ? partialize(state) : state)
}

// Broadcast a store's persisted slice to other tabs / the cloud.
function broadcast(key, snapshot) {
  channel?.postMessage({ type: 'store', key, snapshot, at: Date.now() })
  if (remoteAdapter.enabled) remoteAdapter.push(key, snapshot).catch(() => setStatus('offline'))
  markSyncing()
}

// Apply an incoming snapshot from another tab. `setState` lets each store's own
// persist middleware re-encrypt and write its storage — syncEngine never writes
// localStorage directly, so it can't corrupt an encrypted payload.
function applyRemote(key, snapshot) {
  const store = STORES[key]
  if (!store || snapshot == null || snapshot === lastSnapshot[key]) return
  let parsed
  try { parsed = JSON.parse(snapshot) }
  catch { return }
  applyingRemote = true
  try {
    lastSnapshot[key] = snapshot
    store.setState(parsed)
  } finally {
    applyingRemote = false
    markSyncing()
  }
}

export function startSync() {
  if (started || typeof window === 'undefined') return
  started = true

  // Seed snapshots now (and again once hydration lands) so neither the initial
  // render nor rehydration counts as a change worth broadcasting.
  for (const [key, store] of Object.entries(STORES)) {
    lastSnapshot[key] = snapshotOf(store)
    store.persist?.onFinishHydration?.(() => { lastSnapshot[key] = snapshotOf(store) })
  }

  const hasBC = 'BroadcastChannel' in window
  if (hasBC) {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (e) => {
      const msg = e.data
      if (msg?.type === 'store') applyRemote(msg.key, msg.snapshot)
    }
  }

  // Broadcast only when a store's persisted slice actually changes. Subscribing
  // to the store — instead of monkey-patching localStorage.setItem — means an
  // encrypted store (whose ciphertext changes on every write) no longer triggers
  // spurious cross-tab rehydrates.
  for (const [key, store] of Object.entries(STORES)) {
    store.subscribe(() => {
      if (applyingRemote) return
      const snap = snapshotOf(store)
      if (snap === lastSnapshot[key]) return
      lastSnapshot[key] = snap
      broadcast(key, snap)
    })
  }

  // Fallback for browsers without BroadcastChannel: another tab wrote storage —
  // let the affected store rehydrate itself (its adapter handles decryption).
  if (!hasBC) {
    window.addEventListener('storage', (e) => {
      const store = e.key && STORES[e.key]
      if (!store) return
      applyingRemote = true
      Promise.resolve(store.persist?.rehydrate?.()).finally(() => {
        applyingRemote = false
        lastSnapshot[e.key] = snapshotOf(store)
        markSyncing()
      })
    })
  }

  window.addEventListener('online',  () => setStatus('synced'))
  window.addEventListener('offline', () => setStatus('offline'))

  setStatus(navigator.onLine ? 'synced' : 'offline')
}
