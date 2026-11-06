'use strict';
// In-memory stand-in for the parts of @supabase/supabase-js that SignedScope uses.
// Works in Node (server tests) and in the browser (served in place of /vendor/supabase.js
// during UI tests). Row Level Security is NOT emulated here; test/db.test.js covers that.
(function (root) {
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
  // In the browser the fake keeps its data in localStorage so it survives page loads.
  const ls = root.localStorage;
  const saved = ls ? JSON.parse(ls.getItem('__fakeDb') || 'null') : null;
  const store = (root.__fakeDb = root.__fakeDb || saved || { tables: {}, user: null, factors: [], seq: 0 });
  const persist = () => { if (ls) ls.setItem('__fakeDb', JSON.stringify(store)); };
  const table = (t) => (store.tables[t] = store.tables[t] || []);
  const DEFAULTS = {
    projects: { status: 'lead', currency: 'USD' }, documents: { status: 'sent', kind: 'scope', revision: 1 },
    payments: { status: 'requested' }, profiles: { currency: 'USD', lang: 'en' }, activity: { detail: {} },
  };

  class Query {
    constructor(t) { this.t = t; this.filters = []; this.op = 'select'; this.sorts = []; this.max = Infinity; this.one = null; this.ret = false; }
    select() { if (this.op !== 'select') this.ret = true; return this; }
    insert(v) { this.op = 'insert'; this.val = v; return this; }
    update(v) { this.op = 'update'; this.val = v; return this; }
    upsert(v) { this.op = 'upsert'; this.val = v; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
    neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
    in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
    gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
    order(c, { ascending = true } = {}) { this.sorts.push([c, ascending]); return this; }
    limit(n) { this.max = n; return this; }
    single() { this.one = 'single'; return this; }
    maybeSingle() { this.one = 'maybe'; return this; }
    match(r) { return this.filters.every((f) => f(r)); }
    run() {
      const rows = table(this.t);
      let out;
      if (this.op === 'insert' || this.op === 'upsert') {
        const list = [].concat(this.val).map((v) => {
          const now = new Date(Date.now() + store.seq++).toISOString();
          const row = { id: this.t === 'activity' ? store.seq : uuid(), created_at: now, updated_at: now, ...(DEFAULTS[this.t] || {}), ...(store.user && this.t !== 'profiles' ? { owner: store.user.id } : {}), ...v };
          const i = this.op === 'upsert' ? rows.findIndex((r) => r.id === row.id) : -1;
          if (i >= 0) rows[i] = { ...rows[i], ...v }; else rows.push(row);
          return i >= 0 ? rows[i] : row;
        });
        out = list;
      } else if (this.op === 'update') {
        out = rows.filter((r) => this.match(r)).map((r) => Object.assign(r, this.val, { updated_at: new Date().toISOString() }));
      } else if (this.op === 'delete') {
        out = rows.filter((r) => this.match(r));
        store.tables[this.t] = rows.filter((r) => !this.match(r));
      } else {
        out = rows.filter((r) => this.match(r));
      }
      out = out.map((r) => ({ ...r }));
      for (const [c, asc] of this.sorts.slice().reverse()) out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      out = out.slice(0, this.max);
      if (this.op !== 'select' && !this.ret) return { data: null, error: null };
      if (this.one) {
        if (!out.length) return this.one === 'single' ? { data: null, error: { message: 'No rows' } } : { data: null, error: null };
        return { data: out[0], error: null };
      }
      return { data: out, error: null };
    }
    then(ok, bad) { return Promise.resolve().then(() => { const r = this.run(); if (this.op !== 'select') persist(); return r; }).then(ok, bad); }
  }

  const listeners = [];
  const session = () => (store.user ? { access_token: 'fake-token-' + store.user.id, user: store.user } : null);
  const auth = {
    async getSession() { return { data: { session: session() }, error: null }; },
    async getUser(token) {
      if (token) { const u = (store.users || []).find((x) => 'fake-token-' + x.id === token) || (store.user && token === 'fake-token-' + store.user.id ? store.user : null); return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: 'bad token' } }; }
      return { data: { user: store.user }, error: null };
    },
    onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
    async signInWithOtp({ email }) { store.lastOtp = email; return { data: {}, error: null }; },
    async signInWithOAuth({ provider }) { store.lastOAuth = provider; return { data: {}, error: null }; },
    async signOut() { store.user = null; persist(); listeners.forEach((cb) => cb('SIGNED_OUT', null)); return { error: null }; },
    mfa: {
      async listFactors() { return { data: { totp: store.factors.filter((f) => f.status === 'verified'), all: store.factors }, error: null }; },
      async getAuthenticatorAssuranceLevel() { const v = store.factors.some((f) => f.status === 'verified'); return { data: { currentLevel: store.aal || 'aal1', nextLevel: v ? 'aal2' : 'aal1' }, error: null }; },
      async enroll() { const f = { id: uuid(), status: 'unverified', factor_type: 'totp' }; store.factors.push(f); persist(); return { data: { id: f.id, totp: { qr_code: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>', secret: 'FAKESECRET' } }, error: null }; },
      async challengeAndVerify({ factorId, code }) { if (code !== '123456') return { data: null, error: { message: 'Invalid code' } }; const f = store.factors.find((x) => x.id === factorId); if (f) f.status = 'verified'; store.aal = 'aal2'; persist(); return { data: {}, error: null }; },
      async unenroll({ factorId }) { store.factors = store.factors.filter((f) => f.id !== factorId); persist(); return { data: {}, error: null }; },
    },
  };

  // Storage: file metadata only (no bytes), enough for the vault UI.
  const storage = {
    from: (bucket) => ({
      async upload(path, file) {
        store.files = store.files || [];
        if (store.files.some((f) => f.bucket === bucket && f.path === path)) return { data: null, error: { message: 'The resource already exists' } };
        store.files.push({ bucket, path, size: (file && file.size) || 0, mimetype: (file && file.type) || '', created_at: new Date().toISOString() }); persist();
        return { data: { path }, error: null };
      },
      async list(prefix) {
        const rows = (store.files || []).filter((f) => f.bucket === bucket && f.path.startsWith(prefix + '/'));
        return { data: rows.map((f) => ({ name: f.path.slice(prefix.length + 1), created_at: f.created_at, metadata: { size: f.size, mimetype: f.mimetype } })), error: null };
      },
      async createSignedUrl(path, secs) { return { data: { signedUrl: `https://fake.storage/${bucket}/${path}?expires=${secs}` }, error: null }; },
      async remove(paths) { store.files = (store.files || []).filter((f) => !(f.bucket === bucket && paths.includes(f.path))); persist(); return { data: [], error: null }; },
    }),
  };
  const api = { createClient: () => ({ from: (t) => new Query(t), auth, storage }), __store: store };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.supabase = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
