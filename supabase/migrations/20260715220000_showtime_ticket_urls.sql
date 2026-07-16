-- Add per-showtime ticket links so each performance can deep-link straight to
-- its Ludus checkout, and set Finding Nemo Jr.'s real poster + show dates —
-- the camp-week placeholders are replaced with the three ticketed
-- performances published on the box office
-- (https://cuthbertsontheatre.ludus.com/index.php?sections=events).

alter table public.showtimes add column if not exists ticket_url text;

update public.productions
set poster_url = '/finding-nemo-jr.png'
where slug = 'finding-nemo-jr-2026';

delete from public.showtimes
where production_id = (select id from public.productions where slug = 'finding-nemo-jr-2026');

insert into public.showtimes (production_id, starts_at, label, ticket_url, sort_order) values
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-24 17:00:00-04', 'Friday Evening', 'https://cuthbertsontheatre.ludus.com/index.php?time_id=340835', 1),
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-24 20:00:00-04', 'Friday Night', 'https://cuthbertsontheatre.ludus.com/index.php?time_id=340836', 2),
  ((select id from public.productions where slug = 'finding-nemo-jr-2026'), '2026-07-25 10:00:00-04', 'Saturday Matinee', 'https://cuthbertsontheatre.ludus.com/index.php?time_id=340837', 3);
