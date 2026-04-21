-- Fix Ocean Beach Dog Beach city: was incorrectly set to San Francisco, should be San Diego.
UPDATE places
SET city = 'San Diego', updated_at = NOW()
WHERE slug = 'ocean-beach-dog-beach';
