-- Sign-in moves to Clerk (Supabase third-party auth). A Clerk session token carries the user id in
-- "sub" (text such as user_2abc...), not a Supabase uuid, so:
--   * every owner column (and profiles.id) becomes text, defaulting to the token's subject;
--   * every rule that compared against auth.uid() now compares against private.uid();
--   * links to auth.users and the sign-up trigger go (the app creates the profile row);
--   * the "mfa required" rules go: Clerk enforces two-step sign-in before it issues a token.

create function private.uid() returns text language sql stable set search_path = '' as $$
  select nullif((select auth.jwt()) ->> 'sub', '')
$$;
revoke execute on function private.uid() from public, anon;
grant execute on function private.uid() to authenticated;

-- 1. Keep the definitions of the rules that use the old id, then drop them (column types can't
--    change while a rule depends on them).
create temporary table _rules as
  select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
  where coalesce(qual, '') || coalesce(with_check, '') ~ '(auth\.uid\(\)|mfa_ok\(\))';
do $$
declare r record;
begin
  for r in select * from _rules loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2. No more links to Supabase users, and no sign-up trigger.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
    where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and n.nspname = 'public'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- 3. Owner ids become text. (Existing Supabase-auth rows can't sign in with Clerk; the old
--    test profile is removed so nothing is left pointing at a user who can't reach it.)
delete from public.profiles;
alter table public.profiles alter column id type text using id::text, alter column id set default private.uid();
do $$
declare t text;
begin
  foreach t in array array['clients', 'projects', 'estimates', 'documents', 'payments', 'activity', 'questions'] loop
    execute format('alter table public.%I alter column owner drop default', t);
    execute format('alter table public.%I alter column owner type text using owner::text', t);
    execute format('alter table public.%I alter column owner set default private.uid()', t);
    execute format('alter table public.%I add constraint %I check (char_length(owner) between 1 and 64)', t, t || '_owner_len');
  end loop;
end $$;
alter table public.profiles add constraint profiles_id_len check (char_length(id) between 1 and 64);
-- Rows must belong to a real profile (what auth.users used to guarantee).
do $$
declare t text;
begin
  foreach t in array array['clients', 'projects', 'estimates', 'documents', 'payments', 'activity', 'questions'] loop
    execute format('alter table public.%I add constraint %I foreign key (owner) references public.profiles (id) on delete cascade', t, t || '_owner_profile');
  end loop;
end $$;

-- 4. Ownership helpers compare against the Clerk user.
create or replace function private.owns_client(c uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select c is null or exists (select 1 from public.clients where id = c and owner = (select private.uid()))
$$;
create or replace function private.owns_project(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select p is null or exists (select 1 from public.projects where id = p and owner = (select private.uid()))
$$;
create or replace function private.owns_document(d uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select d is null or exists (select 1 from public.documents where id = d and owner = (select private.uid()))
$$;

-- 5. Put the rules back with the new id; the two-step rules are not restored.
do $$
declare r record; q text; w text;
begin
  for r in select * from _rules where policyname not ilike '%mfa required%' loop
    q := replace(r.qual, 'auth.uid()', 'private.uid()');
    w := replace(r.with_check, 'auth.uid()', 'private.uid()');
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',
      r.policyname, r.schemaname, r.tablename, r.permissive, r.cmd, array_to_string(r.roles, ', '),
      case when q is null then '' else ' using (' || q || ')' end,
      case when w is null then '' else ' with check (' || w || ')' end);
  end loop;
end $$;
drop function if exists private.mfa_ok();
drop table _rules;
-- The server creates the profile row on first sign-in (POST /api/config), with the email from
-- the verified Clerk token; browsers still can't insert profiles.
