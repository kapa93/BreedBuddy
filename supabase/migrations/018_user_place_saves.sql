-- Saved places: users can save/follow any place in the places table.
-- Mirrors the user_breed_joins pattern already in the project.

CREATE TABLE user_place_saves (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id   UUID NOT NULL REFERENCES places(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, place_id)
);

CREATE INDEX idx_user_place_saves_user ON user_place_saves(user_id, created_at DESC);

ALTER TABLE user_place_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_place_saves_select_own"
  ON user_place_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_place_saves_insert_own"
  ON user_place_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_place_saves_delete_own"
  ON user_place_saves FOR DELETE
  USING (auth.uid() = user_id);
