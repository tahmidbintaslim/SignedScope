'use strict';
// Counts visits that arrive with a ?ref= tag (e.g. ?ref=outreach, ?ref=hn) so launch channels can be compared.
// One empty marker blob per visit under refs/<ref>/<YYYY-MM-DD>/. No IP, cookie or user agent is stored.
const crypto = require('crypto');
const { handler, httpError } = require('./_lib');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map();
function limited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const cleanRef = (v) => {
  const r = String(v || '').toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(r)) throw httpError(400, 'Invalid ref');
  return r;
};

module.exports = handler(async (body, req) => {
  const ref = cleanRef(body.ref);
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (limited(ip)) return { ok: true }; // silently drop floods; counts are a rough signal, not billing
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: true, stored: false };
  const blob = require('@vercel/blob');
  const day = new Date().toISOString().slice(0, 10);
  await blob.put(`refs/${ref}/${day}/${crypto.randomBytes(8).toString('hex')}`, '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
  return { ok: true, stored: true };
});
module.exports.cleanRef = cleanRef;
