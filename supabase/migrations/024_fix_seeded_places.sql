-- Fix seeded places: set google_place_id and correct Ocean Beach Dog Beach coordinates
-- (original seed had SF coordinates by mistake)

UPDATE places
SET
  google_place_id = 'ChIJObYoTc6r3oARWZ3Y1mYb43k',
  latitude        = 32.7577,
  longitude       = -117.2523
WHERE slug = 'ocean-beach-dog-beach';

UPDATE places
SET google_place_id = 'ChIJ400DJH2q3oARb1bi_5oqoUA'
WHERE slug = 'fiesta-island-dog-park';
