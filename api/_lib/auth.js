import { verifyToken } from '@clerk/backend'

// Verifies the Clerk session token sent as `Authorization: Bearer <token>`.
// Returns the Clerk user id (JWT `sub`), or null if missing/invalid.
export async function requireUserId(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    return payload.sub
  } catch {
    return null
  }
}
