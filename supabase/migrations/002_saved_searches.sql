-- Create saved_searches table for user-saved filter combinations
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user_id
CREATE INDEX saved_searches_user_id_idx ON saved_searches(user_id);

-- Optional: add constraint to prevent very long names
ALTER TABLE saved_searches ADD CONSTRAINT saved_searches_name_length CHECK (char_length(name) <= 100);
