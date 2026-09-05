-- MarketPulse Database Schema
-- Run via: npm run migrate

-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sessions: identifies a browser (no login required)
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlist: each user's watched stocks
CREATE TABLE IF NOT EXISTS watchlist (
  id          SERIAL PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  symbol      VARCHAR(10) NOT NULL,
  company_name VARCHAR(255),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, symbol)
);

-- Market cache: shared across all sessions, keyed by symbol
-- Prevents hammering the external API
CREATE TABLE IF NOT EXISTS market_cache (
  symbol      VARCHAR(10) PRIMARY KEY,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots: per-user, per-symbol price at time of last visit
-- Used for "What Changed?" diff computation
CREATE TABLE IF NOT EXISTS snapshots (
  id             SERIAL PRIMARY KEY,
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  symbol         VARCHAR(10) NOT NULL,
  price          NUMERIC(12, 4),
  volume         BIGINT,
  change_pct     NUMERIC(8, 4),
  previous_close NUMERIC(12, 4),
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, symbol)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_watchlist_session ON watchlist(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_session_symbol ON snapshots(session_id, symbol);
CREATE INDEX IF NOT EXISTS idx_market_cache_fetched ON market_cache(fetched_at);
