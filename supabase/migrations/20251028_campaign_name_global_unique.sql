-- Feature: Global unique campaign names (case-insensitive)
-- Purpose: Enforce unique(lower(name)) across all users
-- References:
--  - Supabase: https://supabase.com/docs/guides/database/tables#indexes

create unique index if not exists campaigns_name_lower_unique
  on public.campaigns (lower(name));


