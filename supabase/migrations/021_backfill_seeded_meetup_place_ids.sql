-- Backfill place_id for seeded meetup posts only (is_recurring_seeded = TRUE).
-- Safe to run: only touches rows where is_recurring_seeded = TRUE AND place_id IS NULL.
--
-- 'OB Dog Beach' and 'Dog Beach' were the two location_name values inferred by
-- the seeding script for Ocean Beach Dog Beach posts.
-- 'Fiesta Island' was the inferred value for Fiesta Island Dog Park posts.

UPDATE meetup_details
SET place_id  = (SELECT id FROM places WHERE slug = 'ocean-beach-dog-beach'),
    updated_at = NOW()
WHERE is_recurring_seeded = TRUE
  AND location_name IN ('OB Dog Beach', 'Dog Beach')
  AND place_id IS NULL;

UPDATE meetup_details
SET place_id  = (SELECT id FROM places WHERE slug = 'fiesta-island-dog-park'),
    updated_at = NOW()
WHERE is_recurring_seeded = TRUE
  AND location_name = 'Fiesta Island'
  AND place_id IS NULL;
