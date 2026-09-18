// One-off schema apply against the direct (non-pooled) connection.
// Usage: node db/migrate.js
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set')

const sql = neon(url)
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

const statements = schema.split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean)
for (const stmt of statements) {
  await sql.query(stmt)
}
console.log(`Applied ${statements.length} statement(s) from schema.sql`)
