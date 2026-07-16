-- Public storage bucket for board/ITS member photos. Admin uploads (pasted
-- URL or drag/drop) are resized server-side to a square headshot crop and
-- stored here, same pattern as the posters bucket for show images.

insert into storage.buckets (id, name, public)
values ('people', 'people', true)
on conflict (id) do nothing;

create policy "Public read people photos"
  on storage.objects for select
  using (bucket_id = 'people');
