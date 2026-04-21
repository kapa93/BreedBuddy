-- Add nullable place_id to posts for explicit place-linked posts.
-- place_id is ONLY set through structured flows (post from place page, or
-- explicit selection in the composer). Never inferred from text or GPS.

ALTER TABLE posts
  ADD COLUMN place_id UUID REFERENCES places(id) ON DELETE SET NULL;

-- Partial index for querying posts by place (the common case is place IS NOT NULL)
CREATE INDEX idx_posts_place_id
  ON posts(place_id)
  WHERE place_id IS NOT NULL;
