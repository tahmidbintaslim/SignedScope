-- Policy helpers live in a schema the REST API does not expose, so they can't be called as RPCs.
-- Moving a function keeps its identity, so existing policies keep using it.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
alter function public.owns_client(uuid) set schema private;
alter function public.owns_project(uuid) set schema private;
alter function public.owns_document(uuid) set schema private;
alter function public.mfa_ok() set schema private;
-- Trigger-only function: nobody calls it directly.
revoke execute on function public.handle_new_user() from authenticated;
