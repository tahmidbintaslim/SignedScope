'use strict';
// Clerk session token checks (api/_clerk.js) against a locally generated RSA key served as JWKS.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

const host = 'cheerful-camel-9096.clerk.accounts.dev';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_' + Buffer.from(host + '$').toString('base64');
const clerk = require('../api/_clerk');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
function token(claims = {}, header = {}, key = privateKey) {
  const h = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...header });
  const p = b64({ iss: `https://${host}`, sub: 'user_123', email: 'mai@studio.test', azp: 'https://signedscope.tahmid.space', iat: now, nbf: now - 1, exp: now + 60, ...claims });
  return `${h}.${p}.${crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`), key).toString('base64url')}`;
}

test('issuer comes from the publishable key', () => {
  assert.equal(clerk.issuer(), `https://${host}`);
  assert.equal(clerk.issuer('nope'), null);
});

test('verifies Clerk session tokens and rejects bad ones', async () => {
  const realFetch = global.fetch;
  let fetched = 0;
  global.fetch = async (url) => { fetched++; assert.equal(url, `https://${host}/.well-known/jwks.json`); return { ok: true, json: async () => ({ keys: [jwk] }) }; };
  clerk._reset();
  try {
    const opts = { allowedOrigins: ['https://signedscope.tahmid.space'] };
    assert.deepEqual(await clerk.verify(token(), opts), { id: 'user_123', email: 'mai@studio.test' });
    assert.equal(await clerk.verify(token({ iss: 'https://evil.example' }), opts), null, 'other issuer');
    assert.equal(await clerk.verify(token({ exp: now - 60 }), opts), null, 'expired');
    assert.equal(await clerk.verify(token({ nbf: now + 120 }), opts), null, 'not yet valid');
    assert.equal(await clerk.verify(token({ azp: 'https://evil.example' }), opts), null, 'made for another site');
    assert.equal(await clerk.verify(token({ sub: '' }), opts), null, 'no subject');
    assert.equal(await clerk.verify(token({}, { alg: 'HS256' }), opts), null, 'alg swap');
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    assert.equal(await clerk.verify(token({}, {}, other), opts), null, 'signed by another key');
    const [h, , sig] = token().split('.');
    assert.equal(await clerk.verify(`${h}.${b64({ iss: `https://${host}`, sub: 'user_admin', exp: now + 60 })}.${sig}`, opts), null, 'tampered claims');
    assert.equal(await clerk.verify('not-a-jwt', opts), null);
    assert.ok(fetched <= 2, 'keys are cached');
  } finally { global.fetch = realFetch; }
});
