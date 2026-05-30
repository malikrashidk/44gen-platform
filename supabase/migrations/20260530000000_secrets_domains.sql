-- ============================================================
-- Migration: project_secrets + custom_domains
-- Run via: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── project_secrets ──────────────────────────────────────────
-- Stores AES-256-GCM encrypted user secrets per project.
-- The encryption key lives ONLY in the server .env — never in the DB.
-- The frontend NEVER receives encrypted_value — routes return key names only.

CREATE TABLE IF NOT EXISTS project_secrets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name          text NOT NULL,
  encrypted_value   text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, key_name)
);

CREATE INDEX IF NOT EXISTS project_secrets_project_id_idx ON project_secrets(project_id);
CREATE INDEX IF NOT EXISTS project_secrets_user_id_idx    ON project_secrets(user_id);

-- RLS: users can only see and manage secrets for projects they own
ALTER TABLE project_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "secrets_select_own" ON project_secrets;
DROP POLICY IF EXISTS "secrets_insert_own" ON project_secrets;
DROP POLICY IF EXISTS "secrets_update_own" ON project_secrets;
DROP POLICY IF EXISTS "secrets_delete_own" ON project_secrets;

CREATE POLICY "secrets_select_own"
  ON project_secrets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_secrets.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "secrets_insert_own"
  ON project_secrets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_secrets.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "secrets_update_own"
  ON project_secrets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_secrets.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "secrets_delete_own"
  ON project_secrets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_secrets.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ── custom_domains ───────────────────────────────────────────
-- Stores user-provided custom domains and their verification state.
-- Verification is done via DNS TXT record check.
-- Status flow: pending → verified → (optionally: error)

CREATE TABLE IF NOT EXISTS custom_domains (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain               text NOT NULL UNIQUE,
  subdomain            text NOT NULL,  -- the 44gen subdomain this maps to (app-xxxxxxxx)
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'error')),
  verification_token   text NOT NULL,
  verified_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_domains_project_id_idx ON custom_domains(project_id);
CREATE INDEX IF NOT EXISTS custom_domains_user_id_idx    ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS custom_domains_domain_idx     ON custom_domains(domain);

-- RLS: users can only see and manage their own domains
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "domains_select_own" ON custom_domains;
DROP POLICY IF EXISTS "domains_insert_own" ON custom_domains;
DROP POLICY IF EXISTS "domains_delete_own" ON custom_domains;

CREATE POLICY "domains_select_own"
  ON custom_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "domains_insert_own"
  ON custom_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "domains_delete_own"
  ON custom_domains FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- After running this migration, also add to .env:
--   SECRET_ENCRYPTION_KEY=<openssl rand -base64 32>
-- ============================================================
