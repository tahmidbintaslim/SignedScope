'use strict';
// Turns a pasted client message or brief into draft line items for the agency to edit.
// Nothing here is sealed: the agency reviews every line before creating a link.
// With ANTHROPIC_API_KEY set, Claude drafts the items; otherwise (or on any error) a
// rule-based splitter does, so the feature never blocks.
const { str, handler, httpError } = require('./_lib');

const MAX_INPUT = 6000;
const MAX_DRAFT = 30;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
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

// Rule-based fallback: one item per line or sentence; "not / no / exclude" lines become exclusions.
function ruleDraft(text, kind) {
  const parts = text
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((l) => l.replace(/^\s*([-*•]|\d+[.)]|\[\s?\])\s*/, '').replace(/^(also|and|plus|oh,?|hey,?|hi,?)\s+/i, '').trim())
    .filter((l) => l.length > 3 && !/^(thanks|thank you|cheers|regards|best)\b/i.test(l) && !/^(hey|hi|hello|dear)\b[\w ]{0,20}[!.,]*$/i.test(l));
  return parts.slice(0, MAX_DRAFT).map((t) => ({
    kind: /\b(not included|exclude|out of scope|won't|will not|no need)\b/i.test(t) ? 'out' : kind,
    text: t.slice(0, 600),
  }));
}

let schema;
function aiSchema() {
  if (!schema) {
    const { z } = require('zod');
    schema = z.object({
      items: z.array(z.object({
        kind: z.enum(['scope', 'uat', 'out']),
        text: z.string(),
      })),
    });
  }
  return schema;
}

const SYSTEM = `You turn a client's message or project brief into line items for a scope sign-off.
Write one item per distinct deliverable or request, in plain words a non-technical client understands, at most 25 words each.
kind is "scope" for work to deliver, "uat" for an acceptance check the client can test ("Checkout works on iPhone Safari"), "out" for something explicitly excluded.
Keep the client's meaning; do not add work they did not ask for, and do not estimate prices or hours.
Ignore greetings, sign-offs and small talk. If there is nothing to extract, return an empty list.`;

async function aiDraft(text, kind) {
  const Anthropic = require('@anthropic-ai/sdk').default;
  const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
  const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
  const res = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: zodOutputFormat(aiSchema()) },
    system: SYSTEM,
    messages: [{ role: 'user', content: `Default kind for new work: ${kind}.\n\n<client_text>\n${text}\n</client_text>` }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error(`AI draft unavailable (${res.stop_reason})`);
  return res.parsed_output.items
    .map((it) => ({ kind: it.kind, text: String(it.text).trim().slice(0, 600) }))
    .filter((it) => it.text)
    .slice(0, MAX_DRAFT);
}

module.exports = handler(async (body, req) => {
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (limited(ip)) throw httpError(429, 'Too many drafts, try again in a few minutes');
  const text = str(body.text, MAX_INPUT, 'Message');
  const kind = ['scope', 'uat', 'out'].includes(body.kind) ? body.kind : 'scope';
  if (process.env.ANTHROPIC_API_KEY && body.mode !== 'rules') {
    try {
      const items = await aiDraft(text, kind);
      if (items.length) return { items, source: 'ai' };
    } catch (e) {
      console.error('draft: AI failed, using rules', e.message);
    }
  }
  return { items: ruleDraft(text, kind), source: 'rules' };
});
module.exports.ruleDraft = ruleDraft;
