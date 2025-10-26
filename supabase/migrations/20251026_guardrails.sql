-- Creative guardrails storage
create table if not exists creative_plans (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  plan jsonb not null,
  status text not null default 'generated',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists creative_lint_reports (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references creative_plans(id) on delete cascade,
  variation_index int not null,
  report jsonb not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);


