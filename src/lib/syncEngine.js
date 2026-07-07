// Local-first auto-sync engine.
//
// Today it mirrors HDI/identity state across browser tabs in real time via
// BroadcastChannel and reports a sync status to the store. The remote adapter
// is a clean seam: drop a Supabase (or any) implementation into `remoteAdapter`
// and the same push/pull flow syncs to the cloud — no call-site changes.

import { useEarthStore } from '../store/earthStore'
import { useAuthStore } from '../store/authStore'

const CHANNEL = 'earthsphere-sync'
const SYNCED_STORES = ['earthsphere-auth', 'earthsphere-earth']

let channel = null
let started = false
let settleTimer = null
let applyingRemote = false

function setStatus(status) {
  useEarthStore.getState().setSyncStatus(status)
}

// ── Remote adapter seam ──────────────────────────────────────────────
// Replace with a real backend later. Each method returns a Promise.
// Wire env (e.g. VITE_SUPABASE_URL/ANON_KEY) and implement push/pull.
const remoteAdapter = {
  enabled: false,
  async push(/* key, value */) {},
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

// Broadcast a changed persisted store to other tabs.
// Guarded against re-entrancy: markSyncing() sets a store value, which makes
// zustand/persist write localStorage again — without this guard that would
// recurse forever (stack overflow / black screen).
let broadcasting = false
function broadcast(key, value) {
  if (!channel || applyingRemote || broadcasting) return
  broadcasting = true
  try {
    channel.postMessage({ type: 'store', key, value, at: Date.now() })
    if (remoteAdapter.enabled) remoteAdapter.push(key, value).catch(() => setStatus('offline'))
    markSyncing()
  } finally {
    broadcasting = false
  }
}

// Apply an incoming store snapshot from another tab, then rehydrate.
function applyRemote(key, value) {
  if (!SYNCED_STORES.includes(key)) return
  applyingRemote = true
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    // zustand/persist stores expose rehydrate() on the hook
    if (key === 'earthsphere-auth') {
      useAuthStore.persist?.rehydrate?.()
    }
    if (key === 'earthsphere-earth') {
      useEarthStore.persist?.rehydrate?.()
    }
  } finally {
    applyingRemote = false
    markSyncing()
  }
}

export function startSync() {
  if (started || typeof window === 'undefined') return
  started = true

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (e) => {
      const msg = e.data
      if (msg?.type === 'store') applyRemote(msg.key, msg.value)
    }
  }

  // Patch localStorage.setItem so a *changed* persisted-store write broadcasts.
  // Comparing prev vs next is essential: persist re-writes the same value on
  // every unrelated state change (e.g. syncStatus), which must NOT broadcast.
  const origSet = localStorage.setItem.bind(localStorage)
  const origGet = localStorage.getItem.bind(localStorage)
  localStorage.setItem = (key, value) => {
    const changed = SYNCED_STORES.includes(key) && origGet(key) !== value
    origSet(key, value)
    if (changed) broadcast(key, value)
  }

  // Cross-tab fallback for browsers without BroadcastChannel.
  window.addEventListener('storage', (e) => {
    if (e.key && SYNCED_STORES.includes(e.key)) applyRemote(e.key, e.newValue)
  })

  window.addEventListener('online',  () => setStatus('synced'))
  window.addEventListener('offline', () => setStatus('offline'))

  setStatus(navigator.onLine ? 'synced' : 'offline')
}
