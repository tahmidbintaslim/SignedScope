// Prints visit counts per ?ref= tag and day, waitlist sign-ups per ref, and estimator feedback.
// Usage: BLOB_READ_WRITE_TOKEN=... node scripts/ref-report.js
const { list, get } = require('@vercel/blob');

async function all(prefix) {
  const out = []; let cursor;
  do { const r = await list({ prefix, cursor, limit: 1000 }); out.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  return out;
}

(async () => {
  const visits = {};
  for (const b of await all('refs/')) {
    const [, ref, day] = b.pathname.split('/');
    visits[ref] = visits[ref] || {}; visits[ref][day] = (visits[ref][day] || 0) + 1;
  }
  console.log('Visits by ref');
  for (const [ref, days] of Object.entries(visits)) {
    const total = Object.values(days).reduce((a, b) => a + b, 0);
    console.log(`  ${ref.padEnd(20)} ${String(total).padStart(5)}   ${Object.entries(days).sort().map(([d, n]) => `${d}:${n}`).join('  ')}`);
  }
  const signups = {};
  for (const b of await all('waitlist/')) {
    try {
      const res = await get(b.pathname, { access: 'private' });
      const j = JSON.parse(await new Response(res.stream).text());
      const k = j.ref || '(none)'; signups[k] = (signups[k] || 0) + 1;
    } catch { /* skip unreadable entries */ }
  }
  console.log('Waitlist sign-ups by ref');
  for (const [ref, n] of Object.entries(signups)) console.log(`  ${ref.padEnd(20)} ${String(n).padStart(5)}`);
  // Estimator test: "Would you send this estimate to a real client?" (sample runs excluded).
  const fb = { as_is: 0, with_edits: 0, no: 0 }; const notes = [];
  for (const b of await all('feedback/estimate/')) {
    try {
      const res = await get(b.pathname, { access: 'private' });
      const j = JSON.parse(await new Response(res.stream).text());
      if (j.sample || !(j.answer in fb)) continue;
      fb[j.answer]++; if (j.note) notes.push(`[${j.answer}/${j.lang || '?'}] ${j.note}`);
    } catch { /* skip unreadable entries */ }
  }
  const total = fb.as_is + fb.with_edits + fb.no;
  console.log('Estimator feedback (would send to a real client)');
  for (const [k, n] of Object.entries(fb)) console.log(`  ${k.padEnd(20)} ${String(n).padStart(5)}   ${total ? Math.round((n / total) * 100) : 0}%`);
  for (const n of notes) console.log('  - ' + n);
})().catch((e) => { console.error(e.message); process.exit(1); });
