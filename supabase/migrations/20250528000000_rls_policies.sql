-- ============================================================
-- FIX #2: Row Level Security policies for 44gen platform
-- Run via: Supabase Dashboard → SQL Editor, or supabase db push
-- ============================================================

-- ── Enable RLS on all user-data tables ──────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_jobs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;


-- ── profiles ────────────────────────────────────────────────
-- Users can only read/update their own profile.
-- Insert is handled by a trigger on auth.users (see below).

DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Server-side (service role) bypasses RLS — backend can always write.
-- The following policies only apply to anon/authenticated JWT callers.


-- ── projects ────────────────────────────────────────────────

DROP POLICY IF EXISTS "projects_select_own"  ON projects;
DROP POLICY IF EXISTS "projects_insert_own"  ON projects;
DROP POLICY IF EXISTS "projects_update_own"  ON projects;
DROP POLICY IF EXISTS "projects_delete_own"  ON projects;

CREATE POLICY "projects_select_own"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);


-- ── project_files ────────────────────────────────────────────
-- Access is via project ownership — join to projects table.

DROP POLICY IF EXISTS "project_files_select_own"  ON project_files;
DROP POLICY IF EXISTS "project_files_insert_own"  ON project_files;
DROP POLICY IF EXISTS "project_files_update_own"  ON project_files;
DROP POLICY IF EXISTS "project_files_delete_own"  ON project_files;

CREATE POLICY "project_files_select_own"
  ON project_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "project_files_insert_own"
  ON project_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "project_files_update_own"
  ON project_files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "project_files_delete_own"
  ON project_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ── build_jobs ───────────────────────────────────────────────

DROP POLICY IF EXISTS "build_jobs_select_own"  ON build_jobs;

-- build_jobs are written by the server (service role), read by the owning user.
CREATE POLICY "build_jobs_select_own"
  ON build_jobs FOR SELECT
  USING (auth.uid() = user_id);


-- ── conversations ────────────────────────────────────────────

DROP POLICY IF EXISTS "conversations_select_own"  ON conversations;
DROP POLICY IF EXISTS "conversations_insert_own"  ON conversations;

CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = conversations.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = conversations.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ── plans ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "plans_select_own"  ON plans;

CREATE POLICY "plans_select_own"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = plans.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ── credit_transactions ──────────────────────────────────────

DROP POLICY IF EXISTS "credit_transactions_select_own"  ON credit_transactions;

CREATE POLICY "credit_transactions_select_own"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);


-- ── github_connections ───────────────────────────────────────

DROP POLICY IF EXISTS "github_connections_select_own"  ON github_connections;
DROP POLICY IF EXISTS "github_connections_delete_own"  ON github_connections;

CREATE POLICY "github_connections_select_own"
  ON github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "github_connections_delete_own"
  ON github_connections FOR DELETE
  USING (auth.uid() = user_id);


-- ── Auto-create profile on signup (if not already present) ──
-- This trigger ensures every new auth.users row gets a matching profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, credits, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    10,  -- starting credits for Free plan
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- IMPORTANT: The backend uses SUPABASE_SECRET_KEY (service role)
-- which bypasses RLS entirely — this is correct and intentional.
-- These policies protect direct anon-key calls from the frontend.
-- ============================================================
