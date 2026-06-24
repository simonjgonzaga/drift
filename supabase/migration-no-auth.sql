-- Drift — switch to single-user mode (no auth, RLS off).
-- Run this in the Supabase SQL Editor AFTER the initial migration.sql.
-- Idempotent: safe to re-run.

-- 1. Disable Row Level Security on all tables.
--    With RLS off, any request bearing the anon key has full access. For a
--    single-user PWA on a non-public URL, the URL itself is the secret.
alter table public.habits        disable row level security;
alter table public.completions   disable row level security;
alter table public.closed_days   disable row level security;

-- 2. Drop the per-user policies (no longer relevant)
drop policy if exists "habits_owner_all"      on public.habits;
drop policy if exists "completions_owner_all" on public.completions;
drop policy if exists "closed_days_owner_all" on public.closed_days;

-- 3. Drop foreign keys to auth.users so we're no longer tied to any session
alter table public.habits        drop constraint if exists habits_user_id_fkey;
alter table public.completions   drop constraint if exists completions_user_id_fkey;
alter table public.closed_days   drop constraint if exists closed_days_user_id_fkey;

-- 4. Default user_id to a fixed UUID so the client never has to supply it.
--    Keeping the column (rather than dropping it) means existing unique
--    constraints and primary keys keep working: every row shares the same
--    user_id, so (user_id, habit_id, completed_at) effectively reduces to
--    (habit_id, completed_at), and (user_id, day) reduces to (day).
alter table public.habits        alter column user_id set default '00000000-0000-0000-0000-000000000000';
alter table public.completions   alter column user_id set default '00000000-0000-0000-0000-000000000000';
alter table public.closed_days   alter column user_id set default '00000000-0000-0000-0000-000000000000';

-- 5. Migrate existing rows (written under your old anonymous user UUID)
--    to the fixed UUID so the unique constraints don't fight new inserts.
update public.habits        set user_id = '00000000-0000-0000-0000-000000000000';
update public.completions   set user_id = '00000000-0000-0000-0000-000000000000';
update public.closed_days   set user_id = '00000000-0000-0000-0000-000000000000';
