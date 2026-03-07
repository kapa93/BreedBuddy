-- Allow multiple dogs per user (remove one-dog-per-user constraint)
ALTER TABLE dogs DROP CONSTRAINT IF EXISTS dogs_owner_id_key;

-- Index for efficient lookups by owner (replaces unique index)
CREATE INDEX IF NOT EXISTS idx_dogs_owner_id ON dogs(owner_id);
