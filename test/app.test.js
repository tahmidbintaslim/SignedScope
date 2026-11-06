'use strict';
// Server-side account features with an in-memory Supabase: filing a sealed link into a
// project, and the dashboard updating when the client opens and signs it.
const test = require('node:test');
const assert = require('node:assert');
process.env.SIGNING_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
const fake = require('./fake-supabase');
require.cache[require.resolve('@supabase/supabase-js')] = { exports: fake, loaded: true, id: 'supabase' };
const store = fake.__store;
const seal = require('../api/seal');
const sign = require('../api/sign');
const verify = require('../api/verify');
const config = require('../api/config');

function call(fn, body, headers = {}) {
  return new Promise((resolve) => {
    const res = { setHeader() {}, status(s) { this.s = s; return this; }, json(j) { resolve({ status: this.s, body: j }); } };
    fn({ method: 'POST', body, headers: { 'user-agent': 'x', ...headers } }, res);
  });
}
const A = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'a@x.co' };
const B = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'b@x.co' };
store.users = [A, B];
const P = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
store.tables.projects = [{ id: P, owner: A.id, title: 'Café site', status: 'estimating', currency: 'THB' }];
const base = { title: 'Café site', agency: 'A Studio', client: 'Café', currency: 'THB', payInstructions: 'PromptPay 081-234-5678', items: [{ kind: 'scope', text: 'Menu', price: 9000 }] };

test('config exposes only public keys', async () => {
  const r = await call(config, {});
  assert.deepEqual(r.body, { enabled: true, supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' });
});

test('filing into a project needs the owner’s session', async () => {
  assert.equal((await call(seal, { ...base, projectId: P })).status, 401);
  assert.equal((await call(seal, { ...base, projectId: P }, { authorization: 'Bearer fake-token-' + B.id })).status, 404, 'not B’s project');
  assert.equal((await call(seal, base)).status, 200, 'unfiled links still work without an account');
});

test('sent → viewed → signed updates the document, project and activity', async () => {
  const s = await call(seal, { ...base, projectId: P }, { authorization: 'Bearer fake-token-' + A.id });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const doc = store.tables.documents.find((d) => d.id === s.body.documentId);
  assert.equal(doc.owner, A.id); assert.equal(doc.status, 'sent'); assert.equal(doc.total, 9000);
  assert.equal(store.tables.projects[0].status, 'proposal_sent');

  const v = await call(verify, { token: s.body.token, viewed: true });
  assert.equal(v.body.data.payInstructions, 'PromptPay 081-234-5678');
  assert.equal(doc.status, 'viewed');

  const id = v.body.data.items[0].id;
  const r = await call(sign, { token: s.body.token, name: 'Nok', agree: true, decisions: { [id]: { status: 'accepted' } } });
  assert.equal(r.status, 200);
  assert.equal(r.body.payable, true, 'payment instructions alone make it payable');
  assert.equal(doc.status, 'signed'); assert.equal(doc.signer_name, 'Nok'); assert.ok(doc.receipt_token);
  assert.equal(store.tables.projects[0].status, 'approved');
  assert.deepEqual(store.tables.activity.map((a) => a.kind), ['document_sent', 'document_viewed', 'document_signed']);
  assert.ok(store.tables.activity.every((a) => a.owner === A.id && a.project_id === P));
});
