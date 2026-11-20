-- Plan per account, for the Starter limit and billing after the beta. Everyone starts on Starter.
-- Users cannot change it from the browser (profiles updates are granted column by column and
-- "plan" is not among them); only the server sets it, e.g. from a Stripe webhook.
alter table public.profiles add column plan text not null default 'starter' check (plan in ('starter', 'pro', 'agency'));
