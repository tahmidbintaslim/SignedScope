'use strict';
// Verifies Clerk session tokens (RS256 JWTs) with Clerk's public keys (JWKS). No Clerk secret
// is needed: the issuer is derived from the publishable key, and keys are cached per instance.
const crypto = require('node:crypto');

const publishableKey = () => process.env.CLERK_PUBLISHABLE_KEY || '';

/** https://<frontend api host> from pk_test_/pk_live_ + base64("<host>$"). */
function issuer(pk = publishableKey()) {
  const m = /^pk_(test|live)_([A-Za-z0-9+/=_-]+)$/.exec(pk);
  if (!m) return null;
  const host = Buffer.from(m[2], 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
}

let jwks = { at: 0, keys: new Map() };
async function keyFor(kid, iss) {
  if (jwks.keys.has(kid) && Date.now() - jwks.at < 60 * 60 * 1000) return jwks.keys.get(kid);
  // Refetch at most once a minute (also when a new kid appears after key rotation).
  if (Date.now() - jwks.at > 60 * 1000 || !jwks.keys.size) {
    const r = await fetch(`${iss}/.well-known/jwks.json`);
    if (!r.ok) throw new Error('jwks ' + r.status);
    const { keys = [] } = await r.json();
    jwks = { at: Date.now(), keys: new Map(keys.filter((k) => k.kty === 'RSA').map((k) => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })])) };
  }
  return jwks.keys.get(kid) || null;
}

const part = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

/**
 * Returns { id, email } for a valid, unexpired token issued by this Clerk instance, else null.
 * allowedOrigins limits the "azp" (the site the token was made for) when the token has one.
 */
async function verify(token, { allowedOrigins = [], now = Date.now() / 1000 } = {}) {
  const iss = issuer();
  if (!iss || typeof token !== 'string') return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  let header, claims;
  try { header = part(h); claims = part(p); } catch { return null; }
  if (header.alg !== 'RS256' || !header.kid) return null;
  const key = await keyFor(header.kid, iss).catch(() => null);
  if (!key) return null;
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url'));
  if (!ok) return null;
  const skew = 5;
  if (claims.iss !== iss || typeof claims.sub !== 'string' || !claims.sub) return null;
  if (typeof claims.exp !== 'number' || claims.exp + skew < now) return null;
  if (typeof claims.nbf === 'number' && claims.nbf - skew > now) return null;
  if (claims.azp && allowedOrigins.length && !allowedOrigins.includes(claims.azp)) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
}

module.exports = { verify, issuer, publishableKey, _reset: () => { jwks = { at: 0, keys: new Map() }; } };
