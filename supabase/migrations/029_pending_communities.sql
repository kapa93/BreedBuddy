-- Add a status column to places so communities can live in a pending/forming state
-- before being activated by admins. Existing rows all carry is_active = true,
-- so they are correctly back-filled to 'active' by the column default.
ALTER TABLE places
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending'));

-- Interest / support table — lets users express interest in a pending community.
-- Duplicate interest from the same user on the same place is prevented by the
-- unique constraint, which the application resolves gracefully.
CREATE TABLE place_community_interests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    UUID        NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(place_id, user_id)
);

ALTER TABLE place_community_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own community interests"
  ON place_community_interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own community interests"
  ON place_community_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own community interests"
  ON place_community_interests FOR DELETE
  USING (auth.uid() = user_id);
