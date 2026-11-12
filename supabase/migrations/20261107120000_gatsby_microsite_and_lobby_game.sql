-- Gatsby microsite + the lobby game backend.
--
-- 1. productions.microsite_path: where "Open Microsite" goes (was hardcoded
--    to /nemo). productions.has_game: this show's performances get a lobby
--    game session (opens 30 min before curtain, closes at curtain).
-- 2. cast_members.is_crew: crew rows live alongside cast (same pattern as
--    the Hunchback Director/Choreographer rows) but a microsite can split them.
-- 3. Gatsby cast + crew re-posted from the printed playbill.
-- 4. Game tables. The server (service role) does every write and all scoring;
--    the public can only read sessions and the (non-hidden) leaderboard.

alter table public.productions
  add column if not exists microsite_path text,
  add column if not exists has_game boolean not null default false;
alter table public.cast_members
  add column if not exists is_crew boolean not null default false;

update public.productions set microsite_path = '/nemo'
where has_microsite and microsite_path is null;

update public.productions
set has_microsite = true, microsite_path = '/gatsby', has_game = true, cast_footnote = null
where slug = 'the-great-gatsby';

delete from public.cast_members
where production_id = (select id from public.productions where slug = 'the-great-gatsby');

with p as (select id from public.productions where slug = 'the-great-gatsby')
insert into public.cast_members (production_id, role, actor, is_lead, is_group, is_crew, sort_order)
select p.id, v.role, v.actor, v.is_lead, v.is_group, v.is_crew, v.sort_order from p, (values
  ('Jay Gatsby',      'Nicholas Kippen',  true,  false, false, 1),
  ('Daisy Buchanan',  'Lily Krush',       true,  false, false, 2),
  ('Nick Carraway',   'Thomas Benitez',   true,  false, false, 3),
  ('Tom Buchanan',    'Zachary Nelson',   false, false, false, 4),
  ('Jordan Baker',    'Bailey Scruggs',   false, false, false, 5),
  ('Myrtle Wilson',   'Illisia Irizarry', false, false, false, 6),
  ('George Wilson',   'Kai Boyle',        false, false, false, 7),
  ('Meyer Wolfsheim', 'Kaitlyn Achu',     false, false, false, 8),
  ('Mrs. McKee',      'Ava Rojas',        false, false, false, 9),
  ('Chester',         'Kate Coppinger',   false, false, false, 10),
  ('Mrs. Michaelis',  'Jaxli Hirt',       false, false, false, 11),
  ('Policewoman',     'Katie Freeman',    false, false, false, 12),
  ('Policewoman',     'Hannah Rue',       false, false, false, 13),
  ('Party & Dance Ensemble', 'Kaitlyn Achu, Lola Aguilera, Kate Coppinger, Lily Cruzan, Katie Freeman, Jaxli Hirt, Suhruti Javvadi, Aanya Menon, Ava Rojas, Jessica Schaefer & Olivia Shomphe', false, true, false, 14),
  ('Director',                          'Victoria Kaufmann', false, false, true, 20),
  ('Stage Manager',                     'Sophia Rodriguez',  false, false, true, 21),
  ('Stage Manager',                     'Diana Baranenko',   false, false, true, 22),
  ('Scenic Director & Lighting Designer','Owen Santolucito', false, false, true, 23),
  ('Spotlight Technician',              'Evan Schmotzer',    false, false, true, 24),
  ('Sound Technician',                  'Alexander Perez',   false, false, true, 25),
  ('Choreographer & Dance Captain',     'Kate Coppinger',    false, false, true, 26),
  ('Lighting Technician',               'Elias Peterson',    false, false, true, 27),
  ('Costume Designer',                  'Kenley Brown',      false, false, true, 28),
  ('Lead Costumer',                     'Myla Cabana',       false, false, true, 29),
  ('Costume Crew',                      'Jordyn Gronski',    false, false, true, 30),
  ('Costume Crew',                      'Clara King',        false, false, true, 31),
  ('Company Manager',                   'Davion Worth',      false, false, true, 32),
  ('Marketing Manager',                 'Ava Rojas',         false, false, true, 33)
) as v(role, actor, is_lead, is_group, is_crew, sort_order);

-- ---------------------------------------------------------------------------
-- Lobby game
-- ---------------------------------------------------------------------------
-- One session per performance (showtime_id set, created lazily the first time
-- anyone loads /play inside the window) or per admin-started rehearsal
-- (showtime_id null, is_rehearsal true — never shown in results).
create table if not exists public.game_sessions (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  showtime_id   uuid unique references public.showtimes(id) on delete set null,
  is_rehearsal  boolean not null default false,
  label         text,                       -- "Thursday", "Rehearsal"
  opens_at      timestamptz not null,
  closes_at     timestamptz not null,
  created_at    timestamptz not null default now()
);
create index if not exists game_sessions_production_idx on public.game_sessions(production_id);

create table if not exists public.game_players (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.game_sessions(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 30),
  score         int not null default 0,
  finished_at   timestamptz,               -- tie-break: earlier finish wins
  hidden        boolean not null default false,  -- admin-hidden name
  created_at    timestamptz not null default now(),
  unique (session_id, name)
);
create index if not exists game_players_session_idx on public.game_players(session_id);

-- Kept out of game_players so the public leaderboard (and its realtime feed)
-- never carries anything secret.
create table if not exists public.game_player_tokens (
  player_id   uuid primary key references public.game_players(id) on delete cascade,
  token_hash  text not null unique
);

-- Every scored move. Answers live server-side only; unique key = one shot per item.
create table if not exists public.game_moves (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.game_players(id) on delete cascade,
  item_key    text not null,
  answer      text,
  points      int not null default 0,
  created_at  timestamptz not null default now(),
  unique (player_id, item_key)
);

alter table public.game_sessions      enable row level security;
alter table public.game_players       enable row level security;
alter table public.game_player_tokens enable row level security;
alter table public.game_moves         enable row level security;

create policy "Public read game sessions" on public.game_sessions for select using (true);
create policy "Public read game players"  on public.game_players  for select using (not hidden);
-- game_player_tokens / game_moves: no public policies (service role only).

alter publication supabase_realtime add table public.game_players;
