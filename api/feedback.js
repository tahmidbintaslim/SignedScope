'use strict';
// Anonymous answer to "Would you send this estimate to a client?" so the prototype test
// can measure trust in the estimates. Stores the answer, optional note, language, ref tag
// and a few numbers about the estimate. No brief text, IP, cookie or email is stored.
const crypto = require('crypto');
const { str, handler, httpError, REF_RE } = require('./_lib');
const { limited, clientIp } = require('./_limit');

const ANSWERS = ['as_is', 'with_edits', 'no'];

module.exports = handler(async (body, req) => {
  const answer = ANSWERS.includes(body.answer) ? body.answer : null;
  if (!answer) throw httpError(400, 'Pick an answer');
  const note = str(body.note, 500, 'Note', false);
  const ip = clientIp(req);
  if (ip && await limited('feedback', ip, { windowMs: 60 * 60 * 1000, max: 20 })) throw httpError(429, 'Too many answers, thank you!');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: true, stored: false };
  const n = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : undefined);
  const record = {
    answer, note,
    lang: ['en', 'bn', 'th'].includes(body.lang) ? body.lang : undefined,
    ref: typeof body.ref === 'string' && REF_RE.test(body.ref) ? body.ref : undefined,
    features: n(body.features), hoursLow: n(body.hoursLow), hoursHigh: n(body.hoursHigh), edits: n(body.edits),
    sample: body.sample === true || undefined,
    at: new Date().toISOString(),
  };
  const day = record.at.slice(0, 10);
  await require('@vercel/blob').put(`feedback/estimate/${day}/${crypto.randomBytes(8).toString('hex')}.json`, JSON.stringify(record),
    { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
  return { ok: true, stored: true };
});
