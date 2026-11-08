'use strict';
// Row Level Security tests against a real Postgres. Needs PGTEST_URL (CI provides one);
// without it these tests are reported as skipped, not passed.
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

const URL = process.env.PGTEST_URL;
const opts = { skip: !URL && 'PGTEST_URL not set' };
const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';

// SQL goes in on stdin so every statement's result prints (psql -c shows only the last).
function psql(sql) {
  const r = spawnSync('psql', [URL, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: sql, encoding: 'utf8' });
  return { ok: r.status === 0, out: r.stdout.trim(), err: r.stderr.trim() };
}
const file = (f) => spawnSync('psql', [URL, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', f], { encoding: 'utf8' });
// Runs SQL as a signed-in user, the way PostgREST does for a browser request.
// The first output line is the set_config result, so it is dropped.
const as = (uid, sql, aal = 'aal1') => {
  const r = psql(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${uid}","aal":"${aal}"}', true) is null;
${sql}; commit;`);
  return { ...r, out: r.out.split('\n').slice(1).join('\n') };
};

test('migration applies and RLS isolates users', opts, () => {
  psql('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists storage cascade; drop schema if exists private cascade;');
  for (const f of ['test/db/supabase-stub.sql', ...require('fs').readdirSync('supabase/migrations').sort().map((m) => 'supabase/migrations/' + m)]) {
    const r = file(path.join(__dirname, '..', f));
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
  // Sign-up creates a profile.
  assert.ok(psql(`insert into auth.users (id, email) values ('${A}', 'a@x.co'), ('${B}', 'b@x.co')`).ok);
  assert.equal(psql('select count(*) from public.profiles').out, '2');

  // A creates a client and project; B sees nothing of A's.
  const c = as(A, `insert into clients (name) values ('Acme') returning id`);
  assert.ok(c.ok, c.err);
  const clientId = c.out.split('\n').pop();
  const p = as(A, `insert into projects (title, client_id) values ('Site', '${clientId}') returning id`);
  assert.ok(p.ok, p.err);
  const projectId = p.out.split('\n').pop();
  assert.equal(as(B, 'select count(*) from clients').out.split('\n').pop(), '0');
  assert.equal(as(B, 'select count(*) from projects').out.split('\n').pop(), '0');
  assert.equal(as(A, 'select count(*) from profiles').out.split('\n').pop(), '1', 'only own profile');

  // B can't attach a project to A's client, or an estimate/payment to A's project.
  assert.ok(!as(B, `insert into projects (title, client_id) values ('Steal', '${clientId}')`).ok);
  assert.ok(!as(B, `insert into estimates (project_id, currency, rate, data, hours_low, hours_high, price_low, price_high) values ('${projectId}', 'USD', 1, '{}', 1, 2, 1, 2)`).ok);
  assert.ok(!as(B, `insert into payments (project_id, label, amount, currency) values ('${projectId}', 'x', 10, 'USD')`).ok);
  // B can't spoof the owner column either.
  assert.ok(!as(B, `insert into clients (owner, name) values ('${A}', 'Fake')`).ok);
  // Updates/deletes by B silently affect zero rows.
  assert.equal(as(B, `update projects set title = 'hacked' where id = '${projectId}' returning id`).out.split('\n').filter(Boolean).length, 0);
  assert.equal(psql(`select title from projects where id = '${projectId}'`).out, 'Site');
  // A can't move a row to B.
  assert.ok(!as(A, `update projects set owner = '${B}' where id = '${projectId}'`).ok);

  // Payments: A records a manual payment, but can't claim a provider-confirmed one.
  assert.ok(as(A, `insert into payments (project_id, label, amount, currency, status, paid_at) values ('${projectId}', 'Deposit', 800, 'USD', 'paid_manual', now())`).ok);
  assert.ok(!as(A, `insert into payments (project_id, label, amount, currency, status, paid_at) values ('${projectId}', 'Fake', 800, 'USD', 'paid_provider', now())`).ok);
  assert.ok(!as(A, `insert into payments (project_id, label, amount, currency, status) values ('${projectId}', 'No date', 800, 'USD', 'paid_manual')`).ok, 'paid needs a date');

  // Documents: browsers can read their own but not create or edit them (the server does).
  const hash = 'a'.repeat(64);
  assert.ok(psql(`insert into documents (owner, project_id, title, token, doc_hash) values ('${A}', '${projectId}', 'Scope', 'v1.x.y', '${hash}')`).ok);
  assert.ok(!as(A, `insert into documents (project_id, title, token, doc_hash) values ('${projectId}', 'S', 't', '${'b'.repeat(64)}')`).ok);
  assert.ok(!as(A, `update documents set status = 'signed'`).ok);
  assert.equal(as(A, 'select count(*) from documents').out.split('\n').pop(), '1');
  assert.equal(as(B, 'select count(*) from documents').out.split('\n').pop(), '0');

  // Activity: own project only; profile edits only on own row.
  assert.ok(as(A, `insert into activity (project_id, kind) values ('${projectId}', 'note')`).ok);
  assert.ok(!as(B, `insert into activity (project_id, kind) values ('${projectId}', 'note')`).ok);
  assert.ok(as(A, `update profiles set business_name = 'A Studio', hourly_rate = 40`).ok);
  assert.equal(psql(`select coalesce(business_name, '-') from profiles where id = '${B}'`).out, '-');

  // Vault: own folder and own project only.
  assert.ok(as(A, `insert into storage.objects (bucket_id, name) values ('vault', '${A}/${projectId}/brief.pdf')`).ok, 'A uploads to own project');
  assert.ok(!as(B, `insert into storage.objects (bucket_id, name) values ('vault', '${A}/${projectId}/x.pdf')`).ok, 'B cannot write in A folder');
  assert.ok(!as(B, `insert into storage.objects (bucket_id, name) values ('vault', '${B}/${projectId}/x.pdf')`).ok, 'B cannot file under A project');
  assert.equal(as(B, `select count(*) from storage.objects`).out, '0', 'B sees none of A files');
  assert.equal(as(A, `select count(*) from storage.objects`).out, '1');
  assert.equal(psql(`select notify_signed::text || notify_viewed::text from profiles where id = '${A}'`).out, 'truefalse', 'notification defaults');

  // Security hardening (migration 20261108000000_security.sql).
  // Profiles: settings are editable, the notification email is not.
  assert.ok(!as(A, `update profiles set email = 'victim@corp.com'`).ok, 'email is not editable');
  // Onboarding (20261108030000_onboarding.sql): locale and the onboarding mark are editable; bad values are not.
  assert.ok(as(A, `update profiles set country = 'TH', time_zone = 'Asia/Bangkok', onboarded_at = now() where id = '${A}'`).ok, 'onboarding fields editable');
  assert.ok(!as(A, `update profiles set country = 'thailand' where id = '${A}'`).ok, 'country must be a 2-letter code');
  assert.equal(psql(`select country || ' ' || time_zone from profiles where id = '${A}'`).out, 'TH Asia/Bangkok');
  // Activity: users cannot write server events or mark entries as server-made.
  assert.ok(!as(A, `insert into activity (project_id, kind) values ('${projectId}', 'document_signed')`).ok, 'no forged server events');
  assert.ok(!as(A, `insert into activity (project_id, kind, actor) values ('${projectId}', 'note', 'server')`).ok, 'no forged actor');
  // Payments: amounts cannot be rewritten; status can.
  assert.ok(!as(A, `update payments set amount = 1`).ok, 'amount is fixed');
  assert.ok(as(A, `update payments set reference = 'KBank 7781'`).ok, 'reference can be recorded');
  // Vault: files must be inside a project folder; no overwrite policy exists.
  assert.ok(!as(A, `insert into storage.objects (bucket_id, name) values ('vault', '${A}/loose.pdf')`).ok, 'no files outside a project');
  assert.equal(as(A, `update storage.objects set name = name || '.x' returning id`).out.split('\n').filter(Boolean).length, 0, 'no overwrite');
  // Two-step sign-in: once A has a verified authenticator, an aal1 session sees and changes nothing.
  assert.ok(psql(`insert into auth.mfa_factors (user_id, status) values ('${A}', 'verified')`).ok);
  assert.equal(as(A, 'select count(*) from clients').out.split('\n').pop(), '0', 'aal1 reads nothing');
  assert.ok(!as(A, `insert into clients (name) values ('x')`).ok, 'aal1 writes nothing');
  assert.equal(as(A, 'select count(*) from storage.objects').out, '0', 'aal1 sees no files');
  assert.equal(as(A, 'select count(*) from clients', 'aal2').out.split('\n').pop(), '1', 'aal2 works');
  assert.equal(as(B, 'select count(*) from profiles').out.split('\n').pop(), '1', 'users without MFA are unaffected');
  // Rate counters: server only, and atomic per window.
  assert.ok(!as(A, `select public.bump_rate('k', 60)`, 'aal2').ok, 'browser cannot use the counters');
  assert.equal(psql(`select public.bump_rate('k', 60); select public.bump_rate('k', 60);`).out.split('\n').pop(), '2');

  // Anonymous requests see nothing.
  assert.ok(!psql(`begin; set local role anon; select count(*) from clients; commit;`).ok);

  // Deleting a project removes its estimates, documents and payments.
  assert.ok(as(A, `delete from projects where id = '${projectId}'`, 'aal2').ok);
  assert.equal(psql(`select (select count(*) from documents) + (select count(*) from payments)`).out, '0');
});
