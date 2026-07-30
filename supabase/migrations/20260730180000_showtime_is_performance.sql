-- Distinguishes an audience-facing performance from an internal prep date
-- (auditions, callbacks, tech week, informational meetings) on the same
-- show. Both still show on the calendar/event list, but only real
-- performances headline the show page's event card — prep dates live in
-- a separate, collapsed "Audition & Prep Dates" section.
alter table public.showtimes
  add column if not exists is_performance boolean not null default true;
