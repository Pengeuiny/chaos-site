-- Lobby game runs the whole Eastern show day, paused from curtain until 90 min after.
alter table public.game_sessions add column if not exists curtain_at timestamptz;

update public.game_sessions s
set curtain_at = st.starts_at
from public.showtimes st
where st.id = s.showtime_id and s.curtain_at is null;

-- Stretch any show day still in progress to 11:59pm Eastern.
update public.game_sessions
set closes_at = (date_trunc('day', curtain_at at time zone 'America/New_York') + interval '23 hours 59 minutes')
                at time zone 'America/New_York'
where curtain_at is not null and curtain_at > now() - interval '1 day';
