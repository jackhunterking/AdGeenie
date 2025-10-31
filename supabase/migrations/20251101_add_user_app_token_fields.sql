begin;

alter table public.campaign_meta_connections
add column if not exists user_app_token text,
add column if not exists user_app_token_expires_at timestamptz,
add column if not exists user_app_connected boolean not null default false,
add column if not exists user_app_fb_user_id text;

comment on column public.campaign_meta_connections.user_app_token is 'Long-lived token from User App for payment operations';
comment on column public.campaign_meta_connections.user_app_token_expires_at is 'Expiration timestamp for user app token';
comment on column public.campaign_meta_connections.user_app_connected is 'Whether user app OAuth flow completed successfully';
comment on column public.campaign_meta_connections.user_app_fb_user_id is 'Facebook user ID from user app (may differ from system app user)';

commit;


