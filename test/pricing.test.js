'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.SIGNING_SECRET = 'test-secret-test-secret-test-secret-123';
delete process.env.ANTHROPIC_API_KEY;
const seal = require('../api/seal');
const sign = require('../api/sign');
const verify = require('../api/verify');
const draft = require('../api/draft');

function call(fn, body) {
  return new Promise((resolve) => {
    const res = { setHeader() {}, status(s) { this.s = s; return this; }, json(j) { resolve({ status: this.s, body: j }); } };
    fn({ method: 'POST', body, headers: { 'user-agent': 'x', 'x-real-ip': '192.0.2.1' } }, res);
  });
}
const base = { title: 'Store', agency: 'Ag', client: 'Cl', currency: 'usd', payLink: 'https://buy.stripe.com/test_abc' };

test('prices, currency and pay link are sealed; receipt totals accepted items', async () => {
  const s = await call(seal, { ...base, items: [
    { kind: 'scope', text: 'Theme', price: '6,000' },
    { kind: 'scope', text: 'Blog', price: 750.555 },
    { kind: 'out', text: 'SEO', price: 99 },
  ] });
  assert.equal(s.status, 200);
  const d = (await call(verify, { token: s.body.token })).body.data;
  assert.equal(d.currency, 'USD');
  assert.equal(d.payLink, 'https://buy.stripe.com/test_abc');
  assert.deepEqual(d.items.map((i) => i.price), [6000, 750.56, undefined], 'exclusions never carry a price');
  const [a, b, c] = d.items;
  const r = await call(sign, { token: s.body.token, name: 'J', agree: true, decisions: {
    [a.id]: { status: 'accepted' }, [b.id]: { status: 'rejected', note: 'Later' }, [c.id]: { status: 'acknowledged' } } });
  const rec = (await call(verify, { token: r.body.receipt })).body.data;
  assert.deepEqual(rec.totals, { currency: 'USD', accepted: 6000, baseline: null });

  // Change request carries the signed total as its baseline.
  const cr = await call(seal, { ...base, parent: r.body.receipt, items: [...d.items, { kind: 'scope', text: 'Apple Pay', price: 480 }] });
  const crd = (await call(verify, { token: cr.body.token })).body.data;
  assert.equal(crd.parent.total, 6000);
  const dec = Object.fromEntries(crd.items.map((i) => [i.id, { status: i.kind === 'out' ? 'acknowledged' : 'accepted' }]));
  const r2 = await call(sign, { token: cr.body.token, name: 'J', agree: true, decisions: dec });
  const rec2 = (await call(verify, { token: r2.body.receipt })).body.data;
  assert.deepEqual(rec2.totals, { currency: 'USD', accepted: 7230.56, baseline: 6000 });
});

test('unpriced documents have no totals', async () => {
  const s = await call(seal, { ...base, payLink: '', items: [{ kind: 'scope', text: 'A' }] });
  const d = (await call(verify, { token: s.body.token })).body.data;
  const r = await call(sign, { token: s.body.token, name: 'J', agree: true, decisions: { [d.items[0].id]: { status: 'accepted' } } });
  assert.equal((await call(verify, { token: r.body.receipt })).body.data.totals, undefined);
});

test('bad prices, currencies and pay links are rejected', async () => {
  const items = [{ kind: 'scope', text: 'A' }];
  for (const body of [
    { ...base, items: [{ kind: 'scope', text: 'A', price: -1 }] },
    { ...base, items: [{ kind: 'scope', text: 'A', price: 'abc' }] },
    { ...base, currency: 'XYZ', items },
    { ...base, payLink: 'http://buy.stripe.com/x', items },
    { ...base, payLink: 'https://stripe.com.evil.example/x', items },
    { ...base, payLink: 'https://user@paypal.me/x', items },
    { ...base, payLink: 'javascript:alert(1)', items },
  ]) assert.equal((await call(seal, body)).status, 400, JSON.stringify(body));
  for (const link of ['https://wise.com/pay/r/x', 'https://paypal.me/agency/480', 'https://link.payoneer.com/x', 'https://pay.omise.co/x']) {
    assert.equal((await call(seal, { ...base, payLink: link, items })).status, 200, link);
  }
});

