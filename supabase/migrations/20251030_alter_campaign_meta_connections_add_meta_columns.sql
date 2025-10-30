--
-- Feature: Campaign Meta Connections (add missing columns)
-- Purpose: Align DB schema with server upsert fields for Meta connect
-- References:
--  - Supabase SQL: https://supabase.com/docs/guides/database
--  - RLS Policies: https://supabase.com/docs/guides/auth/row-level-security

begin;

alter table public.campaign_meta_connections
  add column if not exists selected_business_id text,
  add column if not exists selected_business_name text,
  add column if not exists ad_account_payment_connected boolean not null default false;

commit;


