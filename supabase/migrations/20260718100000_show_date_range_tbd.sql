-- Replace manually-set tag_text/tag_class (which goes stale — e.g. a past
-- show still showing "On Sale") with a real date range the front end
-- characterizes automatically (Past / On Sale / Upcoming / a season label
-- like "Fall 2026" when far out / a free-text "Coming Soon" when dates_tbd).
-- Same idea for individual showtimes: starts_at becomes optional, gated by
-- starts_tbd, with `label` doubling as the display text in that case.

alter table public.productions
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  add column if not exists dates_tbd boolean not null default false;

alter table public.showtimes
  alter column starts_at drop not null,
  add column if not exists starts_tbd boolean not null default false;

-- Existing rows have no starts_on/ends_on yet. Mark them dates_tbd so they
-- render as a safe "Coming Soon" placeholder instead of nothing/incorrect,
-- until an admin fills in real dates via the updated edit form.
update public.productions
set dates_tbd = true,
    date_range = coalesce(date_range, 'Coming soon')
where starts_on is null and ends_on is null;

-- Backfill the real dates we know for the three seeded productions.
update public.productions set starts_on = '2026-04-16', ends_on = '2026-04-18', dates_tbd = false
where slug = 'spring-mainstage-2026';
update public.productions set starts_on = '2026-06-15', ends_on = '2026-06-19', dates_tbd = false
where slug = 'summer-camp-revue-2026';
update public.productions set starts_on = '2026-07-24', ends_on = '2026-07-25', dates_tbd = false
where slug = 'finding-nemo-jr-2026';

alter table public.productions
  drop column if exists tag_text,
  drop column if exists tag_class;
