-- Allow any authenticated user to read all community interests so the UI
-- can display interest counts and supporter avatars for pending communities.
-- The data exposed is minimal: place_id, user_id, created_at.
CREATE POLICY "Authenticated users can view all community interests"
  ON place_community_interests FOR SELECT
  USING (auth.role() = 'authenticated');
