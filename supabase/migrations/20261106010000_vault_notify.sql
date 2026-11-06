-- Document vault (private Storage bucket) and email notification preferences.

-- Notifications: what the owner wants emailed. Signing is on by default; views are off.
alter table public.profiles
  add column notify_signed boolean not null default true,
  add column notify_viewed boolean not null default false,
  add column notify_overdue boolean not null default true;

-- Private bucket. Files live at <owner uid>/<project id>/<file>, so the first folder
-- must be the signed-in user's id and the second must be one of their projects.
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 26214400)
on conflict (id) do nothing;

create policy "vault read own" on storage.objects for select to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "vault add to own project" on storage.objects for insert to authenticated
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text
              and public.owns_project(((storage.foldername(name))[2])::uuid));
create policy "vault delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
