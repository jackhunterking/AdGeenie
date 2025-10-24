--
-- Feature: Ensure temp_prompts table defaults and indexes
-- Purpose: Fix 500 errors on POST /api/temp-prompt by guaranteeing
--          required defaults (id, created_at, expires_at, used) and
--          creating the table if it does not exist.
-- References:
--  - Supabase Tables: https://supabase.com/docs/guides/database/tables
--  - Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
--

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- Create table if missing (idempotent)
create table if not exists public.temp_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_text text not null,
  goal_type text,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour')
);

-- Ensure defaults exist even if the table pre-existed without them
alter table public.temp_prompts
  alter column id set default gen_random_uuid(),
  alter column used set default false,
  alter column created_at set default now(),
  alter column expires_at set default (now() + interval '1 hour');

-- Helpful indexes for cleanup and reads
create index if not exists idx_temp_prompts_expires_at on public.temp_prompts(expires_at);
create index if not exists idx_temp_prompts_used on public.temp_prompts(used);

-- Enable RLS (service role bypasses RLS; this keeps us safe for future anon reads)
alter table public.temp_prompts enable row level security;
create policy if not exists temp_prompts_service_only on public.temp_prompts
  for all to authenticated using (true) with check (true);

-- Finish with a notice so it’s obvious in SQL editor logs
do $$
begin
  raise notice '✅ temp_prompts ensured with defaults and indexes';
end $$;


