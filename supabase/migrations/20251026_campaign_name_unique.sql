-- Ensure unique campaign names per user (case-insensitive)
create unique index if not exists idx_campaigns_user_lower_name_unique
  on public.campaigns (user_id, lower(name));


