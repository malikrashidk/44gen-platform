-- Migration: publish/update flow columns on projects
-- Run in Supabase SQL Editor

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS latest_release   integer,
  ADD COLUMN IF NOT EXISTS published_release integer,
  ADD COLUMN IF NOT EXISTS built_at         timestamptz;

-- Nginx needs to serve from the releases/current symlink
-- On your server, update nginx config to serve from:
--   /var/www/44gen/users/app-{id}/current/
-- instead of:
--   /var/www/44gen/users/app-{id}/dist/
--
-- For existing deployed apps, create the initial release structure:
-- mkdir -p /var/www/44gen/users/app-{id}/releases/1
-- mv /var/www/44gen/users/app-{id}/dist /var/www/44gen/users/app-{id}/releases/1/dist
-- ln -s /var/www/44gen/users/app-{id}/releases/1/dist /var/www/44gen/users/app-{id}/current
