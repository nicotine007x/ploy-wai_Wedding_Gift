-- Ploy & Wai — wedding wishes
-- Paste all of this into Supabase → SQL Editor → New query → Run (once).
-- Guests can only ADD wishes and videos. Nobody can read them with the public key;
-- the couple reads everything in the Supabase dashboard (Table Editor / Storage).

-- 1) Wishes table -----------------------------------------------------------
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text check (char_length(name) <= 10),
  message     text check (char_length(message) <= 100),
  video_path  text,
  constraint wish_not_empty check (message is not null or video_path is not null)
);

alter table public.wishes enable row level security;

-- (explicit grants: works even when "Grant API access to new tables automatically" is off)
grant usage on schema public to anon, authenticated;
grant insert on public.wishes to anon, authenticated;

drop policy if exists "guests can send wishes" on public.wishes;
create policy "guests can send wishes"
  on public.wishes for insert
  to anon, authenticated
  with check (true);

-- 2) Video storage (private bucket, 50 MB per file, videos only) -------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-videos', 'wish-videos', false, 52428800, array['video/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "guests can upload wish videos" on storage.objects;
create policy "guests can upload wish videos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'wish-videos');
