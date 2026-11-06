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
const as = (uid, sql) => {
  const r = psql(`begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${uid}"}', true) is null;
${sql}; commit;`);
  return { ...r, out: r.out.split('\n').slice(1).join('\n') };
};

test('migration applies and RLS isolates users', opts, () => {
  psql('drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;');
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

  // Anonymous requests see nothing.
  assert.ok(!psql(`begin; set local role anon; select count(*) from clients; commit;`).ok);

  // Deleting a project removes its estimates, documents and payments.
  assert.ok(as(A, `delete from projects where id = '${projectId}'`).ok);
  assert.equal(psql(`select (select count(*) from documents) + (select count(*) from payments)`).out, '0');
});
