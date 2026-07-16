-- Force posters/people buckets to be public regardless of prior state. The
-- earlier bucket-creation migrations used `on conflict (id) do nothing`,
-- which would silently skip fixing an already-existing-but-private bucket
-- (e.g. one created manually via the dashboard before the migration ran).

update storage.buckets set public = true where id in ('posters', 'people');
