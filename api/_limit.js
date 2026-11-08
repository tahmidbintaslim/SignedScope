'use strict';
// Shared rate limiter. Per-instance memory is the fast path. The durable check holds across
// instances: an atomic counter in Postgres (public.bump_rate) when Supabase is configured,
// otherwise one empty marker blob per hit in Vercel Blob. Keys are stored only as a keyed hash.
const crypto = require('crypto');

const RL_PREFIX = 'ratelimit/';
const memory = new Map();

// Vercel sets x-vercel-forwarded-for / x-real-ip at its edge (client values are overwritten).
// Requests without an IP share one bucket instead of skipping the limit.
function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64) || 'no-ip';
}

// A key derived for the limiter only, so the signing secret itself is never used here.
const keyHash = (key) => crypto.createHmac('sha256', crypto.createHash('sha256').update('ratelimit:' + (process.env.SIGNING_SECRET || '')).digest())
  .update(key).digest('hex').slice(0, 20);

function inMemory(key, windowMs, max) {
  const now = Date.now();
  const recent = (memory.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  memory.set(key, recent);
  if (memory.size > 5000) memory.clear();
  return recent.length > max;
}

async function durable(blob, scope, key, windowMs, max) {
  const win = Math.floor(Date.now() / windowMs);
  const prefix = `${RL_PREFIX}${scope}/${win}/${keyHash(key)}/`;
  const { blobs } = await blob.list({ prefix, limit: max + 1 });
  if (blobs.length >= max) return true;
  await blob.put(prefix + crypto.randomBytes(6).toString('hex'), '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
  if (Math.random() < 0.05) cleanup(blob).catch((e) => console.error('ratelimit cleanup', e));
  return false;
}

// Deletes markers from windows that have ended (marker paths: ratelimit/<scope>/<window>/...).
async function cleanup(blob) {
  const { blobs } = await blob.list({ prefix: RL_PREFIX, limit: 1000 });
  const now = Date.now();
  const stale = blobs.filter((b) => now - new Date(b.uploadedAt).getTime() > 24 * 60 * 60 * 1000).map((b) => b.url);
  if (stale.length) await blob.del(stale);
}

// Returns true when `key` has used up `max` hits in the current window.
// failOpen: on a storage error, allow (true) or block (false) the request.
// memoryOnly: skip the durable check (for cheap, high-volume endpoints).
async function limited(scope, key, { windowMs, max, failOpen = true, memoryOnly = false }) {
  if (inMemory(`${scope}:${key}`, windowMs, max)) return true;
  if (memoryOnly) return false;
  try {
    const db = require('./_supabase');
    if (db.configured()) {
      const { data, error } = await db.admin().rpc('bump_rate', { k: `${scope}:${keyHash(key)}`, window_seconds: Math.ceil(windowMs / 1000) });
      if (error) throw new Error(error.message);
      return Number(data) > max;
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
    return await durable(require('@vercel/blob'), scope, key, windowMs, max);
  } catch (e) {
    console.error(`ratelimit ${scope} check failed`, e.message);
    return !failOpen;
  }
}

module.exports = { limited, clientIp };
