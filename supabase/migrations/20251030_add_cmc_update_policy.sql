--
-- Feature: Add UPDATE policy for campaign_meta_connections
-- Purpose: Ensure owners can update their campaign connection row under RLS
-- References:
--  - Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
--  - Policies: https://supabase.com/docs/guides/database/postgres/row-level-security
--

begin;

-- Enable RLS just in case (no-op if already enabled)
alter table if exists public.campaign_meta_connections enable row level security;

-- Policy: Owner can update their own connection row
drop policy if exists "cmc_update_owner" on public.campaign_meta_connections;
create policy "cmc_update_owner" on public.campaign_meta_connections
  for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_meta_connections.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_meta_connections.campaign_id
        and c.user_id = auth.uid()
    )
  );

commit;


