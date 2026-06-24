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
  title         text not null,
  title_note    boolean not null default false,   -- placeholder title flag
  type          text,                              -- "Mainstage Musical", etc.
  tag_text      text,                              -- "On Sale", "Camp", ...
  tag_class     text,                              -- styling hook
  poster_url    text,
  accent        text,                              -- hex accent color
  venue         text,
  address       text,
  tagline       text,
  synopsis      text,
  ticket_url    text,
  date_range    text,                              -- human label, e.g. "July 13–24"
  has_microsite boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.showtimes (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  starts_at     timestamptz not null,
  label         text,
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

-- Public, read-only access to content tables
create policy "Public read productions"  on public.productions  for select using (true);
create policy "Public read showtimes"     on public.showtimes    for select using (true);
create policy "Public read cast"          on public.cast_members for select using (true);
create policy "Public read people"        on public.people       for select using (true);

-- Anyone may submit a reservation or volunteer signup, but nobody may read
-- them back through the anon/auth API. Reads happen via the service role only.
create policy "Public insert reservations" on public.ticket_reservations for insert with check (true);
create policy "Public insert volunteers"   on public.volunteers          for insert with check (true);
