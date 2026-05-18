-- Performance indexes for search and sort queries
-- This migration adds indexes to improve query performance on common operations

-- Enable pg_trgm for ILIKE full-text-style search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for ILIKE full-text-style search (replaces sequential scans)
CREATE INDEX IF NOT EXISTS repos_name_trgm_idx ON repos USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS issues_title_trgm_idx ON issues USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS issues_repo_id_trgm_idx ON issues USING gin(repo_id gin_trgm_ops);

-- BTree indexes for sort and filter operations
CREATE INDEX IF NOT EXISTS repos_stars_idx ON repos(stars DESC);
CREATE INDEX IF NOT EXISTS repos_health_score_idx ON repos(health_score DESC);
CREATE INDEX IF NOT EXISTS repos_language_idx ON repos(language);
CREATE INDEX IF NOT EXISTS repos_created_at_idx ON repos(created_at DESC);
CREATE INDEX IF NOT EXISTS issues_created_at_idx ON issues(created_at DESC);
CREATE INDEX IF NOT EXISTS issues_difficulty_score_idx ON issues(difficulty_score);
