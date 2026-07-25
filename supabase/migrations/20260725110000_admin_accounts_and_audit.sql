-- Per-user admin accounts (identity/passwords live in Supabase's own
-- auth.users), roles, and an audit trail of every admin mutation. Replaces
-- the single shared ADMIN_PASSWORD model. Admin-only — no public read
-- policies, same posture as the budget/intake tables.

create table if not exists public.admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('admin', 'editor', 'treasurer', 'viewer')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  admin_user_id   uuid references auth.users(id) on delete set null,
  admin_user_name text,
  table_name      text not null,
  row_id          uuid,
  action          text not null check (action in ('insert', 'update', 'delete')),
  before          jsonb,
  after           jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_log_table_row_idx on public.audit_log(table_name, row_id);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

alter table public.admin_profiles enable row level security;
alter table public.audit_log      enable row level security;
