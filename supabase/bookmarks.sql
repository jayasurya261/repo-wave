-- Run this SQL in your Supabase SQL Editor
-- This script creates a 'bookmarks' table to allow users to favorite repositories.

-- Enable UUID extension if not already enabled (usually is by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- UUID from better-auth
    repo_id TEXT NOT NULL, -- The full_name of the repository (e.g. "freeCodeCamp/freeCodeCamp")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only bookmark a specific repo once
    UNIQUE(user_id, repo_id)
);

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Note: Since better-auth handles our authentication separately, and we are using the public anon key for our frontend supabase client without deep integration into Supabase Auth (auth.uid()), we have to create policies that we will manage via our API or custom claims.
-- However, for the frontend to be able to read/write bookmarks without a backend API proxy, we would either need a backend route or we use a looser policy and manage security via our API.

-- Policy 1: Allow anyone to insert (We will manage security via our Astro API endpoint instead of direct client queries to prevent abuse)
CREATE POLICY "Allow anon insert" 
ON public.bookmarks 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Policy 2: Allow anon to read
CREATE POLICY "Allow anon select" 
ON public.bookmarks 
FOR SELECT 
TO anon 
USING (true);

-- Policy 3: Allow anon delete
CREATE POLICY "Allow anon delete" 
ON public.bookmarks 
FOR DELETE 
TO anon 
USING (true);

-- Create an index to quickly look up a user's bookmarks
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks(user_id);
-- Create an index to quickly look up how many bookmarks a repo has
CREATE INDEX IF NOT EXISTS bookmarks_repo_id_idx ON public.bookmarks(repo_id);

-- ==========================================
-- ISSUE BOOKMARKS
-- ==========================================

-- Create the issue_bookmarks table
CREATE TABLE IF NOT EXISTS public.issue_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    issue_id TEXT NOT NULL, -- The format "full_name/issue_number" e.g "freeCodeCamp/freeCodeCamp/123"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, issue_id)
);

-- Enable Row Level Security
ALTER TABLE public.issue_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anon insert
CREATE POLICY "Allow anon insert on issue_bookmarks" 
ON public.issue_bookmarks 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Policy 2: Allow anon to read
CREATE POLICY "Allow anon select on issue_bookmarks" 
ON public.issue_bookmarks 
FOR SELECT 
TO anon 
USING (true);

-- Policy 3: Allow anon delete
CREATE POLICY "Allow anon delete on issue_bookmarks" 
ON public.issue_bookmarks 
FOR DELETE 
TO anon 
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS issue_bookmarks_user_id_idx ON public.issue_bookmarks(user_id);

-- ==========================================
-- REPO FAVOURITES (Heart icon on Repos)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.favourites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    repo_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, repo_id)
);
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert on favourites" ON public.favourites FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select on favourites" ON public.favourites FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon delete on favourites" ON public.favourites FOR DELETE TO anon USING (true);
CREATE INDEX IF NOT EXISTS favourites_user_id_idx ON public.favourites(user_id);

-- ==========================================
-- ISSUE FAVOURITES (Heart icon on Issues)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.issue_favourites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    issue_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, issue_id)
);
ALTER TABLE public.issue_favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert on issue_favourites" ON public.issue_favourites FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select on issue_favourites" ON public.issue_favourites FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon delete on issue_favourites" ON public.issue_favourites FOR DELETE TO anon USING (true);
CREATE INDEX IF NOT EXISTS issue_favourites_user_id_idx ON public.issue_favourites(user_id);
