-- Track positive real-world dog meetups without turning them into a social graph

CREATE TABLE dog_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id_1 UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  dog_id_2 UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_name TEXT,
  source_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dog_interactions_canonical_order CHECK (dog_id_1 < dog_id_2),
  CONSTRAINT dog_interactions_distinct_dogs CHECK (dog_id_1 <> dog_id_2),
  CONSTRAINT dog_interactions_source_type_valid CHECK (
    source_type IS NULL OR source_type IN ('dog_beach', 'meetup', 'manual')
  )
);

CREATE INDEX idx_dog_interactions_dog_id_1 ON dog_interactions(dog_id_1);
CREATE INDEX idx_dog_interactions_dog_id_2 ON dog_interactions(dog_id_2);
CREATE INDEX idx_dog_interactions_pair_created_at
  ON dog_interactions(dog_id_1, dog_id_2, created_at DESC);

ALTER TABLE dog_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dog_interactions_select_visible"
  ON dog_interactions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM dogs d1
      WHERE d1.id = dog_id_1
    )
    AND EXISTS (
      SELECT 1
      FROM dogs d2
      WHERE d2.id = dog_id_2
    )
  );

CREATE POLICY "dog_interactions_insert_own"
  ON dog_interactions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND dog_id_1 < dog_id_2
    AND EXISTS (
      SELECT 1
      FROM dogs d
      WHERE d.id IN (dog_id_1, dog_id_2)
        AND d.owner_id = auth.uid()
    )
  );
