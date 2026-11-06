'use strict';
// Shared rate limiter. Per-instance memory is the fast path; when Blob storage is
// configured, a durable check (one empty marker blob per hit) holds across instances.
// Keys are stored only as a keyed hash, never raw IPs.
const crypto = require('crypto');

const RL_PREFIX = 'ratelimit/';
const memory = new Map();

function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
}

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
  const keyHash = crypto.createHmac('sha256', process.env.SIGNING_SECRET || '').update(key).digest('hex').slice(0, 20);
  const prefix = `${RL_PREFIX}${scope}/${win}/${keyHash}/`;
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
  if (memoryOnly || !process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    return await durable(require('@vercel/blob'), scope, key, windowMs, max);
  } catch (e) {
    console.error(`ratelimit ${scope} check failed`, e.message);
    return !failOpen;
  }
}

module.exports = { limited, clientIp };
