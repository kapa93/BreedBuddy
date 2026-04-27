-- Store up to 3 Google photo reference names per place.
-- References are proxied through the google-places edge function (?action=photo&name=...).

ALTER TABLE places
  ADD COLUMN photos TEXT[] NOT NULL DEFAULT '{}';
