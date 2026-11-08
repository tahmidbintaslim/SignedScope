-- Security hardening from the 8 Nov 2026 audit.

-- 1. Two-step sign-in is enforced by the database, not only the browser. A user who has turned
--    on an authenticator app needs an aal2 session for any data access; an aal1 token from a
--    magic link or OAuth alone reads nothing.
create function public.mfa_ok() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
$$;
do $$ declare t text; begin
  foreach t in array array['profiles', 'clients', 'projects', 'estimates', 'documents', 'payments', 'activity'] loop
    execute format('create policy "mfa required" on public.%I as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok())', t);
  end loop;
end $$;
create policy "vault mfa required" on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'vault' or public.mfa_ok()) with check (bucket_id <> 'vault' or public.mfa_ok());

-- 2. Profiles: the email used for notifications is not editable from the browser (the server
--    reads the verified address from auth.users). Only these settings are.
revoke insert, update on public.profiles from authenticated;
grant update (name, business_name, currency, hourly_rate, lang, pay_instructions, notify_signed, notify_viewed, notify_overdue)
  on public.profiles to authenticated;

-- 3. Activity: browser entries are marked as the user's own and cannot imitate server events.
alter table public.activity add column actor text not null default 'user' check (actor in ('user', 'server'));
revoke insert on public.activity from authenticated;
grant insert (project_id, kind, detail) on public.activity to authenticated;
drop policy "add own activity" on public.activity;
create policy "add own activity" on public.activity for insert to authenticated
  with check (owner = (select auth.uid()) and actor = 'user' and public.owns_project(project_id)
              and kind in ('project_created', 'client_created', 'status_changed', 'estimate_saved', 'payment_requested', 'payment_paid', 'note'));

-- 4. Payments: amounts and currency are fixed once created (a signed schedule cannot be rewritten);
--    the browser may record status, paid date, method, reference, due date and label.
revoke update on public.payments from authenticated;
grant update (status, paid_at, method, reference, due_date, label) on public.payments to authenticated;

-- 5. Vault uploads must sit inside one of the user's projects: <uid>/<project id>/<file>.
drop policy "vault add to own project" on storage.objects;
create policy "vault add to own project" on storage.objects for insert to authenticated
  with check (bucket_id = 'vault'
              and array_length(storage.foldername(name), 1) = 2
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and (storage.foldername(name))[2] is not null
              and public.owns_project(((storage.foldername(name))[2])::uuid));

-- 5b. The vault stores documents, images and archives only (no HTML, SVG or scripts that a
--     share link could serve as a web page).
update storage.buckets set allowed_mime_types = array[
  'application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic',
  'application/zip', 'application/x-zip-compressed', 'application/octet-stream',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
] where id = 'vault';

-- 6. Functions: fixed search_path, a safe name length on sign-up, least-privilege execute.
alter function public.touch_updated_at() set search_path = '';
alter function public.keep_owner() set search_path = '';
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name) values (new.id, left(new.email, 254), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end $$;
revoke execute on function public.owns_client(uuid), public.owns_project(uuid), public.owns_document(uuid), public.mfa_ok(),
  public.handle_new_user(), public.touch_updated_at(), public.keep_owner() from public, anon;
grant execute on function public.owns_client(uuid), public.owns_project(uuid), public.owns_document(uuid), public.mfa_ok() to authenticated;

-- 7. New tables, sequences and functions get no browser access unless a migration grants it.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 8. Atomic rate-limit counters for the API (server only; no browser access).
create table public.rate_counters (
  key text primary key check (char_length(key) <= 200),
  n int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_counters enable row level security;
revoke all on public.rate_counters from anon, authenticated;
create function public.bump_rate(k text, window_seconds int) returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.rate_counters as r (key, n, window_start) values (k, 1, now())
  on conflict (key) do update set
    n = case when r.window_start < now() - make_interval(secs => window_seconds) then 1 else r.n + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => window_seconds) then now() else r.window_start end
  returning n into v;
  return v;
end $$;
revoke execute on function public.bump_rate(text, int) from public, anon, authenticated;
grant execute on function public.bump_rate(text, int) to service_role;
grant all on public.rate_counters to service_role;
