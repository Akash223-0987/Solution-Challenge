-- AetherLog: Add Gati Shakti freight train columns to shipments table
-- Run this in your Supabase Dashboard → SQL Editor

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS train_number    TEXT,
  ADD COLUMN IF NOT EXISTS train_name      TEXT,
  ADD COLUMN IF NOT EXISTS train_operator  TEXT,
  ADD COLUMN IF NOT EXISTS commodity_type  TEXT,
  ADD COLUMN IF NOT EXISTS avg_speed_kmh   INTEGER,
  ADD COLUMN IF NOT EXISTS wagon_type      TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'shipments'
ORDER BY ordinal_position;
