-- Stores connected GitHub accounts for one-click project export.

create table if not exists public.github_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  github_login text not null,
  github_name text,
  avatar_url text,
  access_token_encrypted text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.github_connections enable row level security;

drop policy if exists "Users can read own GitHub connection" on public.github_connections;
create policy "Users can read own GitHub connection"
  on public.github_connections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own GitHub connection" on public.github_connections;
create policy "Users can delete own GitHub connection"
  on public.github_connections for delete
  using (auth.uid() = user_id);
