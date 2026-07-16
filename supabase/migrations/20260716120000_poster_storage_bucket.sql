-- Public storage bucket for production poster images. Admin uploads (pasted
-- URL or drag/drop) are resized server-side and stored here so we control
-- resolution/format instead of hot-linking arbitrary external images.

insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

create policy "Public read posters"
  on storage.objects for select
  using (bucket_id = 'posters');
