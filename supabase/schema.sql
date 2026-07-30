-- CHS CHAOS — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query),
-- or via the Supabase CLI: `supabase db push`.
--
-- Design notes:
--   * Public content (productions, showtimes, cast, people) is world-readable.
--   * Intake tables (ticket reservations, volunteer signups) accept public
--     INSERTs but are NOT publicly readable — only the service role / admins
--     can read submissions. This keeps personal info private under RLS.

-- ---------------------------------------------------------------------------
-- Content: season productions
-- ---------------------------------------------------------------------------
create table if not exists public.productions (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  program       text not null default 'theatre'
                  check (program in ('theatre', 'choir')),  -- theatre vs choir
  title         text not null,
  title_note    boolean not null default false,   -- placeholder title flag
  type          text,                              -- "Mainstage Musical", etc.
  poster_url    text,
  accent        text,                              -- hex accent color
  venue         text,
  address       text,
  tagline       text,
  synopsis      text,
  ticket_url    text,
  starts_on     date,                              -- required unless dates_tbd
  ends_on       date,
  dates_tbd     boolean not null default false,    -- opt-in: no real dates yet
  date_range    text,                              -- free-text label, used only when dates_tbd
  has_microsite boolean not null default false,
  cast_is_sample boolean not null default false,   -- show "sample cast" note
  is_performance boolean not null default true,    -- false for fundraisers/festivals/community events —
                                                    -- still shows on the calendar, excluded from "Now
                                                    -- Showing" and "This Season's Shows"

  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.showtimes (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  starts_at     timestamptz,                       -- required unless starts_tbd
  starts_tbd    boolean not null default false,    -- opt-in: no real date/time yet
  label         text,                              -- also doubles as the display text when starts_tbd
  ticket_url    text,                              -- deep-link straight to this date's checkout
  sort_order    int not null default 0
);
create index if not exists showtimes_production_idx on public.showtimes(production_id);

create table if not exists public.cast_members (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  role          text not null,
  actor         text,
  is_lead       boolean not null default false,
  sort_order    int not null default 0
);
create index if not exists cast_production_idx on public.cast_members(production_id);

-- ---------------------------------------------------------------------------
-- Content: people (booster board + student ITS officers)
-- ---------------------------------------------------------------------------
create table if not exists public.people (
  id          uuid primary key default gen_random_uuid(),
  group_name  text not null,        -- 'board' | 'its'
  role        text not null,
  name        text not null,
  email       text,
  image_url   text,
  sort_order  int not null default 0
);
create index if not exists people_group_idx on public.people(group_name);

-- ---------------------------------------------------------------------------
-- Budget management (admin-only — not publicly readable; see RLS below)
-- ---------------------------------------------------------------------------
create table if not exists public.budget_seasons (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,                 -- e.g. "2026-27"
  start_date                  date,
  end_date                    date,
  is_active                   boolean not null default false,
  overhead_allocation_method  text not null default 'percent_of_direct'
                                check (overhead_allocation_method in ('equal', 'percent_of_direct', 'participants')),
  contingency_default_percent numeric not null default 12.5,   -- doc: 10-15% standard
  dual_signature_threshold    numeric not null default 250,
  reserve_target_months       numeric not null default 3,
  current_reserve_balance     numeric,                          -- manually entered; we can't read a bank account
  status                      text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at                 timestamptz,
  approved_by                 text,
  created_at                  timestamptz not null default now()
);

-- Reusable, global category list for budget line items (e.g. "Royalties",
-- "Costumes") so the same name is spelled consistently across every show
-- and season instead of free-typed each time.
create table if not exists public.budget_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create unique index if not exists budget_categories_name_lower_idx on public.budget_categories (lower(name));

create table if not exists public.budget_line_items (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references public.budget_seasons(id) on delete cascade,
  production_id    uuid references public.productions(id) on delete cascade,  -- null for overhead/trip lines
  scope            text not null check (scope in ('show', 'overhead', 'trip')),
  category         text not null,      -- denormalized category name, kept in sync with category_id
  category_id      uuid references public.budget_categories(id) on delete set null,
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
  approved_by   text,               -- free-text name; accountability, not an enforced sign-off gate
  created_at    timestamptz not null default now()
);
create index if not exists budget_expenses_line_item_idx on public.budget_expenses(line_item_id);

create table if not exists public.budget_revenue_lines (
  id                uuid primary key default gen_random_uuid(),
  season_id         uuid not null references public.budget_seasons(id) on delete cascade,
  production_id     uuid references public.productions(id) on delete cascade,  -- null for season-level streams
  source_type       text not null check (source_type in
                       ('tickets', 'concessions', 'program_ads', 'merch', 'donations', 'sponsorships', 'grants', 'fundraisers', 'other')),
  projected_amount  numeric not null default 0,
  actual_amount     numeric,
  notes             text,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists budget_revenue_season_idx on public.budget_revenue_lines(season_id);

-- ---------------------------------------------------------------------------
-- Admin identity: per-user accounts, roles, and an audit trail
-- ---------------------------------------------------------------------------
-- Identity/passwords live in Supabase's own auth.users (managed by Supabase
-- Auth); this table just extends it with the app-specific role/name, the
-- standard Supabase pattern for a "profiles" companion table.
create table if not exists public.admin_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('admin', 'editor', 'treasurer', 'viewer')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- One row per mutation anywhere in the admin — who changed what, and the
-- before/after values. admin_user_name is denormalized so the log still
-- reads correctly even if that person's account is later removed.
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

-- ---------------------------------------------------------------------------
-- Intake: ticket reservations / RSVPs
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_reservations (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid references public.productions(id) on delete set null,
  showtime_id   uuid references public.showtimes(id) on delete set null,
  name          text not null,
  email         text not null,
  phone         text,
  quantity      int not null default 1 check (quantity > 0),
  notes         text,
  status        text not null default 'pending',  -- pending | confirmed | cancelled
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Intake: volunteer signups
-- ---------------------------------------------------------------------------
create table if not exists public.volunteers (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid references public.productions(id) on delete set null,
  name          text not null,
  email         text not null,
  phone         text,
  areas         text[],             -- e.g. {set, costumes, concessions, ushering}
  availability  text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.productions          enable row level security;
alter table public.showtimes            enable row level security;
alter table public.cast_members         enable row level security;
alter table public.people               enable row level security;
alter table public.ticket_reservations  enable row level security;
alter table public.volunteers           enable row level security;
alter table public.budget_seasons       enable row level security;
alter table public.budget_categories    enable row level security;
alter table public.budget_line_items    enable row level security;
alter table public.budget_expenses      enable row level security;
alter table public.budget_revenue_lines enable row level security;
alter table public.admin_profiles       enable row level security;
alter table public.audit_log            enable row level security;
-- Budget, admin identity, and audit tables have no public policies at all —
-- only the service-role admin client (which bypasses RLS) can read/write them.

-- Public, read-only access to content tables
create policy "Public read productions"  on public.productions  for select using (true);
create policy "Public read showtimes"     on public.showtimes    for select using (true);
create policy "Public read cast"          on public.cast_members for select using (true);
create policy "Public read people"        on public.people       for select using (true);

-- Anyone may submit a reservation or volunteer signup, but nobody may read
-- them back through the anon/auth API. Reads happen via the service role only.
create policy "Public insert reservations" on public.ticket_reservations for insert with check (true);
create policy "Public insert volunteers"   on public.volunteers          for insert with check (true);

-- ---------------------------------------------------------------------------
-- Storage: poster images
-- ---------------------------------------------------------------------------
-- Admin uploads (pasted URL or drag/drop) are resized server-side and stored
-- here so we control resolution/format instead of hot-linking arbitrary
-- external images. Uploads happen via the service-role admin client, which
-- bypasses RLS, so only a public-read policy is needed.
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

create policy "Public read posters"
  on storage.objects for select
  using (bucket_id = 'posters');

-- ---------------------------------------------------------------------------
-- Storage: board/ITS member photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('people', 'people', true)
on conflict (id) do nothing;

create policy "Public read people photos"
  on storage.objects for select
  using (bucket_id = 'people');
