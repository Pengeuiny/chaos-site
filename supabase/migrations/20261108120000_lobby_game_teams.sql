-- Lobby game round 2: teams of up to 4 share one crossword board.
-- Teams are either "open" (auto-filled in join order) or created by a player
-- and filled by name. A team plays a sequence of boards; each board holds the
-- shared tile bag, the placed letters and the claimed bonus words. All writes
-- go through the service role; `version` gives optimistic concurrency.

create table if not exists public.game_teams (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.game_sessions(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  is_open     boolean not null default true,
  started_at  timestamptz,
  solved      int not null default 0,
  play_ms     bigint not null default 0,
  created_at  timestamptz not null default now(),
  unique (session_id, name)
);

create table if not exists public.game_boards (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.game_teams(id) on delete cascade,
  puzzle_key  text not null,
  bag         text not null,
  placed      jsonb not null default '{}'::jsonb,
  bonus       jsonb not null default '{}'::jsonb,
  version     int not null default 0,
  started_at  timestamptz not null default now(),
  solved_at   timestamptz,
  unique (team_id, puzzle_key)
);

alter table public.game_players
  add column if not exists team_id uuid references public.game_teams(id) on delete set null,
  add column if not exists rack    text not null default '';

create index if not exists game_players_team_idx on public.game_players(team_id);
create index if not exists game_boards_team_idx  on public.game_boards(team_id);

alter table public.game_teams  enable row level security;
alter table public.game_boards enable row level security;
create policy "Public read game teams"  on public.game_teams  for select using (true);
create policy "Public read game boards" on public.game_boards for select using (true);

alter publication supabase_realtime add table public.game_teams;
alter publication supabase_realtime add table public.game_boards;
