-- SignedScope workspace schema.
-- Every row belongs to one user (owner). Row Level Security makes each user see and change
-- only their own rows, and checks that a row only points at the same user's client/project.
-- The server (service role) writes signing events; browsers never get the service role key.

create extension if not exists pgcrypto;

-- Profile and defaults ------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 120),
  business_name text check (char_length(business_name) <= 120),
  email text check (char_length(email) <= 254),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  hourly_rate numeric(12,2) check (hourly_rate >= 0),
  lang text not null default 'en' check (lang in ('en', 'bn', 'th')),
  pay_instructions text check (char_length(pay_instructions) <= 800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  company text check (char_length(company) <= 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  country text check (char_length(country) <= 2),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  status text not null default 'lead'
    check (status in ('lead', 'estimating', 'proposal_sent', 'approved', 'in_progress', 'completed', 'cancelled')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  start_date date,
  due_date date,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A saved AI estimate (the edited breakdown, not the brief's AI call).
create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  brief text check (char_length(brief) <= 12000),
  lang text not null default 'en' check (lang in ('en', 'bn', 'th')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  rate numeric(12,2) not null check (rate >= 0),
  buffer_pct numeric(5,2) not null default 15 check (buffer_pct between 0 and 100),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 200000),
  hours_low numeric(10,1) not null check (hours_low >= 0),
  hours_high numeric(10,1) not null check (hours_high >= hours_low),
  price_low numeric(14,2) not null check (price_low >= 0),
  price_high numeric(14,2) not null check (price_high >= price_low),
  created_at timestamptz not null default now()
);

-- A scope, change request, proposal or agreement sent to a client as a sealed link.
-- token/receipt_token are the signed links; doc_hash ties signing events to this row.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null default 'scope' check (kind in ('scope', 'change_request', 'proposal', 'agreement')),
  title text not null check (char_length(title) <= 160),
  revision int not null default 1 check (revision >= 1),
  token text not null check (char_length(token) <= 60000),
  doc_hash text not null check (doc_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'sent' check (status in ('sent', 'viewed', 'signed', 'changes_requested')),
  currency text check (currency ~ '^[A-Z]{3}$'),
  total numeric(14,2),
  viewed_at timestamptz,
  signed_at timestamptz,
  signer_name text check (char_length(signer_name) <= 120),
  receipt_token text check (char_length(receipt_token) <= 200000),
  created_at timestamptz not null default now(),
  unique (doc_hash)
);

-- Payment requests and records. SignedScope never moves money: "paid_manual" means the
-- freelancer marked it paid; "paid_provider" is reserved for a verified provider webhook.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  label text not null check (char_length(label) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  due_date date,
  status text not null default 'requested' check (status in ('requested', 'paid_manual', 'paid_provider', 'cancelled')),
  method text check (char_length(method) <= 40),
  reference text check (char_length(reference) <= 120),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  -- Browsers may only record manual payments; provider-confirmed status comes from the server.
  constraint paid_has_date check (status not in ('paid_manual', 'paid_provider') or paid_at is not null)
);

create table public.activity (
  id bigint generated always as identity primary key,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 4000),
  created_at timestamptz not null default now()
);

create index on public.clients (owner, created_at desc);
create index on public.projects (owner, updated_at desc);
create index on public.projects (client_id);
create index on public.estimates (project_id, created_at desc);
create index on public.documents (project_id, created_at desc);
create index on public.documents (owner, status);
create index on public.payments (project_id);
create index on public.payments (owner, status);
create index on public.activity (owner, created_at desc);
create index on public.activity (project_id, created_at desc);

-- Keep updated_at fresh ----------------------------------------------------------------------
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- Owner can't be changed after insert (stops moving a row into another account).
create function public.keep_owner() returns trigger language plpgsql as $$
begin
  if new.owner is distinct from old.owner then raise exception 'owner cannot change'; end if;
  return new;
end $$;
create trigger clients_owner before update on public.clients for each row execute function public.keep_owner();
create trigger projects_owner before update on public.projects for each row execute function public.keep_owner();
create trigger estimates_owner before update on public.estimates for each row execute function public.keep_owner();
create trigger documents_owner before update on public.documents for each row execute function public.keep_owner();
create trigger payments_owner before update on public.payments for each row execute function public.keep_owner();

-- New sign-ups get a profile row.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Row Level Security ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.estimates enable row level security;
alter table public.documents enable row level security;
alter table public.payments enable row level security;
alter table public.activity enable row level security;

-- Helpers: does this client/project belong to the current user? (security definer so the
-- check itself isn't filtered by RLS; it only ever compares against auth.uid()).
create function public.owns_client(c uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select c is null or exists (select 1 from public.clients where id = c and owner = (select auth.uid()))
$$;
create function public.owns_project(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select p is null or exists (select 1 from public.projects where id = p and owner = (select auth.uid()))
$$;
create function public.owns_document(d uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select d is null or exists (select 1 from public.documents where id = d and owner = (select auth.uid()))
$$;

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own clients" on public.clients for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

create policy "own projects" on public.projects for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and public.owns_client(client_id));

create policy "own estimates" on public.estimates for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and public.owns_project(project_id) and project_id is not null);

-- Documents are created by the server after sealing (it checks the user's session) and read
-- by their owner. Owners may delete or re-file them, but not edit the signed fields.
create policy "read own documents" on public.documents for select to authenticated using (owner = (select auth.uid()));
create policy "delete own documents" on public.documents for delete to authenticated using (owner = (select auth.uid()));

create policy "own payments" on public.payments for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and public.owns_project(project_id) and public.owns_document(document_id)
              and status <> 'paid_provider');

create policy "read own activity" on public.activity for select to authenticated using (owner = (select auth.uid()));
create policy "add own activity" on public.activity for insert to authenticated
  with check (owner = (select auth.uid()) and public.owns_project(project_id));

-- Column-level: browsers can't insert/update documents at all (no policy), and can't forge
-- provider-confirmed payments (policy above). Revoke anon entirely.
-- Supabase grants every table to anon and authenticated by default; start from nothing.
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.clients, public.projects, public.estimates, public.payments to authenticated;
grant select, delete on public.documents to authenticated;
grant select, insert on public.activity to authenticated;
