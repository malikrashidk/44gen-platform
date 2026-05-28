alter table public.profiles add column if not exists polar_customer_id text;
alter table public.profiles add column if not exists polar_subscription_id text;
alter table public.profiles add column if not exists polar_subscription_status text;
alter table public.profiles add column if not exists billing_current_period_end timestamptz;
alter table public.profiles add column if not exists billing_updated_at timestamptz;

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'polar',
  event_type text not null,
  polar_event_id text,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_user_id_created_at_idx
  on public.billing_events(user_id, created_at desc);

create unique index if not exists billing_events_polar_event_id_idx
  on public.billing_events(polar_event_id)
  where polar_event_id is not null;

alter table public.billing_events enable row level security;

drop policy if exists "Users can read own billing events" on public.billing_events;
create policy "Users can read own billing events"
  on public.billing_events for select
  using (auth.uid() = user_id);
