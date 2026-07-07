const PBKDF2_ITERATIONS = 100_000

export async function hashPassword(password) {
  const enc = new TextEncoder()
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    km, 256
  )
  return `pbkdf2:${toHex(salt)}:${toHex(new Uint8Array(bits))}`
}

export async function verifyPassword(password, stored) {
  if (!stored?.startsWith('pbkdf2:')) return false
  const [, saltHex, storedHash] = stored.split(':')
  const enc = new TextEncoder()
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    km, 256
  )
  return toHex(new Uint8Array(bits)) === storedHash
}

function toHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
}
function fromHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)))
}
