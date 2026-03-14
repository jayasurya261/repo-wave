-- SQL Migration for PR Contributions Feature

CREATE TABLE IF NOT EXISTS public.pr_contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    pr_url TEXT NOT NULL UNIQUE,
    repo_name TEXT NOT NULL,
    pr_title TEXT NOT NULL,
    pr_merged_at TIMESTAMPTZ NOT NULL,
    repo_stars INTEGER NOT NULL,
    additions INTEGER NOT NULL,
    deletions INTEGER NOT NULL,
    comments INTEGER NOT NULL,
    review_comments INTEGER NOT NULL,
    score NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for quick lookups by user (e.g., for profile page)
CREATE INDEX IF NOT EXISTS idx_pr_contributions_user_id ON public.pr_contributions(user_id);

-- RLS (Row Level Security) policies
ALTER TABLE public.pr_contributions ENABLE ROW LEVEL SECURITY;

-- Allow users to see all PR contributions (they are public on profiles)
CREATE POLICY "Public PR contributions are viewable by everyone."
ON public.pr_contributions FOR SELECT
USING (true);

-- Allow authenticated users to insert their own PR contributions
CREATE POLICY "Users can insert their own PR contributions."
ON public.pr_contributions FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Alternatively, if Supabase RLS isn't strictly tied to Better Auth "user" table in this project,
-- we might just want to disable RLS or allow all inserts since our API route validates it.
-- Let's keep it simple and disable RLS for now to avoid BetterAuth/Supabase Auth mismatch issues,
-- as Better Auth is used here, not Supabase Auth.
ALTER TABLE public.pr_contributions DISABLE ROW LEVEL SECURITY;
