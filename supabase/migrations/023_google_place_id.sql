-- Track Google Places imports so server-side upserts stay idempotent.

ALTER TABLE places
  ADD COLUMN google_place_id TEXT,
  ADD CONSTRAINT places_google_place_id_key UNIQUE (google_place_id);
