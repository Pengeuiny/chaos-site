-- Budget management: per-show/overhead/trip line items, an actuals ledger,
-- and revenue tracking, grouped into yearly "seasons" so history rolls
-- forward instead of overwriting itself. See docs/theater-budget.md for the
-- framework this implements. Admin-only — no public read policies, since
-- this is real financial data (same posture as ticket_reservations /
-- volunteers).

create table if not exists public.budget_seasons (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  start_date                  date,
  end_date                    date,
  is_active                   boolean not null default false,
  overhead_allocation_method  text not null default 'percent_of_direct'
                                check (overhead_allocation_method in ('equal', 'percent_of_direct', 'participants')),
  contingency_default_percent numeric not null default 12.5,
  dual_signature_threshold    numeric not null default 250,
  reserve_target_months       numeric not null default 3,
  current_reserve_balance     numeric,
  created_at                  timestamptz not null default now()
);

create table if not exists public.budget_line_items (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references public.budget_seasons(id) on delete cascade,
  production_id    uuid references public.productions(id) on delete cascade,
  scope            text not null check (scope in ('show', 'overhead', 'trip')),
  category         text not null,
  description      text,
  budgeted_amount  numeric not null default 0,
  is_contingency   boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists budget_line_items_season_idx on public.budget_line_items(season_id);
create index if not exists budget_line_items_production_idx on public.budget_line_items(production_id);

create table if not exists public.budget_expenses (
  id            uuid primary key default gen_random_uuid(),
  line_item_id  uuid not null references public.budget_line_items(id) on delete cascade,
  amount        numeric not null,
  status        text not null default 'committed' check (status in ('committed', 'paid')),
  vendor        text,
  description   text,
  expense_date  date not null default current_date,
  approved_by   text,
  created_at    timestamptz not null default now()
);
create index if not exists budget_expenses_line_item_idx on public.budget_expenses(line_item_id);

create table if not exists public.budget_revenue_lines (
  id                uuid primary key default gen_random_uuid(),
  season_id         uuid not null references public.budget_seasons(id) on delete cascade,
  production_id     uuid references public.productions(id) on delete cascade,
  source_type       text not null check (source_type in
                       ('tickets', 'concessions', 'program_ads', 'merch', 'donations', 'sponsorships', 'grants', 'fundraisers', 'other')),
  projected_amount  numeric not null default 0,
  actual_amount     numeric,
  notes             text,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists budget_revenue_season_idx on public.budget_revenue_lines(season_id);

alter table public.budget_seasons       enable row level security;
alter table public.budget_line_items    enable row level security;
alter table public.budget_expenses      enable row level security;
alter table public.budget_revenue_lines enable row level security;
