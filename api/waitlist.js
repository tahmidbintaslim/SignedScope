'use strict';
const crypto = require('crypto');
const { email, str, handler, httpError, sha256 } = require('./_lib');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const RL_PREFIX = 'ratelimit/';

// Fast path: per-instance memory. Instances are short-lived and many, so the
// Blob-backed check below is what actually holds across the deployment.
const hits = new Map();
function limitedInMemory(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

// Durable path: one empty marker blob per attempt under ratelimit/<window>/<ipHash>/.
// IPs are stored only as a keyed hash.
async function limitedDurable(blob, ip) {
  const win = Math.floor(Date.now() / WINDOW_MS);
  const ipHash = crypto.createHmac('sha256', process.env.SIGNING_SECRET || '').update(ip).digest('hex').slice(0, 20);
  const prefix = `${RL_PREFIX}${win}/${ipHash}/`;
  const { blobs } = await blob.list({ prefix, limit: MAX_PER_WINDOW + 1 });
  if (blobs.length >= MAX_PER_WINDOW) return true;
  await blob.put(prefix + crypto.randomBytes(6).toString('hex'), '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
  if (Math.random() < 0.05) cleanup(blob, win).catch((e) => console.error('ratelimit cleanup', e));
  return false;
}

async function cleanup(blob, win) {
  const { blobs } = await blob.list({ prefix: RL_PREFIX, limit: 1000 });
  const stale = blobs.filter((b) => Number(b.pathname.split('/')[1]) < win - 1).map((b) => b.url);
  if (stale.length) await blob.del(stale);
}

module.exports = handler(async (body, req) => {
  if (body.company) return { ok: true }; // honeypot
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw httpError(503, 'Waitlist is temporarily unavailable');
  const blob = require('@vercel/blob');
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (ip && (limitedInMemory(ip) || await limitedDurable(blob, ip).catch((e) => {
    console.error('ratelimit check failed, allowing request', e);
    return false; // fail open: never block real sign-ups on a limiter error
  }))) {
    throw httpError(429, 'Too many requests, try again in a few minutes');
  }
  const addr = email(body.email, 'Email');
  if (!addr) throw httpError(400, 'Email is required');
  const plan = ['free', 'pro', 'agency'].includes(body.plan) ? body.plan : 'free';
  const note = str(body.note, 300, 'Note', false);
  const ref = typeof body.ref === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/.test(body.ref) ? body.ref : undefined;
  await blob.put(`waitlist/${sha256(addr).slice(0, 24)}.json`,
    JSON.stringify({ email: addr, plan, note, ref, at: new Date().toISOString() }),
    { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  return { ok: true };
});
