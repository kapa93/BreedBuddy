-- Add nullable place_id to meetup_details so meetups can be linked to a place.
-- No backfill: existing location_name is free-form user text and cannot be
-- safely matched to a structured place record.

ALTER TABLE meetup_details
  ADD COLUMN place_id UUID REFERENCES places(id) ON DELETE SET NULL;

CREATE INDEX idx_meetup_details_place
  ON meetup_details(place_id)
  WHERE place_id IS NOT NULL;
