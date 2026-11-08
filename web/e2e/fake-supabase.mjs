// A fake Supabase for browser tests: /api/config points at https://test.supabase.co, a session is
// placed in localStorage, and PostgREST calls are answered from in-memory tables. No network.
export const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'mai@studio.test' };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function fakeJwt(aal = 'aal1') {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER.id, email: USER.email, aal, amr: [{ method: 'otp', timestamp: now }], role: 'authenticated', exp: now + 3600, iat: now })}.sig`;
}

export function seed(overrides = {}) {
  const now = new Date().toISOString();
  return {
    profiles: [{ id: USER.id, name: null, business_name: null, email: USER.email, currency: 'USD', hourly_rate: null, lang: 'en', pay_instructions: null, notify_signed: true, notify_viewed: false, notify_overdue: true, country: null, time_zone: null, onboarded_at: null, ...overrides.profile }],
    clients: overrides.clients ?? [],
    projects: overrides.projects ?? [],
    documents: overrides.documents ?? [],
    payments: overrides.payments ?? [],
    activity: overrides.activity ?? [],
    estimates: [],
    _now: now,
  };
}

/** Wires the fake into a Playwright page (call before the first goto). Returns the live tables. */
export async function installFake(page, tables, { signedIn = true } = {}) {
  await page.route('**/api/config', (r) => r.fulfill({ json: { enabled: true, supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'anon' } }));
  if (signedIn) {
    const session = { access_token: fakeJwt(), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: USER.id, email: USER.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, factors: [] } };
    // Seed once per tab, so signing out really clears it.
    await page.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('sb-test-auth-token', JSON.stringify(s)); } }, session);
  }
  await page.route('https://test.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith('/auth/v1/')) {
      if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204, body: '' });
      if (url.pathname.endsWith('/otp')) return route.fulfill({ json: {} });
      return route.fulfill({ json: { id: USER.id, email: USER.email, factors: [] } });
    }
    const table = url.pathname.replace('/rest/v1/', '');
    const rows = tables[table] ?? (tables[table] = []);
    const wantsOne = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const filters = [...url.searchParams].filter(([k]) => !['select', 'order', 'limit', 'columns', 'on_conflict'].includes(k));
    const match = (row) => filters.every(([k, v]) => !v.startsWith('eq.') || String(row[k]) === v.slice(3));
    const reply = (data) => route.fulfill({ status: 200, contentType: 'application/json', json: wantsOne ? (Array.isArray(data) ? data[0] ?? null : data) : data });
    if (req.method() === 'GET') return reply(rows.filter(match));
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const list = (Array.isArray(body) ? body : [body]).map((b) => ({ id: b.id ?? crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...b }));
      if (table === 'activity') list.forEach((a, i) => { a.id = rows.length + i + 1; a.detail = a.detail ?? {}; });
      rows.unshift(...list);
      return reply(Array.isArray(body) ? list : list[0]);
    }
    if (req.method() === 'PATCH') {
      const patch = JSON.parse(req.postData() || '{}');
      const hit = rows.filter(match);
      hit.forEach((r) => Object.assign(r, patch, { updated_at: new Date().toISOString() }));
      return reply(hit);
    }
    if (req.method() === 'DELETE') { const keep = rows.filter((r) => !match(r)); tables[table] = keep; return reply([]); }
    return route.fulfill({ status: 405, body: '' });
  });
  return tables;
}
