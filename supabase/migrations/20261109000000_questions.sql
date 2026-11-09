-- Per-line questions: before signing, a client can ask about one line of a filed sign-off link.
-- Clients never touch this table directly; api/verify (action "ask") inserts with the service
-- role after checking the sealed token, and returns answers to anyone holding that link.
-- The freelancer reads their own questions and may only write the answer.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 40),
  item_text text not null check (char_length(item_text) <= 600),
  question text not null check (char_length(question) between 1 and 600),
  asker_name text check (char_length(asker_name) <= 120),
  answer text check (char_length(answer) <= 1200),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint answered_has_date check (answer is null or answered_at is not null)
);

create index on public.questions (document_id, created_at);
create index on public.questions (owner, created_at desc);

alter table public.questions enable row level security;

create policy "read own questions" on public.questions for select to authenticated using (owner = (select auth.uid()));
create policy "answer own questions" on public.questions for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "mfa required" on public.questions as restrictive for all to authenticated
  using (private.mfa_ok()) with check (private.mfa_ok());

revoke all on public.questions from anon, authenticated;
grant select on public.questions to authenticated;
grant update (answer, answered_at) on public.questions to authenticated;
