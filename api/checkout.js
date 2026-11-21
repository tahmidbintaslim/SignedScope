'use strict';
// Billing, in one function to stay within the Hobby function limit:
//   GET  /api/checkout?plan=pro|agency[&ref=<user id>&email=<email>]
//        Redirects to the Stripe Payment Link for the plan (falls back to the waitlist).
//        ref/email are passed to Stripe as client_reference_id/prefilled_email so the
//        webhook can match the payment to the account.
//   POST /api/checkout   (Stripe webhook, header "stripe-signature")
//        checkout.session.completed      -> profiles.plan = pro|agency
//        customer.subscription.deleted   -> profiles.plan = starter
//        customer.subscription.updated   -> starter when the subscription stops being active
// No Stripe SDK: the signature is checked with HMAC-SHA256 as Stripe documents.
const crypto = require('node:crypto');
const db = require('./_supabase');

const REF_RE = /^[A-Za-z0-9_-]{1,200}$/;
const TOLERANCE = 300; // seconds; Stripe's default replay window
const MAX_BODY = 256 * 1024;

const links = () => ({ pro: process.env.STRIPE_LINK_PRO, agency: process.env.STRIPE_LINK_AGENCY });

function redirect(req, res) {
  const q = req.query || {};
  const plan = String(q.plan || '');
  const base = links()[plan];
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = 302;
  if (!base || !/^https:\/\/(buy|checkout)\.stripe\.com\//.test(base)) {
    res.setHeader('Location', `/?plan=${encodeURIComponent(plan)}#waitlist`);
    return res.end();
  }
  const url = new URL(base);
  if (REF_RE.test(String(q.ref || ''))) url.searchParams.set('client_reference_id', q.ref);
  const email = String(q.email || '');
  if (email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) url.searchParams.set('prefilled_email', email);
  res.setHeader('Location', url.toString());
  res.end();
}

/** Raw request body (needed byte-for-byte for the signature). */
async function rawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Too large'), { status: 413 });
    chunks.push(Buffer.from(c));
  }
  if (chunks.length) return Buffer.concat(chunks);
  // Local dev server pre-reads the body into a string.
  if (typeof req.body === 'string') return Buffer.from(req.body);
  return Buffer.alloc(0);
}

/** True when header "t=..,v1=.." signs `${t}.${payload}` with one of the secrets, within tolerance. */
function verifySignature(payload, header, secrets, now = Math.floor(Date.now() / 1000)) {
  const parts = String(header || '').split(',').map((p) => p.trim().split('='));
  const t = Number((parts.find(([k]) => k === 't') || [])[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v).filter((v) => /^[0-9a-f]{64}$/.test(v));
  if (!Number.isInteger(t) || !sigs.length || Math.abs(now - t) > TOLERANCE) return false;
  return secrets.some((secret) => {
    const want = crypto.createHmac('sha256', secret).update(`${t}.`).update(payload).digest();
    return sigs.some((s) => crypto.timingSafeEqual(want, Buffer.from(s, 'hex')));
  });
}

// Payment Link id (plink_...) -> plan. Set from the Stripe dashboard ids of the two links.
function planForLink(id) {
  if (id && id === process.env.STRIPE_PLINK_PRO) return 'pro';
  if (id && id === process.env.STRIPE_PLINK_AGENCY) return 'agency';
  return null;
}

async function setPlan(match, fields) {
  const [col, val] = match;
  const { error } = await db.admin().from('profiles').update(fields).eq(col, val);
  if (error) throw new Error('profiles update: ' + error.message);
}

async function handleEvent(evt) {
  const o = (evt && evt.data && evt.data.object) || {};
  switch (evt.type) {
    case 'checkout.session.completed': {
      const plan = planForLink(o.payment_link);
      const ref = String(o.client_reference_id || '');
      if (!plan || !REF_RE.test(ref)) return 'ignored';
      await setPlan(['id', ref], {
        plan,
        stripe_customer_id: typeof o.customer === 'string' ? o.customer : null,
        stripe_subscription_id: typeof o.subscription === 'string' ? o.subscription : null,
      });
      return 'upgraded';
    }
    case 'customer.subscription.updated':
      // Still paying (or in a grace period): leave the plan alone.
      if (['active', 'trialing', 'past_due'].includes(o.status)) return 'ignored';
    // falls through
    case 'customer.subscription.deleted':
      if (typeof o.id !== 'string' || !o.id) return 'ignored';
      await setPlan(['stripe_subscription_id', o.id], { plan: 'starter' });
      return 'downgraded';
    default:
      return 'ignored';
  }
}

async function webhook(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET_PREVIOUS].filter(Boolean);
  if (!secrets.length || !db.configured()) return res.status(503).json({ error: 'Billing is not set up' });
  let payload;
  try { payload = await rawBody(req); } catch (e) { return res.status(e.status || 400).json({ error: 'Bad body' }); }
  if (!verifySignature(payload, req.headers['stripe-signature'], secrets)) return res.status(400).json({ error: 'Bad signature' });
  let evt;
  try { evt = JSON.parse(payload.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  try {
    const result = await handleEvent(evt);
    return res.status(200).json({ received: true, result });
  } catch (e) {
    console.error('stripe webhook', evt.type, e.message);
    return res.status(500).json({ error: 'Unexpected error' }); // Stripe retries
  }
}

module.exports = (req, res) => (req.method === 'POST' ? webhook(req, res) : redirect(req, res));
module.exports._verifySignature = verifySignature;
