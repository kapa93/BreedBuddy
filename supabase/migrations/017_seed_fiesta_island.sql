-- Add Fiesta Island Dog Park

INSERT INTO places (
  name, slug, place_type,
  city, neighborhood,
  latitude, longitude,
  check_in_radius_meters, check_in_duration_minutes,
  supports_check_in, is_active
) VALUES (
  'Fiesta Island Dog Park', 'fiesta-island-dog-park', 'dog_park',
  'San Diego', 'Mission Bay',
  32.775786, -117.221551,
  400, 60,
  true, true
);
