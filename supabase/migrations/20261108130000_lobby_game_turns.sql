-- Turn-based play: whose move it is on each board, and since when (for the skip timer).
alter table public.game_boards
  add column if not exists turn    uuid references public.game_players(id) on delete set null,
  add column if not exists turn_at timestamptz;
