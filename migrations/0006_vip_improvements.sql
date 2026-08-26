-- migrations/0006_vip_improvements.sql
-- Add payment_method, customer_email, and performance indexes to vip_subscriptions

ALTER TABLE vip_subscriptions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE vip_subscriptions ADD COLUMN customer_email TEXT;

-- Backfill existing records
UPDATE vip_subscriptions 
SET payment_method = 'paypack' 
WHERE payment_method = 'manual' AND (momo_tx_id LIKE 'REBA_%' OR admin_notes LIKE '%Paypack%');

UPDATE vip_subscriptions 
SET payment_method = 'nowpayments' 
WHERE payment_method = 'manual' AND (momo_tx_id LIKE 'REBA_CARD_%' OR momo_tx_id LIKE 'NOWPAY_%' OR admin_notes LIKE '%NOWPayments%');

UPDATE vip_subscriptions 
SET payment_method = 'passcode' 
WHERE payment_method = 'manual' AND (admin_notes LIKE '%Passcode%' OR momo_tx_id LIKE 'PASS-%' OR momo_tx_id LIKE 'VOUCHER%');

-- Indexes for fast status lookups and analytics
CREATE INDEX IF NOT EXISTS idx_vip_sub_payment_method ON vip_subscriptions(payment_method);
CREATE INDEX IF NOT EXISTS idx_vip_sub_expires_at ON vip_subscriptions(expires_at);
