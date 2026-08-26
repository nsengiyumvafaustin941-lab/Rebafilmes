-- migrations/0005_vip_subscriptions.sql
-- Server-side VIP Subscriptions & MoMo Payment Engine

CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  phone         TEXT NOT NULL,
  momo_tx_id    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  amount        INTEGER NOT NULL DEFAULT 1000,
  plan          TEXT NOT NULL DEFAULT 'vip',
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  expires_at    TEXT,
  admin_notes   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vip_sub_user_id ON vip_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_sub_phone ON vip_subscriptions(phone);
CREATE INDEX IF NOT EXISTS idx_vip_sub_tx_id ON vip_subscriptions(momo_tx_id);
CREATE INDEX IF NOT EXISTS idx_vip_sub_status ON vip_subscriptions(status);
