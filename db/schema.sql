-- EarthSphere user data — Neon Postgres.
-- Run once against DATABASE_URL_UNPOOLED (direct connection) via:
--   node db/migrate.js

CREATE TABLE IF NOT EXISTS users (
  id          text PRIMARY KEY,             -- Clerk user id (sub claim)
  email       text NOT NULL,
  name        text NOT NULL,
  phone       text NOT NULL DEFAULT '',
  country     text NOT NULL DEFAULT 'India',
  hdi         text NOT NULL,
  rpc_balance integer NOT NULL DEFAULT 1000,
  rc_address  text,
  -- orbitHistory, permissions, verifications, recovery, relationships,
  -- assets, disclosure — the same slice the old localStorage persist wrote.
  app_state   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