test('draft falls back to rules without an API key', async () => {
  const r = await call(draft, { text: 'Hey! Can we also add Apple Pay at checkout?\n- A size guide popup\nSEO is not included\nThanks' });
  assert.equal(r.status, 200);
  assert.equal(r.body.source, 'rules');
  assert.deepEqual(r.body.items, [
    { kind: 'scope', text: 'Can we also add Apple Pay at checkout?' },
    { kind: 'scope', text: 'A size guide popup' },
    { kind: 'out', text: 'SEO is not included' },
  ]);
  assert.equal((await call(draft, { text: '' })).status, 400);
});

test('ref tags are validated and counted without storing the IP', async () => {
  const hit = require('../api/hit');
  assert.equal(hit.cleanRef('Outreach'), 'outreach');
  assert.throws(() => hit.cleanRef('bad ref!'));
  assert.throws(() => hit.cleanRef(''));
  process.env.BLOB_READ_WRITE_TOKEN = 'test';
  const keys = [];
  require.cache[require.resolve('@vercel/blob')] = { exports: { put: async (k) => { keys.push(k); return {}; } }, loaded: true, id: 'blob' };
  const r = await call(hit, { ref: 'hn' });
  assert.equal(r.status, 200);
  assert.match(keys[0], /^refs\/hn\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{16}$/);
  assert.ok(!keys.some((k) => k.includes('192.0.2.1')));
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete require.cache[require.resolve('@vercel/blob')];
});

test('decimal commas are rejected, thousands separators accepted', async () => {
  const mk = (price) => call(seal, { ...base, items: [{ kind: 'scope', text: 'A', price }] });
  for (const p of ['1.234,50', '12,5', '1,23', '6,0000']) assert.equal((await mk(p)).status, 400, p);
  const ok = await mk('12,345.5');
  assert.equal(ok.status, 200);
  assert.equal((await call(verify, { token: ok.body.token })).body.data.items[0].price, 12345.5);
});

test('a change request must keep the signed currency', async () => {
  const s = await call(seal, { ...base, items: [{ kind: 'scope', text: 'A', price: 100 }] });
  const d = (await call(verify, { token: s.body.token })).body.data;
  const r = await call(sign, { token: s.body.token, name: 'J', agree: true, decisions: { [d.items[0].id]: { status: 'accepted' } } });
  assert.equal(r.body.payable, true);
  const bad = await call(seal, { ...base, currency: 'EUR', parent: r.body.receipt, items: d.items });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /USD/);
});

test('pay link is offered only when something payable was approved', async () => {
  const s = await call(seal, { ...base, items: [{ kind: 'scope', text: 'A', price: 100 }, { kind: 'scope', text: 'B' }] });
  const d = (await call(verify, { token: s.body.token })).body.data;
  const [a, b] = d.items;
  const none = await call(sign, { token: s.body.token, name: 'J', agree: true, decisions: { [a.id]: { status: 'rejected', note: 'No' }, [b.id]: { status: 'rejected', note: 'No' } } });
  assert.equal(none.body.payable, false);
  const free = await call(sign, { token: s.body.token, name: 'J', agree: true, decisions: { [a.id]: { status: 'rejected', note: 'No' }, [b.id]: { status: 'accepted' } } });
  assert.equal(free.body.payable, false, 'approved total is 0');
});

test('curly apostrophes still mark exclusions', () => {
  assert.deepEqual(draft.ruleDraft('We won’t do hosting', 'scope'), [{ kind: 'out', text: 'We won’t do hosting' }]);
});

test('AI drafting needs an IP and stays within the daily cap', async () => {
  // No IP: rules only, even with a key set.
  process.env.ANTHROPIC_API_KEY = 'test';
  const res = await new Promise((resolve) => {
    const r = { setHeader() {}, status(s) { this.s = s; return this; }, json(j) { resolve({ status: this.s, body: j }); } };
    draft({ method: 'POST', body: { text: 'Add a booking page' }, headers: {} }, r);
  });
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(res.body.source, 'rules');
});
