-- User breed feed memberships (joined feeds)
CREATE TABLE user_breed_joins (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  breed breed_enum NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, breed)
);

CREATE INDEX idx_user_breed_joins_user_id ON user_breed_joins(user_id);

-- RLS
ALTER TABLE user_breed_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own joins"
  ON user_breed_joins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own joins"
  ON user_breed_joins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own joins"
  ON user_breed_joins FOR DELETE
  USING (auth.uid() = user_id);
