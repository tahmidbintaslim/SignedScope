'use strict';
// Counts visits that arrive with a ?ref= tag (e.g. ?ref=outreach, ?ref=hn) so launch channels can be compared.
// One empty marker blob per visit under refs/<ref>/<YYYY-MM-DD>/. No IP, cookie or user agent is stored.
const crypto = require('crypto');
const { handler, httpError, REF_RE } = require('./_lib');
const { limited, clientIp } = require('./_limit');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const DAILY_CAP = Number(process.env.HIT_DAILY_CAP) || 5000;

const cleanRef = (v) => {
  const r = String(v || '').toLowerCase().trim();
  if (!REF_RE.test(r)) throw httpError(400, 'Invalid ref');
  return r;
};

module.exports = handler(async (body, req) => {
  const ref = cleanRef(body.ref);
  const ip = clientIp(req);
  // Memory-only on purpose: a durable check would double the Blob writes per visit.
  if (ip && await limited('hit', ip, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW, memoryOnly: true })) return { ok: true }; // silently drop floods; counts are a rough signal, not billing
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: true, stored: false };
  // A global daily cap keeps storage writes bounded even from many addresses.
  if (await limited('hit-day', 'all', { windowMs: 24 * 60 * 60 * 1000, max: DAILY_CAP, failOpen: false })) return { ok: true, stored: false };
  const blob = require('@vercel/blob');
  const day = new Date().toISOString().slice(0, 10);
  await blob.put(`refs/${ref}/${day}/${crypto.randomBytes(8).toString('hex')}`, '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
  return { ok: true, stored: true };
});
module.exports.cleanRef = cleanRef;
