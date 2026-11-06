'use strict';
const { email, str, handler, httpError, sha256, REF_RE } = require('./_lib');
const { limited, clientIp } = require('./_limit');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

module.exports = handler(async (body, req) => {
  if (body.company) return { ok: true }; // honeypot
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw httpError(503, 'Waitlist is temporarily unavailable');
  const blob = require('@vercel/blob');
  const ip = clientIp(req);
  // Fail open: never block real sign-ups on a limiter error.
  if (ip && await limited('waitlist', ip, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
    throw httpError(429, 'Too many requests, try again in a few minutes');
  }
  const addr = email(body.email, 'Email');
  if (!addr) throw httpError(400, 'Email is required');
  const plan = ['free', 'pro', 'agency'].includes(body.plan) ? body.plan : 'free';
  const note = str(body.note, 300, 'Note', false);
  const ref = typeof body.ref === 'string' && REF_RE.test(body.ref) ? body.ref : undefined;
  await blob.put(`waitlist/${sha256(addr).slice(0, 24)}.json`,
    JSON.stringify({ email: addr, plan, note, ref, at: new Date().toISOString() }),
    { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  return { ok: true };
});
