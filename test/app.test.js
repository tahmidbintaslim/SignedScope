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

test('agreement: sections and schedule are sealed; signing creates the payment requests once', async () => {
  const body = { ...base, kind: 'agreement', title: 'Café site agreement',
    sections: [{ heading: 'Summary', body: 'A bilingual café website.' }, { heading: 'Revisions', body: 'Two rounds included.' }],
    schedule: [{ label: 'Deposit 50%', amount: 4500, due: 'On signing' }, { label: 'Final 50%', amount: '4,500', due: 'At launch' }] };
  assert.equal((await call(seal, { ...body, schedule: [{ label: 'x', amount: 0 }] })).status, 400, 'zero amount refused');
  assert.equal((await call(seal, { ...body, sections: [{ heading: '', body: 'x' }] })).status, 400, 'heading required');
  const s = await call(seal, { ...body, projectId: P }, { authorization: 'Bearer fake-token-' + A.id });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const doc = store.tables.documents.find((d) => d.id === s.body.documentId);
  assert.equal(doc.kind, 'agreement');
  const d = (await call(verify, { token: s.body.token })).body.data;
  assert.deepEqual(d.schedule, [{ label: 'Deposit 50%', amount: 4500, due: 'On signing' }, { label: 'Final 50%', amount: 4500, due: 'At launch' }]);
  assert.equal(d.sections[1].heading, 'Revisions');
  const decisions = { [d.items[0].id]: { status: 'accepted' } };
  for (let i = 0; i < 2; i++) await call(sign, { token: s.body.token, name: 'Nok', agree: true, decisions });
  const pays = store.tables.payments.filter((p) => p.document_id === doc.id);
  assert.deepEqual(pays.map((p) => [p.label, p.amount, p.currency, p.owner, p.project_id]), [
    ['Deposit 50%', 4500, 'THB', A.id, P], ['Final 50%', 4500, 'THB', A.id, P]], 'created once, even if signed twice');
});

test('proposal writer: signed-in only, never asked for prices, input fenced', async () => {
  const proposal = require('../api/proposal');
  const body = { project: 'Café site', client: 'Café Lumi', features: ['Menu', 'Booking'], milestones: ['1. Design (1 week)'], lang: 'th' };
  assert.equal((await call(proposal, body)).status, 401);
  assert.equal((await call(proposal, body, { authorization: 'Bearer fake-token-' + A.id })).status, 503, 'no AI key');
  const sdkPath = require.resolve('@anthropic-ai/sdk');
  let sent;
  require.cache[sdkPath] = { exports: { default: class { constructor(o) { this.beta = { messages: { parse: async (req) => { sent = { req, o }; return { stop_reason: 'end_turn', parsed_output: { intro: 'สวัสดี', approach: 'ขั้นตอน', nextSteps: 'ลงนาม' } }; } } }; } } }, loaded: true, id: sdkPath };
  process.env.ANTHROPIC_API_KEY = 'test';
  try {
    const r = await call(proposal, body, { authorization: 'Bearer fake-token-' + A.id });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { intro: 'สวัสดี', approach: 'ขั้นตอน', nextSteps: 'ลงนาม' });
    assert.equal(sent.req.model, 'claude-opus-5-5');
    assert.match(sent.req.system, /Never state prices/);
    assert.match(sent.req.system, /Thai/);
    assert.match(sent.req.messages[0].content, /^<proposal_input>/);
    assert.ok(sent.o.timeout < 60000);
  } finally { delete process.env.ANTHROPIC_API_KEY; delete require.cache[sdkPath]; }
});
