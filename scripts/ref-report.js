// Prints visit counts per ?ref= tag and day, plus waitlist sign-ups per ref.
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
})().catch((e) => { console.error(e.message); process.exit(1); });
