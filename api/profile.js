import { getSql } from './_lib/db.js'
import { requireUserId } from './_lib/auth.js'

// Replaces the old localStorage/AES-GCM "auth" store — this is the single
// source of truth for a signed-in user's profile + app state (orbitHistory,
// permissions, verifications, recovery, relationships, assets, disclosure),
// keyed by the Clerk user id and persisted in Neon.
export default async function handler(req, res) {
  const userId = await requireUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getSql()

  if (req.method === 'POST') {
    // Idempotent upsert: creates the row on first sign-in, otherwise leaves
    // the existing profile untouched (touches updated_at only).
    const { email, name, phone = '', country = 'India', hdi } = req.body || {}
    if (!email || !name || !hdi) {
      return res.status(400).json({ error: 'email, name and hdi are required' })
    }
    const rows = await sql`
      INSERT INTO users (id, email, name, phone, country, hdi)
      VALUES (${userId}, ${email}, ${name}, ${phone}, ${country}, ${hdi})
      ON CONFLICT (id) DO UPDATE SET updated_at = now()
      RETURNING *
    `
    return res.status(200).json({ profile: toProfile(rows[0]) })
  }

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM users WHERE id = ${userId}`
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ profile: toProfile(rows[0]) })
  }

  if (req.method === 'PATCH') {
    const { appState, rpcBalance, rcAddress, phone, country } = req.body || {}
    const rows = await sql`
      UPDATE users SET
        app_state   = CASE WHEN ${appState != null}   THEN app_state || ${JSON.stringify(appState ?? {})}::jsonb ELSE app_state END,
        rpc_balance = COALESCE(${rpcBalance ?? null}, rpc_balance),
        rc_address  = CASE WHEN ${rcAddress !== undefined} THEN ${rcAddress ?? null} ELSE rc_address END,
        phone       = COALESCE(${phone ?? null}, phone),
        country     = COALESCE(${country ?? null}, country),
        updated_at  = now()
      WHERE id = ${userId}
      RETURNING *
    `
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ profile: toProfile(rows[0]) })
  }

  res.setHeader('Allow', 'GET, POST, PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
}

function toProfile(row) {
  const state = row.app_state || {}
  return {
    user: {
      name: row.name,
      email: row.email,
      phone: row.phone,
      country: row.country,
      hdi: row.hdi,
      rpcBalance: row.rpc_balance,
      rcAddress: row.rc_address,
      createdAt: new Date(row.created_at).getTime(),
    },
    orbitHistory: state.orbitHistory ?? [],
    permissions: state.permissions,
    verifications: state.verifications,
    recovery: state.recovery,
    relationships: state.relationships ?? [],
    assets: state.assets,
    disclosure: state.disclosure,
  }
}
