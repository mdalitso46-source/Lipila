CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  area TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_phone_idx ON feedback (phone, created_at DESC);
