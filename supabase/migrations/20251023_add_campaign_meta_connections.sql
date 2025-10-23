--
-- Feature: Campaign Meta Connections
-- Purpose: Store per-campaign Meta (Facebook/Instagram) connection, tokens, and selected assets
-- References:
--  - Meta Permissions: https://developers.facebook.com/docs/permissions/reference
--  - Marketing API Access: https://developers.facebook.com/docs/marketing-api/access
--  - Page Access Tokens: https://developers.facebook.com/docs/pages/access-tokens/
--

begin;

create table if not exists public.campaign_meta_connections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id),

  fb_user_id text,
  long_lived_user_token text,
  token_expires_at timestamptz,

  selected_page_id text,
  selected_page_name text,
  selected_page_access_token text,

  selected_ig_user_id text,
  selected_ig_username text,

  selected_ad_account_id text,
  selected_ad_account_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campaign_meta_connections_campaign_id_key
  on public.campaign_meta_connections(campaign_id);

-- RLS
alter table public.campaign_meta_connections enable row level security;

-- Policies: Only the owner of the campaign may access
drop policy if exists "cmc_select_owner" on public.campaign_meta_connections;
create policy "cmc_select_owner" on public.campaign_meta_connections
  for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_meta_connections.campaign_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "cmc_insert_owner" on public.campaign_meta_connections;
create policy "cmc_insert_owner" on public.campaign_meta_connections
  for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_meta_connections.campaign_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "cmc_update_owner" on public.campaign_meta_connections;
create policy "cmc_update_owner" on public.campaign_meta_connections
  for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_meta_connections.campaign_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "cmc_delete_owner" on public.campaign_meta_connections;
create policy "cmc_delete_owner" on public.campaign_meta_connections
  for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_meta_connections.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists campaign_meta_connections_set_updated_at on public.campaign_meta_connections;
create trigger campaign_meta_connections_set_updated_at
before update on public.campaign_meta_connections
for each row execute function public.set_updated_at();

commit;


