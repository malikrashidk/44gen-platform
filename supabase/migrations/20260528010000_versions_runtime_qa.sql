create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  build_job_id uuid references public.build_jobs(id) on delete set null,
  version_number integer not null,
  source_files jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  subdomain text,
  credits_used numeric,
  tokens_used integer,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create table if not exists public.runtime_qa_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'completed',
  url text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_versions_project_id_version_idx
  on public.project_versions(project_id, version_number desc);

create index if not exists runtime_qa_runs_project_id_created_at_idx
  on public.runtime_qa_runs(project_id, created_at desc);

alter table public.project_versions enable row level security;
alter table public.runtime_qa_runs enable row level security;

drop policy if exists "Users can read own project versions" on public.project_versions;
create policy "Users can read own project versions"
  on public.project_versions for select
  using (exists (
    select 1 from public.projects
    where projects.id = project_versions.project_id
      and projects.user_id = auth.uid()
  ));

drop policy if exists "Users can read own runtime QA runs" on public.runtime_qa_runs;
create policy "Users can read own runtime QA runs"
  on public.runtime_qa_runs for select
  using (auth.uid() = user_id);
