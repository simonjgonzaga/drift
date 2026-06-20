-- Drift — initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
-- Idempotent: safe to re-run.

-- ──────── Tables ────────

create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  emoji         text,
  category      text,
  cadence       text default 'daily',         -- 'daily' | 'weekly' | 'monthly'
  freq          integer,                       -- times per week (when cadence = 'weekly')
  day_of_month  integer,                       -- 1-31 (when cadence = 'monthly')
  month_goal    integer,                       -- target completions per calendar month
  time_tag      text,                          -- 'AM' | 'PM' | 'EVE' | 'WE' | 'Others'
  note          text,
  sort_order    integer default 0,
  created_at    timestamptz default now(),
  archived_at   timestamptz                    -- null = active; soft-delete via archive
);

create index if not exists habits_user_active_idx
  on public.habits (user_id, sort_order)
  where archived_at is null;

create table if not exists public.completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  habit_id      uuid not null references public.habits(id) on delete cascade,
  completed_at  date not null,                 -- the day the habit was completed
  status        text default 'done',           -- 'done' (room for 'skipped' / 'partial' later)
  created_at    timestamptz default now(),
  unique (user_id, habit_id, completed_at)     -- one row per habit per day
);

create index if not exists completions_user_date_idx
  on public.completions (user_id, completed_at desc);

create index if not exists completions_user_habit_date_idx
  on public.completions (user_id, habit_id, completed_at desc);

create table if not exists public.closed_days (
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  closed_at     timestamptz default now(),
  primary key (user_id, day)
);

-- ──────── Row Level Security ────────
-- Every table is locked down: a row is only readable/writable by the user that owns it.
-- The Supabase JS client signs requests with the logged-in user's JWT; auth.uid() resolves
-- to that user's id. Without a session, no rows are returned and no writes succeed.

alter table public.habits        enable row level security;
alter table public.completions   enable row level security;
alter table public.closed_days   enable row level security;

drop policy if exists "habits_owner_all"      on public.habits;
drop policy if exists "completions_owner_all" on public.completions;
drop policy if exists "closed_days_owner_all" on public.closed_days;

create policy "habits_owner_all" on public.habits
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "completions_owner_all" on public.completions
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "closed_days_owner_all" on public.closed_days
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
