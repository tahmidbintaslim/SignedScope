'use strict';
const crypto = require('crypto');

const MAX_BODY = 64 * 1024;
const MAX_ITEMS = 100;
const MAX_TEXT = 600;
const KINDS = ['scope', 'uat', 'out'];
const MAX_PRICE = 10_000_000;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'THB', 'BDT', 'VND', 'PHP', 'INR', 'MYR', 'IDR', 'JPY'];
// Pay links may only point at known payment providers, so a sealed link can't send a client to a lookalike site.
const PAY_HOSTS = ['stripe.com', 'wise.com', 'paypal.com', 'paypal.me', 'payoneer.com', 'omise.co', 'opn.ooo'];

function secret() {
  const s = process.env.SIGNING_SECRET;
  if (!s || s.length < 32) throw httpError(500, 'Server is not configured');
  return s;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Token format: v1.<base64url(json)>.<base64url(hmac-sha256("v1." + payload))>
function seal(obj) {
  const payload = b64(JSON.stringify(obj));
  const mac = crypto.createHmac('sha256', secret()).update('v1.' + payload).digest();
  return `v1.${payload}.${b64(mac)}`;
}

function open(token, expectedType) {
  if (typeof token !== 'string' || token.length > 200_000) throw httpError(400, 'Invalid token');
  const [v, payload, sig] = token.split('.');
  if (v !== 'v1' || !payload || !sig) throw httpError(400, 'Invalid token');
  const want = crypto.createHmac('sha256', secret()).update('v1.' + payload).digest();
  const got = Buffer.from(sig, 'base64url');
  // The last base64url character of a 32-byte MAC carries unused bits, so also require
  // the canonical encoding. Otherwise a link string with a changed final character still verifies.
  if (got.length !== want.length || b64(got) !== sig || !crypto.timingSafeEqual(got, want)) {
    throw httpError(400, 'Signature check failed: this link was modified or not issued by SignedScope');
  }
  const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (expectedType && obj.type !== expectedType) throw httpError(400, `Expected a ${expectedType} token`);
  return { obj, hash: sha256(payload) };
}

function str(v, max, field, required = true) {
  if (v == null || v === '') {
    if (required) throw httpError(400, `${field} is required`);
    return '';
  }
  if (typeof v !== 'string') throw httpError(400, `${field} must be text`);
  const t = v.trim();
  if (t.length > max) throw httpError(400, `${field} is too long (max ${max})`);
  if (required && !t) throw httpError(400, `${field} is required`);
  return t;
}

function email(v, field) {
  const t = str(v, 254, field, false);
  if (t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw httpError(400, `${field} is not a valid email`);
  return t.toLowerCase();
}

function items(list) {
  if (!Array.isArray(list) || list.length === 0) throw httpError(400, 'Add at least one item');
  if (list.length > MAX_ITEMS) throw httpError(400, `Too many items (max ${MAX_ITEMS})`);
  const seen = new Set();
  return list.map((it, i) => {
    const kind = KINDS.includes(it && it.kind) ? it.kind : null;
    if (!kind) throw httpError(400, `Item ${i + 1} has an invalid type`);
    let id = typeof it.id === 'string' && /^[a-z0-9]{1,16}$/.test(it.id) ? it.id : crypto.randomBytes(4).toString('hex');
    while (seen.has(id)) id = crypto.randomBytes(4).toString('hex');
    seen.add(id);
    const out = { id, kind, text: str(it.text, MAX_TEXT, `Item ${i + 1}`) };
    const p = price(it.price, `Item ${i + 1} price`);
    if (p != null && kind !== 'out') out.price = p;
    return out;
  });
}

// Optional money amount; stored as a number with at most 2 decimals.
function price(v, field) {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[, ]/g, '')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > MAX_PRICE) throw httpError(400, `${field} must be a number between 0 and ${MAX_PRICE}`);
  return Math.round(n * 100) / 100;
}

function currency(v) {
  if (v == null || v === '') return 'USD';
  const c = String(v).toUpperCase();
  if (!CURRENCIES.includes(c)) throw httpError(400, 'Unsupported currency');
  return c;
}

function payLink(v) {
  const t = str(v, 500, 'Payment link', false);
  if (!t) return '';
  let u;
  try { u = new URL(t); } catch { throw httpError(400, 'Payment link must be a full https:// URL'); }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || u.username || u.password || !PAY_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
    throw httpError(400, `Payment link must be https and on ${PAY_HOSTS.join(', ')}`);
  }
  return u.toString();
}

// Sum of prices for items the client accepted (exclusions never carry a price).
function acceptedTotal(items, decisions) {
  const cents = items.reduce((t, it) => t + (it.price != null && decisions[it.id] && decisions[it.id].status === 'accepted' ? Math.round(it.price * 100) : 0), 0);
  return cents / 100;
}

async function readJson(req) {
  if (req.method !== 'POST') throw httpError(405, 'Use POST');
  if (req.body && typeof req.body === 'object') {
    if (JSON.stringify(req.body).length > MAX_BODY) throw httpError(413, 'Request too large');
    return req.body;
  }
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw httpError(413, 'Request too large');
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw httpError(400, 'Invalid JSON');
  }
}

function handler(fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const body = await readJson(req);
      const out = await fn(body, req);
      res.status(200).json(out);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e);
      res.status(status).json({ error: status >= 500 && !e.status ? 'Unexpected error' : e.message });
    }
  };
}

module.exports = { seal, open, str, email, items, price, currency, payLink, acceptedTotal, handler, httpError, sha256, MAX_BODY, PAY_HOSTS, CURRENCIES };
