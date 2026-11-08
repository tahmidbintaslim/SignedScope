-- Code review fixes.

-- Rate-limit counters are deleted two days after their window ends (about 1 in 100 calls sweeps),
-- so hashed keys are not kept indefinitely.
create or replace function public.bump_rate(k text, window_seconds int) returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into public.rate_counters as r (key, n, window_start) values (k, 1, now())
  on conflict (key) do update set
    n = case when r.window_start < now() - make_interval(secs => window_seconds) then 1 else r.n + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => window_seconds) then now() else r.window_start end
  returning n into v;
  if random() < 0.01 then
    delete from public.rate_counters where window_start < now() - interval '2 days';
  end if;
  return v;
end $$;
revoke execute on function public.bump_rate(text, int) from public, anon, authenticated;
grant execute on function public.bump_rate(text, int) to service_role;

-- The vault also takes design, video, audio and text files freelancers commonly share.
-- Pages and scripts (HTML, SVG, JavaScript, XML) stay excluded.
update storage.buckets set allowed_mime_types = array[
  'application/pdf', 'text/plain', 'text/csv', 'text/markdown', 'application/json',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/avif', 'image/tiff', 'image/vnd.adobe.photoshop',
  'application/postscript', 'application/illustrator',
  'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav',
  'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 'application/vnd.rar', 'application/octet-stream',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet'
] where id = 'vault';
