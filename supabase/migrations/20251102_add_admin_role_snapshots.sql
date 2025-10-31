--
-- Feature: Admin role/raw snapshots on connect
-- Purpose: Persist raw JSON from Business and Ad Account role lookups
-- References:
--  - Business assigned users: https://developers.facebook.com/docs/graph-api/reference/business/assigned_users/
--  - Ad Account users/roles: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
--  - Supabase JSONB: https://supabase.com/docs/guides/database/json
--

begin;

alter table if exists public.campaign_meta_connections
  add column if not exists admin_business_users_json jsonb,
  add column if not exists admin_ad_account_users_json jsonb,
  add column if not exists admin_business_raw_json jsonb,
  add column if not exists admin_ad_account_raw_json jsonb;

comment on column public.campaign_meta_connections.admin_business_users_json is 'Raw list of business users/roles fetched during admin snapshot (server-only)';
comment on column public.campaign_meta_connections.admin_ad_account_users_json is 'Raw list of ad account users with tasks fetched during admin snapshot (server-only)';
comment on column public.campaign_meta_connections.admin_business_raw_json is 'Optional raw business detail payload captured during snapshot (server-only)';
comment on column public.campaign_meta_connections.admin_ad_account_raw_json is 'Optional raw ad account detail payload captured during snapshot (server-only)';

commit;


