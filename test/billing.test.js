'use strict';
// Billing: Payment Link redirect and the signed Stripe webhook that sets profiles.plan.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
process.env.SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_' + Buffer.from('test.clerk.accounts.dev$').toString('base64');
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_LINK_PRO = 'https://buy.stripe.com/test_pro';
process.env.STRIPE_PLINK_PRO = 'plink_pro';
process.env.STRIPE_PLINK_AGENCY = 'plink_agency';
const fake = require('./fake-supabase');
require.cache[require.resolve('@supabase/supabase-js')] = { exports: fake, loaded: true, id: 'supabase' };
const store = fake.__store;
const checkout = require('../api/checkout');

const U = 'user_2abcDEF';
const sign = (body, secret = 'whsec_test', t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

function post(obj, sig) {
  const body = JSON.stringify(obj);
  return new Promise((resolve) => {
    const req = Readable.from([Buffer.from(body)]);
    Object.assign(req, { method: 'POST', headers: { 'stripe-signature': sig === undefined ? sign(body) : sig } });
    const res = { setHeader() {}, status(s) { this.s = s; return this; }, json(j) { resolve({ status: this.s, body: j }); } };
    checkout(req, res);
  });
}
function get(query) {
  return new Promise((resolve) => {
    const h = {};
    const res = { statusCode: 0, setHeader(k, v) { h[k] = v; }, end() { resolve({ status: this.statusCode, location: h.Location }); } };
    checkout({ method: 'GET', query, headers: {} }, res);
  });
}
const rows = () => (store.tables.profiles = store.tables.profiles || []);
const profile = () => rows().find((p) => p.id === U);

test.beforeEach(() => {
  rows().length = 0;
  rows().push({ id: U, plan: 'starter' });
});

test('redirect adds the account reference and email; unknown plan goes to the waitlist', async () => {
  const r = await get({ plan: 'pro', ref: U, email: 'a@x.co' });
  assert.strictEqual(r.status, 302);
  const u = new URL(r.location);
  assert.strictEqual(u.origin + u.pathname, 'https://buy.stripe.com/test_pro');
  assert.strictEqual(u.searchParams.get('client_reference_id'), U);
  assert.strictEqual(u.searchParams.get('prefilled_email'), 'a@x.co');
  assert.ok(!new URL((await get({ plan: 'pro', ref: 'bad ref!' })).location).searchParams.has('client_reference_id'));
  assert.strictEqual((await get({ plan: 'agency' })).location, '/?plan=agency#waitlist'); // no link set
});

test('checkout.session.completed upgrades the referenced account', async () => {
  const r = await post({ type: 'checkout.session.completed', data: { object: { payment_link: 'plink_agency', client_reference_id: U, customer: 'cus_1', subscription: 'sub_1' } } });
  assert.deepStrictEqual([r.status, r.body.result], [200, 'upgraded']);
  assert.strictEqual(profile().plan, 'agency');
  assert.strictEqual(profile().stripe_subscription_id, 'sub_1');
});

test('unknown payment link or missing reference changes nothing', async () => {
  const r = await post({ type: 'checkout.session.completed', data: { object: { payment_link: 'plink_other', client_reference_id: U } } });
  assert.strictEqual(r.body.result, 'ignored');
  await post({ type: 'checkout.session.completed', data: { object: { payment_link: 'plink_pro' } } });
  assert.strictEqual(profile().plan, 'starter');
});

test('cancelled or unpaid subscription drops back to starter; past_due keeps the plan', async () => {
  Object.assign(profile(), { plan: 'pro', stripe_subscription_id: 'sub_9' });
  await post({ type: 'customer.subscription.updated', data: { object: { id: 'sub_9', status: 'past_due' } } });
  assert.strictEqual(profile().plan, 'pro');
  await post({ type: 'customer.subscription.updated', data: { object: { id: 'sub_9', status: 'unpaid' } } });
  assert.strictEqual(profile().plan, 'starter');
  Object.assign(profile(), { plan: 'pro' });
  await post({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_9' } } });
  assert.strictEqual(profile().plan, 'starter');
});

test('bad, missing, wrong-secret or stale signatures are rejected', async () => {
  const evt = { type: 'checkout.session.completed', data: { object: { payment_link: 'plink_pro', client_reference_id: U } } };
  const body = JSON.stringify(evt);
  assert.strictEqual((await post(evt, '')).status, 400);
  assert.strictEqual((await post(evt, sign(body, 'whsec_other'))).status, 400);
  assert.strictEqual((await post(evt, sign(body, 'whsec_test', Math.floor(Date.now() / 1000) - 600))).status, 400);
  assert.strictEqual(profile().plan, 'starter');
});

test('previous webhook secret still verifies during rotation', () => {
  const body = Buffer.from('{}');
  assert.ok(checkout._verifySignature(body, sign('{}', 'old'), ['new', 'old']));
  assert.ok(!checkout._verifySignature(body, sign('{}', 'old'), ['new']));
});
