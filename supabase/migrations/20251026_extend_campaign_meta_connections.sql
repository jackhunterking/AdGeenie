--
-- Feature: Extend Campaign Meta Connections for Business & Payment
-- Purpose: Add selected_business_* and ad_account_payment_connected fields
-- References:
--  - Business Manager: https://developers.facebook.com/docs/marketing-api/businessmanager
--  - Payments UI: https://developers.facebook.com/docs/javascript/reference/FB.ui/
--

begin;

alter table if exists public.campaign_meta_connections
  add column if not exists selected_business_id text,
  add column if not exists selected_business_name text,
  add column if not exists ad_account_payment_connected boolean not null default false;

comment on column public.campaign_meta_connections.selected_business_id is 'Chosen Business Manager ID used to scope pages/ad accounts.';
comment on column public.campaign_meta_connections.selected_business_name is 'Human-readable Business name.';
comment on column public.campaign_meta_connections.ad_account_payment_connected is 'Whether a payment method was connected for the selected ad account.';

commit;


