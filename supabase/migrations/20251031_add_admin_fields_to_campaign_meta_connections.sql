--
-- Feature: Admin verification fields for Meta connection
-- Purpose: Persist single source of truth about admin verification status
-- References:
--  - Business assigned users: https://developers.facebook.com/docs/graph-api/reference/business/assigned_users/
--  - Ad Account users/roles: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
--  - Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
--

begin;

alter table if exists public.campaign_meta_connections
  add column if not exists admin_connected boolean not null default false,
  add column if not exists admin_checked_at timestamptz,
  add column if not exists admin_business_role text,
  add column if not exists admin_ad_account_role text;

comment on column public.campaign_meta_connections.admin_connected is 'Server-verified: user has admin/payment role on business and ad account';
comment on column public.campaign_meta_connections.admin_checked_at is 'Timestamp of last admin verification check';
comment on column public.campaign_meta_connections.admin_business_role is 'Role of the fb_user on the Business (e.g., ADMIN, FINANCE_EDITOR)';
comment on column public.campaign_meta_connections.admin_ad_account_role is 'Role on Ad Account (e.g., ADMIN, ACCOUNT_ADMIN, FINANCE_EDITOR)';

commit;


