-- Onboarding and locale: the country and time zone a freelancer works in, and when they
-- finished the first-run setup. Editable by the owner like the other profile settings.
alter table public.profiles
  add column if not exists country text check (country ~ '^[A-Z]{2}$'),
  add column if not exists time_zone text check (char_length(time_zone) between 1 and 64),
  add column if not exists onboarded_at timestamptz;

grant update (country, time_zone, onboarded_at) on public.profiles to authenticated;
