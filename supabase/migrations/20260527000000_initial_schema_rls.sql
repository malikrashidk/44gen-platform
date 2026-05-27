-- 44Gen platform baseline schema and row-level security policies.
-- This migration documents the tables the app expects in Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free',
  credits numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled App',
  prompt text,
  status text not null default 'draft',
  subdomain text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_path text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (project_id, file_path)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null,
  content text not null,
  type text not null default 'message',
  credits_used numeric,
  tokens_used integer,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text,
  plan jsonb not null default '{}'::jsonb,
  credits_used numeric,
  tokens_used integer,
  created_at timestamptz not null default now()
);

create table if not exists public.build_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  progress jsonb not null default '[]'::jsonb,
  error text,
  subdomain text,
  credits_used numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  credits_before numeric,
  credits_used numeric not null default 0,
  credits_after numeric,
  tokens_used integer,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists project_files_project_id_idx on public.project_files(project_id);
create index if not exists conversations_project_id_created_at_idx on public.conversations(project_id, created_at);
create index if not exists build_jobs_project_id_created_at_idx on public.build_jobs(project_id, created_at desc);
create index if not exists build_jobs_user_id_status_idx on public.build_jobs(user_id, status);
create index if not exists plans_user_id_created_at_idx on public.plans(user_id, created_at desc);
create index if not exists credit_transactions_user_id_created_at_idx on public.credit_transactions(user_id, created_at desc);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    10
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.conversations enable row level security;
alter table public.plans enable row level security;
alter table public.build_jobs enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own projects" on public.projects;
create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own project files" on public.project_files;
create policy "Users can read own project files"
  on public.project_files for select
  using (exists (
    select 1 from public.projects
    where projects.id = project_files.project_id
      and projects.user_id = auth.uid()
  ));

drop policy if exists "Users can read own conversations" on public.conversations;
create policy "Users can read own conversations"
  on public.conversations for select
  using (exists (
    select 1 from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = auth.uid()
  ));

drop policy if exists "Users can create own conversations" on public.conversations;
create policy "Users can create own conversations"
  on public.conversations for insert
  with check (exists (
    select 1 from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = auth.uid()
  ));

drop policy if exists "Users can read own plans" on public.plans;
create policy "Users can read own plans"
  on public.plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own build jobs" on public.build_jobs;
create policy "Users can read own build jobs"
  on public.build_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own credit transactions" on public.credit_transactions;
create policy "Users can read own credit transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('user-images', 'user-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read user images" on storage.objects;
create policy "Public can read user images"
  on storage.objects for select
  using (bucket_id = 'user-images');

drop policy if exists "Users can upload own images" on storage.objects;
create policy "Users can upload own images"
  on storage.objects for insert
  with check (
    bucket_id = 'user-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
