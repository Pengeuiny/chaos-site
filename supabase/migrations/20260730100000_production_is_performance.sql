-- Distinguishes real performances (shows/concerts) from fundraisers,
-- festivals, and community events that share the productions table (so
-- they can still appear on the calendar/event list) but shouldn't be
-- picked as the homepage's "Now Showing" feature or listed in "This
-- Season's Shows".
alter table public.productions
  add column if not exists is_performance boolean not null default true;
