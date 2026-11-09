// A fake Supabase and Clerk for browser tests: /api/config points at https://test.supabase.co, a
// stand-in Clerk (window.__ssTestClerk) holds the session, and PostgREST calls are answered from
// in-memory tables. No network.
export const USER = { id: 'user_2fakeMaiStudio0000000000', email: 'mai@studio.test' };

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

// Column defaults the real tables apply on insert.
const DEFAULTS = { projects: { status: 'lead', currency: 'USD' }, payments: { status: 'requested' } };

/** Wires the fake into a Playwright page (call before the first goto). Returns the live tables. */
export async function installFake(page, tables, { signedIn = true } = {}) {
  await page.route('**/api/config', (r) => r.fulfill({ json: { enabled: true, supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'anon' } }));
  // Signed in once per tab, so signing out really clears it. mountSignIn draws a marker the
  // login test looks for; openUserProfile records that the account panel was opened.
  await page.addInitScript(({ signedIn, user, token }) => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); sessionStorage.setItem('fake-user', signedIn ? '1' : ''); }
    const listeners = new Set();
    const me = () => (sessionStorage.getItem('fake-user') ? { id: user.id, fullName: '', hasImage: false, imageUrl: '', primaryEmailAddress: { emailAddress: user.email } } : null);
    const fake = {
      get user() { return me(); },
      get session() { return me() ? { getToken: async () => token } : null; },
      addListener(fn) { listeners.add(fn); fn({ user: me() }); return () => listeners.delete(fn); },
      async signOut() { sessionStorage.setItem('fake-user', ''); listeners.forEach((fn) => fn({ user: null })); },
      mountSignIn(el) { el.innerHTML = '<p data-testid="clerk-sign-in">Clerk sign-in</p>'; },
      unmountSignIn(el) { el.innerHTML = ''; },
      openUserProfile() { window.__ssOpenedProfile = true; },
    };
    window.__ssTestClerk = fake;
  }, { signedIn, user: USER, token: fakeJwt() });
  await page.route('https://test.supabase.co/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith('/auth/v1/')) {
      const path = url.pathname.slice('/auth/v1'.length);
      if (path === '/logout') return route.fulfill({ status: 204, body: '' });
      if (path === '/otp') return route.fulfill({ json: {} });
      return route.fulfill({ json: { id: USER.id, email: USER.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } });
    }
    if (url.pathname.startsWith('/storage/v1/')) return storage(route, req, url, tables);
    const table = url.pathname.replace('/rest/v1/', '');
    const rows = tables[table] ?? (tables[table] = []);
    const wantsOne = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const filters = [...url.searchParams].filter(([k]) => !['select', 'order', 'limit', 'columns', 'on_conflict'].includes(k));
    const match = (row) => filters.every(([k, v]) => (v.startsWith('eq.') ? String(row[k]) === v.slice(3) : v.startsWith('in.(') ? v.slice(4, -1).split(',').map((x) => x.replace(/^"|"$/g, '')).includes(String(row[k])) : true));
    const reply = (data) => route.fulfill({ status: 200, contentType: 'application/json', json: wantsOne ? (Array.isArray(data) ? data[0] ?? null : data) : data });
    if (req.method() === 'GET') return reply(rows.filter(match));
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const list = (Array.isArray(body) ? body : [body]).map((b) => ({ id: b.id ?? crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...DEFAULTS[table], ...b }));
      if (table === 'activity') list.forEach((a, i) => { a.id = rows.length + i + 1; a.detail = a.detail ?? {}; });
      rows.unshift(...list);
      return reply(Array.isArray(body) ? list : list[0]);
    }
    if (req.method() === 'PATCH') {
      const patch = JSON.parse(req.postData() || '{}');
      // tables._missing = ['country', …] acts like a database without those columns (migration not applied).
      const unknown = (tables._missing ?? []).find((c) => c in patch);
      if (unknown) return route.fulfill({ status: 400, json: { code: 'PGRST204', message: `Could not find the '${unknown}' column of '${table}' in the schema cache` } });
      const hit = rows.filter(match);
      hit.forEach((r) => Object.assign(r, patch, { updated_at: new Date().toISOString() }));
      return reply(hit);
    }
    if (req.method() === 'DELETE') { const keep = rows.filter((r) => !match(r)); tables[table] = keep; return reply([]); }
    return route.fulfill({ status: 405, body: '' });
  });
  return tables;
}

// Supabase Storage: list, upload, signed URL and remove, for the "vault" bucket only.
function storage(route, req, url, tables) {
  const files = tables._files ?? (tables._files = []);
  const path = decodeURIComponent(url.pathname.slice('/storage/v1/object'.length));
  const body = () => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } };
  if (path === '/list/vault') {
    const prefix = body().prefix.replace(/\/$/, '') + '/';
    return route.fulfill({ json: files.filter((f) => f.path.startsWith(prefix)).map((f) => ({ name: f.path.slice(prefix.length), id: f.path, created_at: f.created_at, metadata: { size: f.size } })) });
  }
  if (path.startsWith('/sign/vault/')) return route.fulfill({ json: { signedURL: `/object/sign/vault/${path.slice(12)}?token=t` } });
  if (path === '/vault' && req.method() === 'DELETE') {
    const gone = body().prefixes || [];
    tables._files = files.filter((f) => !gone.includes(f.path));
    return route.fulfill({ json: gone.map((name) => ({ name })) });
  }
  if (path.startsWith('/vault/') && req.method() === 'POST') {
    const p = path.slice(7);
    files.unshift({ path: p, size: (req.postDataBuffer() || Buffer.alloc(0)).length, created_at: new Date().toISOString() });
    return route.fulfill({ json: { Key: 'vault/' + p, Id: p } });
  }
  return route.fulfill({ status: 404, json: { error: 'not found' } });
}
