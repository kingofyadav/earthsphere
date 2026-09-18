async function request(path, token, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  return res.json()
}

// POST is an idempotent upsert — creates the row on first sign-in, otherwise
// just returns the existing profile untouched.
export function upsertProfile(token, seed) {
  return request('/api/profile', token, { method: 'POST', body: JSON.stringify(seed) })
}

export function patchProfile(token, patch) {
  return request('/api/profile', token, { method: 'PATCH', body: JSON.stringify(patch) })
}
