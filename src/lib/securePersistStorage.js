// AES-GCM encryption for auth localStorage using a device-fingerprint-derived key.
// Protects against offline storage dumps; key is deterministic from device characteristics.

const APP_SALT = new TextEncoder().encode('earthsphere-auth-v1')

async function getDeviceKey() {
  const fingerprint = [
    navigator.userAgent,
    screen.width, screen.height, screen.colorDepth,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')
  const km = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(fingerprint), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: APP_SALT, iterations: 10_000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  )
}

async function encrypt(plaintext) {
  const key = await getDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const out = new Uint8Array(12 + ct.byteLength)
  out.set(iv); out.set(new Uint8Array(ct), 12)
  return btoa(String.fromCharCode(...out))
}

async function decrypt(b64) {
  const key = await getDeviceKey()
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12))
  return new TextDecoder().decode(pt)
}

export const secureStorage = {
  getItem: async (name) => {
    const val = localStorage.getItem(name)
    if (!val) return null
    let plain
    try { plain = await decrypt(val) }
    catch { localStorage.removeItem(name); return null }
    // Drop payloads that aren't a JSON object — e.g. blobs written by an older
    // build that stored "[object Object]". Lets the store start clean instead of
    // throwing on JSON.parse forever.
    if (typeof plain !== 'string' || !plain.trimStart().startsWith('{')) {
      localStorage.removeItem(name)
      return null
    }
    return plain
  },
  setItem: async (name, value) => {
    localStorage.setItem(name, await encrypt(String(value)))
  },
  removeItem: (name) => localStorage.removeItem(name),
}
