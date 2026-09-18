import { neon } from '@neondatabase/serverless'

// Lazy singleton — a top-level neon() call would throw at cold-start if
// DATABASE_URL isn't set yet (e.g. before the Marketplace env vars propagate).
let _sql = null

export function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL)
  return _sql
}
