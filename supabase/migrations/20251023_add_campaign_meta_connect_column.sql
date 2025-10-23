-- Add meta_connect_data jsonb column to campaign_states
begin;
alter table public.campaign_states
  add column if not exists meta_connect_data jsonb;
commit;


