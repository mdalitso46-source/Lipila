CREATE TABLE IF NOT EXISTS users (
  phone TEXT PRIMARY KEY,
  public_key TEXT NOT NULL UNIQUE,
  encrypted_secret TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otps (
  phone TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  sender_phone TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount TEXT NOT NULL,
  balance_id TEXT,
  recipient_public_key TEXT NOT NULL,
  encrypted_recipient_secret TEXT NOT NULL,
  status TEXT NOT NULL,
  tx_hash TEXT,
  claim_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS claims_recipient_idx ON claims (recipient_phone, status);
CREATE INDEX IF NOT EXISTS claims_sender_idx ON claims (sender_phone, created_at DESC);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  owner_phone TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount TEXT NOT NULL,
  direction TEXT NOT NULL,
  counterparty TEXT,
  tx_hash TEXT,
  claim_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_owner_idx ON activities (owner_phone, created_at DESC);

CREATE TABLE IF NOT EXISTS sponsor (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cashouts (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount TEXT NOT NULL,
  provider TEXT NOT NULL,
  anchor_tx_id TEXT,
  status TEXT NOT NULL,
  interactive_url TEXT,
  stellar_tx_hash TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cashouts_phone_idx ON cashouts (phone, created_at DESC);
