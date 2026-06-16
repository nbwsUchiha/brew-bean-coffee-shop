-- Supabase Storage for product images
-- Run in Supabase SQL Editor (storage schema)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Public read
create policy "Public read product images bucket"
on storage.objects for select
using (bucket_id = 'product-images');

-- Admins upload via service role from Worker; authenticated admins can upload if needed
create policy "Authenticated upload product images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

create policy "Admin update product images"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

create policy "Admin delete product images"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);
