'use strict';
// Workspace: dashboard, projects, clients and settings. Talks to Supabase directly; Row Level
// Security on the database keeps every user to their own rows. Rendering uses el()/textContent.
let sb, user, profile;

const PROJECT_STATUS = { lead: 'Lead', estimating: 'Estimating', proposal_sent: 'Proposal sent', approved: 'Approved', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' };
const PROJECT_PILL = { lead: 'grey', estimating: 'grey', proposal_sent: 'blue', approved: 'ok', in_progress: 'chg', completed: 'ok', cancelled: 'grey' };
const DOC_STATUS = { sent: ['Sent', 'grey'], viewed: ['Viewed', 'blue'], signed: ['Signed', 'ok'], changes_requested: ['Changes requested', 'warn'] };
const DOC_KIND = { scope: 'Scope', change_request: 'Change request', proposal: 'Proposal', agreement: 'Agreement' };
const PAY_STATUS = { requested: ['Requested', 'grey'], paid_manual: ['Marked paid by you', 'ok'], paid_provider: ['Confirmed by provider', 'ok'], cancelled: ['Cancelled', 'grey'] };
const ACTIVITY = {
  project_created: (d) => `Project created: ${d.title || ''}`, client_created: (d) => `Client added: ${d.name || ''}`,
  estimate_saved: (d) => `Estimate saved${d.range ? ': ' + d.range : ''}`, document_sent: (d) => `Sent "${d.title || 'scope'}" (revision ${d.revision || 1})`,
  document_viewed: (d) => `Client opened "${d.title || 'scope'}"`, document_signed: (d) => `${d.signer || 'Client'} ${d.outcome === 'approved' ? 'approved and signed' : 'signed with changes requested'} "${d.title || ''}"`,
  payment_requested: (d) => `Payment requested: ${d.label || ''} ${d.amount || ''}`, payment_paid: (d) => `Marked paid: ${d.label || ''} ${d.amount || ''}`,
  status_changed: (d) => `Status: ${PROJECT_STATUS[d.from] || d.from} → ${PROJECT_STATUS[d.to] || d.to}`,
};

const today = () => new Date().toISOString().slice(0, 10);
const pill = ([text, cls]) => el('span', { class: 'pill ' + cls, text });
const view = () => $('#view');
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }
const when = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; } };
// Sums amounts per currency: [{currency, amount}] -> "฿12,000 · $800".
function sums(rows) {
  const by = {};
  rows.forEach((r) => { by[r.currency] = (by[r.currency] || 0) + Number(r.amount || 0); });
  const parts = Object.entries(by).map(([c, n]) => money(Math.round(n * 100) / 100, c));
  return parts.length ? parts.join(' · ') : '—';
}
async function q(promise) { return Auth.ok(await promise); }
async function log(projectId, kind, detail) { try { await sb.from('activity').insert({ project_id: projectId, kind, detail }); } catch { /* best effort */ } }
function field(label, input) { const id = input.id || 'f' + Math.random().toString(36).slice(2, 8); input.id = id; return el('div', {}, el('label', { for: id, text: label }), input); }
function currencySelect(value) { const s = el('select', {}, ...CURRENCIES.map((c) => el('option', { value: c, text: c, selected: c === value }))); return s; }
function busy(btn, fn) { return async (e) => { e && e.preventDefault(); btn.disabled = true; try { await fn(); } catch (err) { toast(err.message); } finally { btn.disabled = false; } }; }

// Router ---------------------------------------------------------------------------------------
async function route() {
  const [, section = '', id, sub] = (location.hash.replace(/^#/, '').split('?')[0] || '/').split('/');
  document.querySelectorAll('[data-nav]').forEach((a) => a.removeAttribute('aria-current'));
  const nav = { '': 'dash', projects: 'projects', clients: 'clients', settings: 'settings' }[section];
  const link = document.querySelector(`[data-nav="${nav}"]`); if (link) link.setAttribute('aria-current', 'page');
  view().replaceChildren(el('p', { class: 'muted', text: 'Loading…' }));
  try {
    if (section === 'projects' && id && sub === 'compose') await composePage(id);
    else if (section === 'projects' && id) await projectPage(id);
    else if (section === 'projects') await projectsPage();
    else if (section === 'clients' && id) await clientPage(id);
    else if (section === 'clients') await clientsPage();
    else if (section === 'settings') await settingsPage();
    else await dashboard();
  } catch (e) { view().replaceChildren(el('h1', { text: 'Something went wrong' }), el('p', { class: 'err', text: e.message })); }
  view().focus({ preventScroll: true });
}

// Dashboard ------------------------------------------------------------------------------------
async function dashboard() {
  const [projects, docs, pays, acts, clients] = await Promise.all([
    q(sb.from('projects').select('*').order('updated_at', { ascending: false })),
    q(sb.from('documents').select('id, project_id, title, status, created_at').order('created_at', { ascending: false })),
    q(sb.from('payments').select('*')),
    q(sb.from('activity').select('*').order('created_at', { ascending: false }).limit(12)),
    q(sb.from('clients').select('id, name')),
  ]);
  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const active = projects.filter((p) => !['completed', 'cancelled'].includes(p.status));
  const waiting = docs.filter((d) => d.status === 'sent' || d.status === 'viewed');
  const open = pays.filter((p) => p.status === 'requested');
  const month = today().slice(0, 7);
  const paidMonth = pays.filter((p) => p.status.startsWith('paid') && String(p.paid_at || '').slice(0, 7) === month);
  const overdue = open.filter((p) => p.due_date && p.due_date < today());
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const kpi = (label, value, note) => el('div', { class: 'kpi' }, el('span', { class: 'muted small', text: label }), el('b', { text: value }), note ? el('span', { class: 'muted small', text: note }) : null);

  const todo = [
    ...overdue.map((p) => ({ text: `Overdue: ${p.label} (${money(Number(p.amount), p.currency)})`, project: p.project_id })),
    ...waiting.map((d) => ({ text: `${d.status === 'viewed' ? 'Opened, not signed' : 'Waiting for signature'}: ${d.title}`, project: d.project_id })),
  ].slice(0, 8);

  view().replaceChildren(
    el('div', { class: 'head' },
      el('div', {}, el('h1', { text: `Hi${profile && profile.name ? ', ' + profile.name.split(' ')[0] : ''}` }), el('p', { class: 'muted', text: 'Here is where your projects stand.' })),
      el('div', { class: 'row' }, el('a', { class: 'btn ghost', href: '/estimate', text: 'AI estimate' }), el('a', { class: 'btn', href: '#/projects?new=1', text: 'New project' }))),
    el('div', { class: 'kpis' },
      kpi('Active projects', String(active.length)),
      kpi('Waiting for signature', String(waiting.length)),
      kpi('Outstanding', sums(open), overdue.length ? `${overdue.length} overdue` : ''),
      kpi('Paid this month', sums(paidMonth))),
    el('div', { class: 'cols' },
      el('section', {},
        el('h2', { text: 'Needs your attention' }),
        todo.length ? el('ul', { class: 'feed' }, todo.map((t) => el('li', {}, el('a', { href: '#/projects/' + t.project, text: t.text }), el('time', { text: byId[t.project] ? byId[t.project].title : '' }))))
          : el('p', { class: 'empty', text: 'Nothing waiting. Nice.' }),
        el('h2', { text: 'Recent projects', style: 'margin-top:28px' }),
        projects.length ? projectTable(projects.slice(0, 6), clientsById) : el('div', { class: 'empty' }, el('p', { text: 'No projects yet. Start with an AI estimate or create a project.' }), el('a', { class: 'btn', href: '/estimate', text: 'Estimate a brief' }))),
      el('section', {}, el('h2', { text: 'Activity' }), activityFeed(acts, byId))));
}

function activityFeed(acts, byId = {}) {
  if (!acts.length) return el('p', { class: 'empty', text: 'Activity will show up here.' });
  return el('ul', { class: 'feed' }, acts.map((a) => el('li', {},
    el('span', { text: (ACTIVITY[a.kind] || (() => a.kind))(a.detail || {}) }),
    el('time', { text: `${when(a.created_at)}${byId[a.project_id] ? ' · ' + byId[a.project_id].title : ''}` }))));
}

function projectTable(projects, clients = {}) {
  return el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {}, el('th', { text: 'Project' }), el('th', { class: 'hide-sm', text: 'Client' }), el('th', { text: 'Status' }), el('th', { class: 'hide-sm', text: 'Updated' }))),
    el('tbody', {}, projects.map((p) => el('tr', {},
      el('td', {}, el('a', { href: '#/projects/' + p.id, text: p.title })),
      el('td', { class: 'hide-sm', text: (clients[p.client_id] && clients[p.client_id].name) || '—' }),
      el('td', {}, pill([PROJECT_STATUS[p.status], PROJECT_PILL[p.status]])),
      el('td', { class: 'hide-sm muted', text: when(p.updated_at) })))));
}

// Projects -------------------------------------------------------------------------------------
async function projectsPage() {
  const [projects, clients] = await Promise.all([
    q(sb.from('projects').select('*').order('updated_at', { ascending: false })),
    q(sb.from('clients').select('id, name').order('name')),
  ]);
  const byId = Object.fromEntries(clients.map((c) => [c.id, c]));
  const filter = el('select', { 'aria-label': 'Filter by status' }, el('option', { value: '', text: 'All statuses' }), ...Object.entries(PROJECT_STATUS).map(([k, v]) => el('option', { value: k, text: v })));
  const list = el('div');
  const draw = () => { const rows = projects.filter((p) => !filter.value || p.status === filter.value); list.replaceChildren(rows.length ? projectTable(rows, byId) : el('p', { class: 'empty', text: 'No projects here yet.' })); };
  filter.addEventListener('change', draw);
  view().replaceChildren(
    el('div', { class: 'head' }, el('h1', { text: 'Projects' }), filter),
    newProjectForm(clients, /new=1/.test(location.hash)),
    list);
  draw();
}

function newProjectForm(clients, open, presetClient) {
  const title = el('input', { required: true, maxlength: 160, placeholder: 'Café website' });
  const client = el('select', {}, el('option', { value: '', text: 'No client yet' }), el('option', { value: '__new', text: '+ New client…' }), ...clients.map((c) => el('option', { value: c.id, text: c.name, selected: c.id === presetClient })));
  const newClient = el('input', { maxlength: 120, placeholder: 'Client name', hidden: true });
  client.addEventListener('change', () => { newClient.hidden = client.value !== '__new'; if (!newClient.hidden) newClient.focus(); });
  const cur = currencySelect((profile && profile.currency) || 'USD');
  const btn = el('button', { class: 'btn', type: 'submit', text: 'Create project' });
  const form = el('form', { class: 'card', hidden: !open }, el('h2', { text: 'New project', style: 'margin-top:0' }),
    el('div', { class: 'inline' }, field('Title', title), field('Client', client), field('New client', newClient), field('Currency', cur), btn));
  form.addEventListener('submit', busy(btn, async () => {
    let clientId = client.value && client.value !== '__new' ? client.value : null;
    if (client.value === '__new') {
      if (!newClient.value.trim()) throw new Error('Add the client name');
      clientId = (await q(sb.from('clients').insert({ name: newClient.value.trim() }).select('id').single())).id;
    }
    const p = await q(sb.from('projects').insert({ title: title.value.trim(), client_id: clientId, currency: cur.value }).select('id, title').single());
    await log(p.id, 'project_created', { title: p.title });
    location.hash = '#/projects/' + p.id;
  }));
  const toggle = el('button', { class: 'btn', type: 'button', text: 'New project', onclick: () => { form.hidden = false; title.focus(); toggle.hidden = true; } });
  toggle.hidden = open;
  return el('div', { style: 'margin-bottom:20px' }, toggle, form);
}

async function projectPage(id) {
  const p = await q(sb.from('projects').select('*').eq('id', id).maybeSingle());
  if (!p) { view().replaceChildren(el('h1', { text: 'Project not found' }), el('a', { href: '#/projects', text: 'All projects' })); return; }
  const [client, estimates, docs, pays, acts, clients] = await Promise.all([
    p.client_id ? q(sb.from('clients').select('*').eq('id', p.client_id).maybeSingle()) : null,
    q(sb.from('estimates').select('*').eq('project_id', id).order('created_at', { ascending: false })),
    q(sb.from('documents').select('*').eq('project_id', id).order('created_at', { ascending: false })),
    q(sb.from('payments').select('*').eq('project_id', id).order('created_at', { ascending: true })),
    q(sb.from('activity').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(30)),
    q(sb.from('clients').select('id, name').order('name')),
  ]);

  // Header: title, client, status.
  const status = el('select', { 'aria-label': 'Project status' }, ...Object.entries(PROJECT_STATUS).map(([k, v]) => el('option', { value: k, text: v, selected: k === p.status })));
  status.addEventListener('change', async () => {
    try { await q(sb.from('projects').update({ status: status.value }).eq('id', id)); await log(id, 'status_changed', { from: p.status, to: status.value }); p.status = status.value; toast('Status updated'); } catch (e) { toast(e.message); }
  });
  const clientSel = el('select', { 'aria-label': 'Client' }, el('option', { value: '', text: 'No client' }), ...clients.map((c) => el('option', { value: c.id, text: c.name, selected: c.id === p.client_id })));
  clientSel.addEventListener('change', async () => { try { await q(sb.from('projects').update({ client_id: clientSel.value || null }).eq('id', id)); toast('Client updated'); } catch (e) { toast(e.message); } });

  const latest = estimates[0];
  const signed = docs.find((d) => d.status === 'signed' && d.receipt_token);
  const newScope = () => {
    if (latest) {
      // Same hand-off the estimator uses: one priced line per feature.
      const f = 1 + Number(latest.buffer_pct) / 100, rate = Number(latest.rate);
      const items = (latest.data.features || []).map((ft) => ({ kind: 'scope', text: `${ft.name}: ${ft.stories.map((s) => s.title).join('; ')}`.slice(0, 600),
        price: Math.round(ft.stories.reduce((a, s) => a + (s.hoursLow + s.hoursHigh) / 2, 0) * rate * f) }))
        .concat((latest.data.outOfScope || []).map((x) => ({ kind: 'out', text: x.slice(0, 600) })));
      try { sessionStorage.setItem('ss-draft', JSON.stringify({ title: p.title, currency: latest.currency, notes: '', items, client: client && client.name })); } catch { /* ignore */ }
    }
    location.href = '/new?project=' + encodeURIComponent(id);
  };

  view().replaceChildren(
    el('p', { class: 'small' }, el('a', { href: '#/projects', text: '← Projects' })),
    el('div', { class: 'head' },
      el('div', {}, el('h1', { text: p.title }), el('p', { class: 'muted' }, client ? el('a', { href: '#/clients/' + client.id, text: client.name }) : 'No client', ` · ${p.currency} · created ${when(p.created_at)}`)),
      el('div', { class: 'row' }, clientSel, status)),

    el('section', { class: 'sect' },
      el('h2', {}, 'Estimates', el('a', { class: 'btn sm ghost', href: '/estimate?project=' + id, text: 'New AI estimate' })),
      estimates.length ? el('table', { class: 'tbl' }, el('tbody', {}, estimates.map((e) => el('tr', {},
        el('td', {}, el('a', { href: `/estimate?estimate=${e.id}`, text: `${money(Number(e.price_low), e.currency)} – ${money(Number(e.price_high), e.currency)}` })),
        el('td', { class: 'muted', text: `${Number(e.hours_low)}–${Number(e.hours_high)} h` }),
        el('td', { class: 'muted hide-sm', text: when(e.created_at) })))))
        : el('p', { class: 'empty', text: 'No estimate yet. Paste the client brief into the AI estimator.' })),

    el('section', { class: 'sect' },
      el('h2', {}, 'Documents and signatures', el('span', { class: 'row' },
        signed ? el('a', { class: 'btn sm ghost', href: `/new?project=${id}#cr=${encodeURIComponent(signed.receipt_token)}`, text: 'Change request' }) : null,
        el('a', { class: 'btn sm ghost', href: `#/projects/${id}/compose`, text: 'Proposal or agreement' }),
        el('button', { class: 'btn sm', type: 'button', onclick: newScope, text: latest ? 'New scope from estimate' : 'New scope' }))),
      docs.length ? el('table', { class: 'tbl' }, el('tbody', {}, docs.map((d) => el('tr', {},
        el('td', {}, el('b', { text: d.title }), el('div', { class: 'muted small', text: `${DOC_KIND[d.kind]} · revision ${d.revision} · ${when(d.created_at)}` })),
        el('td', {}, pill(DOC_STATUS[d.status]), d.signer_name ? el('div', { class: 'muted small', text: `${d.signer_name}, ${when(d.signed_at)}` }) : null),
        el('td', { class: 'num' }, d.total != null ? money(Number(d.total), d.currency) : ''),
        el('td', { class: 'num' },
          el('button', { class: 'btn sm ghost', type: 'button', text: 'Copy client link', onclick: () => copy(`${location.origin}/sign#${d.token}`) }),
          d.receipt_token ? el('a', { class: 'btn sm ghost', href: `/receipt#${d.receipt_token}`, target: '_blank', rel: 'noopener', text: 'Receipt' }) : null)))))
        : el('p', { class: 'empty', text: 'Send a scope for your client to approve line by line and sign.' })),

    el('section', { class: 'sect' }, el('h2', { text: 'Payments' }), paymentsBlock(p, pays, docs)),
    el('section', { class: 'sect' }, el('h2', { text: 'Files' }), filesBlock(p)),
    el('section', { class: 'sect' }, el('h2', { text: 'Activity' }), activityFeed(acts)),
    el('section', { class: 'sect' }, el('button', { class: 'btn ghost sm', type: 'button', text: 'Delete project', onclick: async () => {
      if (!confirm(`Delete "${p.title}" with its estimates, documents, payments and files? Sent links keep working for your client, but they won't show here.`)) return;
      try {
        // Files aren't rows, so remove them from the vault first.
        const files = await q(sb.storage.from('vault').list(`${user.id}/${id}`));
        if (files.length) await q(sb.storage.from('vault').remove(files.map((f) => `${user.id}/${id}/${f.name}`)));
        await q(sb.from('projects').delete().eq('id', id)); location.hash = '#/projects';
      } catch (e) { toast(e.message); }
    } })));
}

// Vault: private files per project under <user id>/<project id>/ in Supabase Storage.
const MAX_FILE = 25 * 1024 * 1024;
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
function filesBlock(p) {
  const prefix = `${user.id}/${p.id}`;
  const vault = sb.storage.from('vault');
  const list = el('div', {}, el('p', { class: 'muted', text: 'Loading files…' }));
  const input = el('input', { type: 'file', multiple: true, id: 'vault-file', class: 'sr' });
  const pick = el('label', { for: 'vault-file', class: 'btn ghost sm', text: 'Upload files' });
  async function draw() {
    const files = await q(vault.list(prefix, { sortBy: { column: 'created_at', order: 'desc' } }));
    const real = files.filter((f) => f.name && f.name !== '.emptyFolderPlaceholder');
    list.replaceChildren(real.length ? el('table', { class: 'tbl' }, el('tbody', {}, real.map((f) => {
      const path = `${prefix}/${f.name}`;
      const shown = f.name.replace(/^\d+-/, '');
      return el('tr', {},
        el('td', {}, el('b', { text: shown }), el('div', { class: 'muted small', text: `${fmtSize((f.metadata && f.metadata.size) || 0)} · ${when(f.created_at)}` })),
        el('td', { class: 'num' },
          el('button', { class: 'btn sm ghost', type: 'button', text: 'Open', onclick: async () => { try { const u = await q(vault.createSignedUrl(path, 60)); window.open(u.signedUrl, '_blank', 'noopener'); } catch (e) { toast(e.message); } } }),
          el('button', { class: 'btn sm ghost', type: 'button', text: 'Share link (7 days)', onclick: async () => { try { const u = await q(vault.createSignedUrl(path, 7 * 86400, { download: true })); copy(u.signedUrl); } catch (e) { toast(e.message); } } }),
          el('button', { class: 'btn sm ghost', type: 'button', text: 'Delete', onclick: async () => { if (!confirm(`Delete ${shown}?`)) return; try { await q(vault.remove([path])); draw(); } catch (e) { toast(e.message); } } })));
    }))) : el('p', { class: 'empty', text: 'Keep briefs, contracts, designs and invoices for this project here. Only you can see them unless you share a link.' }));
  }
  input.addEventListener('change', async () => {
    for (const file of input.files) {
      if (file.size > MAX_FILE) { toast(`${file.name} is over 25 MB`); continue; }
      // Pages and scripts are never stored: a share link must not be able to serve a web page.
      if (/\.(html?|xhtml|svg|xml|js|mjs)$/i.test(file.name) || /html|svg|javascript|xml/i.test(file.type)) { toast(`${file.name}: this file type can't be stored`); continue; }
      const safe = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(-100) || 'file';
      try { await q(vault.upload(`${prefix}/${Date.now()}-${safe}`, file, { contentType: file.type || 'application/octet-stream', upsert: false })); }
      catch (e) { toast(`${file.name}: ${e.message}`); }
    }
    input.value = ''; toast('Uploaded'); draw();
  });
  draw().catch((e) => list.replaceChildren(el('p', { class: 'err', text: e.message })));
  return el('div', {}, el('p', { class: 'row' }, pick, input, el('span', { class: 'muted small', text: 'Private. Up to 25 MB each.' })), list);
}

async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Link copied'); } catch { prompt('Copy this link', text); } }

function paymentsBlock(p, pays, docs) {
  const open = pays.filter((x) => x.status === 'requested'), paid = pays.filter((x) => x.status.startsWith('paid'));
  const label = el('input', { required: true, maxlength: 120, placeholder: 'Deposit 30%' });
  const amount = el('input', { required: true, type: 'number', min: 0.01, step: 'any', inputmode: 'decimal' });
  const cur = currencySelect(p.currency);
  const due = el('input', { type: 'date' });
  const signedTotal = docs.find((d) => d.status === 'signed' && d.total != null);
  const btn = el('button', { class: 'btn', type: 'submit', text: 'Add request' });
  const form = el('form', { class: 'inline card' }, field('What for', label), field('Amount', amount), field('Currency', cur), field('Due', due), btn);
  form.addEventListener('submit', busy(btn, async () => {
    await q(sb.from('payments').insert({ project_id: p.id, label: label.value.trim(), amount: Number(amount.value), currency: cur.value, due_date: due.value || null, document_id: signedTotal ? signedTotal.id : null }));
    await log(p.id, 'payment_requested', { label: label.value.trim(), amount: money(Number(amount.value), cur.value) });
    route();
  }));
  const markPaid = (x) => async () => {
    const ref = prompt(`Mark "${x.label}" as paid. Reference or note (optional), e.g. bank transfer ID:`, '');
    if (ref === null) return;
    try {
      await q(sb.from('payments').update({ status: 'paid_manual', paid_at: new Date().toISOString(), reference: ref.slice(0, 120) || null, method: 'manual' }).eq('id', x.id));
      await log(p.id, 'payment_paid', { label: x.label, amount: money(Number(x.amount), x.currency) });
      route();
    } catch (e) { toast(e.message); }
  };
  return el('div', {},
    el('p', { class: 'muted small' }, `Outstanding ${sums(open)} · Paid ${sums(paid)}`, signedTotal ? ` · Signed total ${money(Number(signedTotal.total), signedTotal.currency)}` : ''),
    pays.length ? el('table', { class: 'tbl' }, el('tbody', {}, pays.map((x) => el('tr', {},
      el('td', {}, el('b', { text: x.label }), el('div', { class: 'muted small', text: x.due_date ? `Due ${when(x.due_date)}${x.status === 'requested' && x.due_date < today() ? ' · overdue' : ''}` : '' })),
      el('td', { class: 'num', text: money(Number(x.amount), x.currency) }),
      el('td', {}, pill(PAY_STATUS[x.status]), x.reference ? el('div', { class: 'muted small', text: x.reference }) : null),
      el('td', { class: 'num' }, x.status === 'requested' ? el('button', { class: 'btn sm ghost', type: 'button', text: 'Mark paid', onclick: markPaid(x) }) : null)))))
      : null,
    form,
    el('p', { class: 'muted small', text: 'Your client pays you directly. SignedScope never holds money; "Marked paid by you" means you recorded it.' }));
}

// Clients --------------------------------------------------------------------------------------
async function clientsPage() {
  const [clients, projects] = await Promise.all([q(sb.from('clients').select('*').order('name')), q(sb.from('projects').select('id, client_id, status'))]);
  const count = (cid) => projects.filter((p) => p.client_id === cid && !['completed', 'cancelled'].includes(p.status)).length;
  view().replaceChildren(
    el('div', { class: 'head' }, el('h1', { text: 'Clients' })),
    clientForm(null, async (c) => { location.hash = '#/clients/' + c.id; }),
    clients.length ? el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, el('th', { text: 'Client' }), el('th', { class: 'hide-sm', text: 'Email' }), el('th', { text: 'Active projects' }))),
      el('tbody', {}, clients.map((c) => el('tr', {},
        el('td', {}, el('a', { href: '#/clients/' + c.id, text: c.name }), c.company ? el('div', { class: 'muted small', text: c.company }) : null),
        el('td', { class: 'hide-sm muted', text: c.email || '—' }),
        el('td', { text: String(count(c.id)) })))))
      : el('p', { class: 'empty', text: 'Add your first client.' }));
}

function clientForm(c, onSaved) {
  const f = { name: el('input', { required: true, maxlength: 120, value: c ? c.name : '' }), company: el('input', { maxlength: 120, value: (c && c.company) || '' }),
    email: el('input', { type: 'email', maxlength: 254, value: (c && c.email) || '' }), phone: el('input', { maxlength: 40, value: (c && c.phone) || '' }),
    country: el('input', { maxlength: 2, placeholder: 'TH', value: (c && c.country) || '' }) };
  const notes = el('textarea', { maxlength: 2000, rows: 2 }); notes.value = (c && c.notes) || '';
  const btn = el('button', { class: 'btn', type: 'submit', text: c ? 'Save' : 'Add client' });
  const form = el('form', { class: 'card' }, el('div', { class: 'inline' }, field('Name', f.name), field('Company', f.company), field('Email', f.email), field('Phone / LINE', f.phone), field('Country (2 letters)', f.country)),
    field('Notes', notes), el('p', {}, btn));
  form.addEventListener('submit', busy(btn, async () => {
    const row = { name: f.name.value.trim(), company: f.company.value.trim() || null, email: f.email.value.trim() || null, phone: f.phone.value.trim() || null,
      country: f.country.value.trim().toUpperCase() || null, notes: notes.value.trim() || null };
    const saved = c ? await q(sb.from('clients').update(row).eq('id', c.id).select('id').single()) : await q(sb.from('clients').insert(row).select('id').single());
    if (!c) await log(null, 'client_created', { name: row.name });
    toast('Saved'); onSaved(saved);
  }));
  return form;
}

async function clientPage(id) {
  const c = await q(sb.from('clients').select('*').eq('id', id).maybeSingle());
  if (!c) { view().replaceChildren(el('h1', { text: 'Client not found' })); return; }
  const projects = await q(sb.from('projects').select('*').eq('client_id', id).order('updated_at', { ascending: false }));
  const clients = await q(sb.from('clients').select('id, name').order('name'));
  view().replaceChildren(
    el('p', { class: 'small' }, el('a', { href: '#/clients', text: '← Clients' })),
    el('div', { class: 'head' }, el('h1', { text: c.name })),
    clientForm(c, () => route()),
    el('section', { class: 'sect' }, el('h2', { text: 'Projects' }), newProjectForm(clients, false, id),
      projects.length ? projectTable(projects, { [c.id]: c }) : el('p', { class: 'empty', text: 'No projects with this client yet.' })),
    el('section', { class: 'sect' }, el('button', { class: 'btn ghost sm', type: 'button', text: 'Delete client', onclick: async () => {
      if (!confirm(`Delete ${c.name}? Their projects stay, without a client.`)) return;
      try { await q(sb.from('clients').delete().eq('id', id)); location.hash = '#/clients'; } catch (e) { toast(e.message); }
    } })));
}

// Settings -------------------------------------------------------------------------------------
async function settingsPage() {
  const pr = profile || {};
  const f = { name: el('input', { maxlength: 120, value: pr.name || '' }), business_name: el('input', { maxlength: 120, value: pr.business_name || '' }),
    hourly_rate: el('input', { type: 'number', min: 0, step: 'any', value: pr.hourly_rate ?? '' }) };
  const cur = currencySelect(pr.currency || 'USD');
  const lang = el('select', {}, ...[['en', 'English'], ['bn', 'বাংলা'], ['th', 'ไทย']].map(([v, t]) => el('option', { value: v, text: t, selected: v === pr.lang })));
  const payIns = el('textarea', { maxlength: 800, rows: 3, placeholder: 'PromptPay: 081-234-5678 (Your Name)\nBank: KBank 123-4-56789-0' }); payIns.value = pr.pay_instructions || '';
  const nt = (k, label) => { const b = el('input', { type: 'checkbox', checked: pr[k] !== false && (k !== 'notify_viewed' || pr[k] === true) }); nt.boxes[k] = b; return el('label', { class: 'opt-r', style: 'margin:6px 18px 6px 0' }, b, ' ', label); };
  nt.boxes = {};
  const notifs = el('fieldset', { class: 'comp-group' }, el('legend', { text: 'Email me when' }),
    nt('notify_signed', 'a client signs or asks for changes'), nt('notify_viewed', 'a client opens a link'), nt('notify_overdue', 'a payment is overdue'));
  const btn = el('button', { class: 'btn', type: 'submit', text: 'Save settings' });
  const form = el('form', { class: 'card' },
    el('div', { class: 'inline' }, field('Your name', f.name), field('Business name', f.business_name), field('Default currency', cur), field('Hourly rate', f.hourly_rate), field('Language', lang)),
    field('Default payment instructions (shown to clients after they approve)', payIns), notifs, el('p', {}, btn));
  form.addEventListener('submit', busy(btn, async () => {
    profile = await q(sb.from('profiles').update({ name: f.name.value.trim() || null, business_name: f.business_name.value.trim() || null, currency: cur.value,
      hourly_rate: f.hourly_rate.value === '' ? null : Number(f.hourly_rate.value), lang: lang.value, pay_instructions: payIns.value.trim() || null,
      notify_signed: nt.boxes.notify_signed.checked, notify_viewed: nt.boxes.notify_viewed.checked, notify_overdue: nt.boxes.notify_overdue.checked }).eq('id', user.id).select('*').single());
    toast('Settings saved');
  }));

  view().replaceChildren(el('h1', { text: 'Settings' }), el('p', { class: 'muted', text: user.email }), form,
    el('section', { class: 'sect' }, el('h2', { text: 'Two-step sign-in' }), await mfaBlock()),
    el('section', { class: 'sect' }, el('h2', { text: 'Your data' }),
      el('p', { class: 'muted', text: 'Download everything in your workspace as a JSON file.' }),
      el('p', { class: 'row' }, el('button', { class: 'btn ghost', type: 'button', text: 'Export my data', onclick: exportData }),
        el('button', { class: 'btn ghost', type: 'button', text: 'Sign out', onclick: async () => { await sb.auth.signOut(); location.href = '/login'; } }))));
}

async function mfaBlock() {
  const box = el('div', { class: 'card' });
  const draw = async () => {
    const f = await q(sb.auth.mfa.listFactors());
    const on = (f.totp || []).filter((x) => x.status === 'verified');
    if (on.length) {
      box.replaceChildren(el('p', {}, pill(['On', 'ok']), ' An authenticator app code is required when you sign in.'),
        el('button', { class: 'btn ghost sm', type: 'button', text: 'Turn off', onclick: async () => { if (!confirm('Turn off two-step sign-in?')) return; try { for (const x of on) await q(sb.auth.mfa.unenroll({ factorId: x.id })); draw(); } catch (e) { toast(e.message); } } }));
      return;
    }
    const start = el('button', { class: 'btn', type: 'button', text: 'Set up authenticator app' });
    box.replaceChildren(el('p', { class: 'muted', text: 'Protect your client documents with a 6-digit code from an app like Google Authenticator or 1Password.' }), start);
    start.addEventListener('click', busy(start, async () => {
      // Clear half-finished setups first; Supabase allows only a few unverified factors.
      for (const x of (f.all || []).filter((y) => y.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: x.id });
      const e = await q(sb.auth.mfa.enroll({ factorType: 'totp' }));
      const code = el('input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, pattern: '[0-9]{6}', required: true });
      const vbtn = el('button', { class: 'btn', type: 'submit', text: 'Verify and turn on' });
      const vf = el('form', {}, field('6-digit code from the app', code), vbtn);
      vf.addEventListener('submit', busy(vbtn, async () => { await q(sb.auth.mfa.challengeAndVerify({ factorId: e.id, code: code.value.trim() })); toast('Two-step sign-in is on'); draw(); }));
      box.replaceChildren(el('p', { text: 'Scan this with your authenticator app, then enter the code it shows.' }),
        el('img', { class: 'qr', src: e.totp.qr_code, alt: 'QR code for your authenticator app' }),
        el('p', { class: 'muted small', text: 'Can’t scan? Enter this key: ' + e.totp.secret }), vf);
      code.focus();
    }));
  };
  await draw();
  return box;
}

async function exportData() {
  const out = { exportedAt: new Date().toISOString(), profile };
  for (const t of ['clients', 'projects', 'estimates', 'documents', 'payments', 'activity']) out[t] = await q(sb.from(t).select('*'));
  out.files = [];
  for (const pj of out.projects) out.files.push(...(await q(sb.storage.from('vault').list(`${user.id}/${pj.id}`))).map((f) => ({ project_id: pj.id, name: f.name, size: f.metadata && f.metadata.size })));
  const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })), download: `signedscope-export-${today()}.json` });
  document.body.append(a); a.click(); a.remove();
}

// Start ----------------------------------------------------------------------------------------
(async () => {
  const a = await Auth.init();
  if (!a.enabled) { location.href = '/login'; return; }
  sb = a.sb;
  const s = await Auth.require();
  user = s.user;
  profile = await q(sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
  $('#who').textContent = user.email || '';
  sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') location.href = '/login'; });
  window.addEventListener('hashchange', route);
  route();
})();

// Proposal / agreement composer -----------------------------------------------------------------
async function composePage(id) {
  const p = await q(sb.from('projects').select('*').eq('id', id).maybeSingle());
  if (!p) { view().replaceChildren(el('h1', { text: 'Project not found' })); return; }
  const [client, estimates] = await Promise.all([
    p.client_id ? q(sb.from('clients').select('*').eq('id', p.client_id).maybeSingle()) : null,
    q(sb.from('estimates').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(1)),
  ]);
  const est = estimates[0];
  const me = (profile && (profile.business_name || profile.name)) || '';
  const clientName = (client && (client.company || client.name)) || '';
  const cur = est ? est.currency : p.currency;

  // Lines: one priced line per estimated feature, exclusions as "Out of scope".
  const f = est ? 1 + Number(est.buffer_pct) / 100 : 1;
  const lines = est ? (est.data.features || []).map((ft) => ({ kind: 'scope', text: `${ft.name}: ${ft.stories.map((x) => x.title).join('; ')}`.slice(0, 600),
    price: Math.round(ft.stories.reduce((a, x) => a + (x.hoursLow + x.hoursHigh) / 2, 0) * Number(est.rate) * f) }))
    .concat((est.data.outOfScope || []).map((x) => ({ kind: 'out', text: x.slice(0, 600) }))) : [];
  const milestones = est ? (est.data.milestones || []).map((m, i) => `${i + 1}. ${m.name} (${m.weeks} ${m.weeks === 1 ? 'week' : 'weeks'})`) : [];

  const kind = el('select', { 'aria-label': 'Document type' }, el('option', { value: 'proposal', text: 'Proposal' }), el('option', { value: 'agreement', text: 'Agreement' }));
  const title = el('input', { maxlength: 160, value: `${p.title}: Proposal` });
  kind.addEventListener('change', () => { title.value = `${p.title}: ${kind.value === 'agreement' ? 'Agreement' : 'Proposal'}`; terms.hidden = false; termsOn.checked = kind.value === 'agreement' || termsOn.checked; drawSections(); });

  // Sections -----------------------------------------------------------------------------------
  const outline = () => kind.value === 'agreement' ? [
    { heading: 'Parties', body: `This agreement is between ${me || '[your business]'} and ${clientName || '[client]'} for the project "${p.title}".` },
    { heading: 'Summary', body: est ? est.data.summary : '' },
    ...(milestones.length ? [{ heading: 'Timeline', body: milestones.join('\n') }] : []),
  ] : [
    { heading: 'Introduction', body: est ? est.data.summary : '' },
    ...(milestones.length ? [{ heading: 'Approach and timeline', body: milestones.join('\n') }] : []),
    ...(est && est.data.assumptions && est.data.assumptions.length ? [{ heading: 'Assumptions', body: est.data.assumptions.map((a) => '- ' + a).join('\n') }] : []),
    { heading: 'Next steps', body: 'Review each line below, approve or comment, and sign. Work starts once the deposit is received.' },
  ];
  let sections = outline();
  const secBox = el('div');
  function drawSections() {
    if (!secBox.dataset.touched) sections = outline();
    secBox.replaceChildren(...sections.map((x, i) => {
      const h = el('input', { maxlength: 120, value: x.heading, 'aria-label': 'Section heading', oninput: (e) => { x.heading = e.target.value; secBox.dataset.touched = '1'; } });
      const b = el('textarea', { maxlength: 6000, rows: Math.min(8, Math.max(3, x.body.split('\n').length + 1)), 'aria-label': 'Section text', oninput: (e) => { x.body = e.target.value; secBox.dataset.touched = '1'; } });
      b.value = x.body;
      return el('div', { class: 'card comp-sec' }, el('div', { class: 'row' }, h,
        el('button', { class: 'x-btn', type: 'button', 'aria-label': 'Remove section', text: '×', onclick: () => { sections.splice(i, 1); secBox.dataset.touched = '1'; drawSections(); } })), b);
    }));
  }
  drawSections();
  const addSec = el('button', { class: 'btn ghost sm', type: 'button', text: '+ Section', onclick: () => { sections.push({ heading: '', body: '' }); secBox.dataset.touched = '1'; drawSections(); } });
  const lang = el('select', { 'aria-label': 'Language for AI writing' }, ...[['en', 'English'], ['bn', 'বাংলা'], ['th', 'ไทย']].map(([v, t]) => el('option', { value: v, text: t, selected: v === ((profile && profile.lang) || 'en') })));
  const ai = el('button', { class: 'btn ghost sm', type: 'button', text: 'Write with AI' });
  ai.addEventListener('click', busy(ai, async () => {
    const r = await Auth.api('proposal', { project: p.title, client: clientName, freelancer: me, lang: lang.value, summary: est ? est.data.summary : '',
      features: est ? est.data.features.map((x) => x.name) : lines.map((l) => l.text), milestones, assumptions: est ? est.data.assumptions : [] });
    const put = (heading, body) => { const x = sections.find((s) => s.heading === heading); if (x) x.body = body; else sections.unshift({ heading, body }); };
    if (kind.value === 'agreement') put('Summary', r.intro); else { put('Introduction', r.intro); put('Approach and timeline', r.approach + (milestones.length ? '\n\n' + milestones.join('\n') : '')); put('Next steps', r.nextSteps); }
    secBox.dataset.touched = '1'; drawSections(); toast('Draft written. Check it before sending.');
  }));

  // Lines --------------------------------------------------------------------------------------
  const lineBox = el('div');
  const total = () => lines.filter((l) => l.kind !== 'out').reduce((t, l) => t + (Number(l.price) || 0), 0);
  function drawLines() {
    lineBox.replaceChildren(lines.length ? el('table', { class: 'tbl' }, el('tbody', {}, lines.map((l, i) => el('tr', {},
      el('td', {}, el('input', { value: l.text, maxlength: 600, 'aria-label': 'Line', oninput: (e) => { l.text = e.target.value; } }), el('div', { class: 'muted small', text: KIND[l.kind] })),
      el('td', { class: 'num' }, l.kind === 'out' ? '' : el('input', { type: 'number', min: 0, step: 'any', value: l.price ?? '', class: 'amt-in', 'aria-label': 'Price', oninput: (e) => { l.price = e.target.value === '' ? undefined : Number(e.target.value); drawTotal(); } })),
      el('td', {}, el('button', { class: 'x-btn', type: 'button', 'aria-label': 'Remove line', text: '×', onclick: () => { lines.splice(i, 1); drawLines(); } }))))))
      : el('p', { class: 'empty', text: 'No estimate on this project yet. Add lines below, or run an AI estimate first.' }),
    el('p', { class: 'row' }, el('button', { class: 'btn ghost sm', type: 'button', text: '+ Priced line', onclick: () => { lines.push({ kind: 'scope', text: '', price: undefined }); drawLines(); } }),
      el('button', { class: 'btn ghost sm', type: 'button', text: '+ Not included', onclick: () => { lines.push({ kind: 'out', text: '' }); drawLines(); } }),
      el('b', { id: 'c-total' })));
    drawTotal();
  }
  function drawTotal() { const t = $('#c-total'); if (t) t.textContent = 'Total ' + money(total(), cur); }
  drawLines();

  // Payment schedule -----------------------------------------------------------------------------
  const PRESETS = { '50-50': [['Deposit', 50, 'On signing'], ['Final payment', 50, 'At launch']], '30-40-30': [['Deposit', 30, 'On signing'], ['Milestone payment', 40, 'At design approval'], ['Final payment', 30, 'At launch']], '100': [['Full payment', 100, 'On signing']], none: [] };
  const preset = el('select', { 'aria-label': 'Payment schedule' }, el('option', { value: '50-50', text: '50% deposit, 50% at launch' }), el('option', { value: '30-40-30', text: '30% / 40% / 30%' }), el('option', { value: '100', text: '100% upfront' }), el('option', { value: 'none', text: 'No schedule' }));
  let plan = [];
  const planBox = el('div');
  function fromPreset() { const t = total(); plan = PRESETS[preset.value].map(([label, pct, due]) => ({ label: `${label} ${pct}%`, amount: Math.round((t * pct) / 100), due })); drawPlan(); }
  function drawPlan() {
    planBox.replaceChildren(...plan.map((x, i) => el('div', { class: 'inline comp-pay' },
      field('Payment', el('input', { maxlength: 120, value: x.label, oninput: (e) => { x.label = e.target.value; } })),
      field('Amount', el('input', { type: 'number', min: 0, step: 'any', value: x.amount, oninput: (e) => { x.amount = Number(e.target.value); } })),
      field('When', el('input', { maxlength: 60, value: x.due || '', oninput: (e) => { x.due = e.target.value; } })),
      el('button', { class: 'x-btn', type: 'button', 'aria-label': 'Remove payment', text: '×', onclick: () => { plan.splice(i, 1); drawPlan(); } }))));
  }
  preset.addEventListener('change', fromPreset);
  fromPreset();

  // Terms (clause library) ------------------------------------------------------------------------
  const termsOn = el('input', { type: 'checkbox', id: 'terms-on' });
  const vars = Object.fromEntries(Object.entries(CLAUSE_VARS).filter(([k]) => k !== 'rate').map(([k, v]) => [k, el('input', { type: 'number', min: 0, max: 365, value: v })]));
  const VAR_LABEL = { days: 'Days to pay or reply', deposit: 'Deposit %', revisions: 'Revision rounds', notice: 'Notice days', warranty: 'Bug-fix days after launch' };
  const country = el('select', { 'aria-label': 'Governing law' }, ...[['', 'Where I am based'], ['TH', 'Thailand'], ['BD', 'Bangladesh'], ['MY', 'Malaysia'], ['SG', 'Singapore']].map(([v, t]) => el('option', { value: v, text: t, selected: client && client.country === v })));
  const checks = CLAUSES.map((c) => ({ c, box: el('input', { type: 'checkbox', checked: Boolean(c.on) }) }));
  const groups = [...new Set(CLAUSES.map((c) => c.group))];
  const terms = el('div', { class: 'card', hidden: false },
    el('label', { class: 'opt-r', style: 'margin:0 0 10px' }, termsOn, ' Include terms'),
    el('p', { class: 'banner', text: 'These are plain-language templates, not legal advice, and they have not been reviewed by a lawyer for your country. Read them, edit what doesn\'t fit, and have a local lawyer check them for larger projects.' }),
    el('div', { class: 'inline' }, ...Object.entries(vars).map(([k, inp]) => field(VAR_LABEL[k], inp)), field('Governing law', country)),
    ...groups.map((g) => el('fieldset', { class: 'comp-group' }, el('legend', { text: g }), ...checks.filter((x) => x.c.group === g).map(({ c, box }) => el('label', { class: 'opt-r comp-clause' }, box, ' ', c.title)))));
  termsOn.checked = false;
  const rateTxt = profile && profile.hourly_rate ? ` or billed at ${money(Number(profile.hourly_rate), cur)} per hour` : '';
  function termsSection() {
    if (!termsOn.checked) return null;
    const v = { ...Object.fromEntries(Object.entries(vars).map(([k, i]) => [k, i.value])), freelancer: me || 'the freelancer', client: clientName || 'the client', rateText: rateTxt };
    const picked = checks.filter((x) => x.box.checked).map((x) => x.c);
    const body = [...picked.map((c, i) => `${i + 1}. ${c.title}. ${fillClause(c.text, v)}`), `${picked.length + 1}. Governing law. ${fillClause(LAW[country.value] + LAW_DISPUTES, v)}`].join('\n\n');
    return { heading: 'Terms', body };
  }

  const payIns = el('textarea', { maxlength: 800, rows: 2 }); payIns.value = (profile && profile.pay_instructions) || '';
  const payLink = el('input', { type: 'url', maxlength: 500, placeholder: 'https://buy.stripe.com/… (optional)' });
  const out = el('div');
  const send = el('button', { class: 'btn', type: 'button', text: 'Create link for client' });
  const preview = el('button', { class: 'btn ghost', type: 'button', text: 'Preview' });
  const doc = () => ({
    kind: kind.value, title: title.value.trim(), client: clientName || 'Client', agency: me || (user.email || 'Freelancer'), agencyEmail: (profile && profile.email) || user.email || '',
    currency: cur, sections: [...sections.filter((x) => x.heading.trim() && x.body.trim()), termsSection()].filter(Boolean),
    items: lines.filter((l) => l.text.trim()).map((l) => ({ kind: l.kind, text: l.text.trim(), price: l.kind === 'out' ? undefined : l.price })),
    schedule: plan.filter((x) => x.label.trim() && x.amount > 0), payInstructions: payIns.value.trim(), payLink: payLink.value.trim(), projectId: id,
  });
  preview.addEventListener('click', () => {
    const d = doc(); const box = el('div', { class: 'card comp-preview' }, el('p', { class: 'muted small', text: `${DOC_LABEL[d.kind]} from ${d.agency} to ${d.client}` }), el('h2', { text: d.title }));
    renderParts(d, box);
    box.append(el('h2', { text: 'Lines to approve' }), el('ul', {}, d.items.map((it) => el('li', { text: `${it.text}${it.price != null ? ' · ' + money(it.price, cur) : ''}${it.kind === 'out' ? ' (not included)' : ''}` }))));
    out.replaceChildren(box); box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  send.addEventListener('click', busy(send, async () => {
    const d = doc();
    if (!d.items.length) throw new Error('Add at least one line for your client to approve');
    const r = await Auth.api('seal', d);
    const url = `${location.origin}/sign#${r.token}`;
    const linkIn = el('input', { readonly: true, value: url });
    out.replaceChildren(el('div', { class: 'card' }, el('h2', { text: 'Your link is ready' }), el('p', { class: 'muted', text: 'Send it to your client. You will see here when they open and sign it, and the payment schedule becomes payment requests once they approve.' }),
      el('div', { class: 'share' }, linkIn, copyBtn(linkIn)), el('p', { class: 'row' }, el('a', { class: 'btn ghost', href: url, target: '_blank', rel: 'noopener', text: 'Preview as client' }), el('a', { class: 'btn ghost', href: '#/projects/' + id, text: 'Back to the project' }))));
    out.scrollIntoView({ behavior: 'smooth' });
  }));

  view().replaceChildren(
    el('p', { class: 'small' }, el('a', { href: '#/projects/' + id, text: '← ' + p.title })),
    el('div', { class: 'head' }, el('h1', { text: 'Proposal or agreement' }), el('div', { class: 'row' }, kind)),
    field('Title', title),
    el('section', { class: 'sect' }, el('h2', {}, 'Written sections', el('span', { class: 'row' }, lang, ai, addSec)), secBox),
    el('section', { class: 'sect' }, el('h2', { text: 'Lines your client approves' }), lineBox),
    el('section', { class: 'sect' }, el('h2', {}, 'Payment schedule', preset), planBox, el('p', { class: 'muted small', text: 'Becomes payment requests in this project when your client approves.' })),
    el('section', { class: 'sect' }, el('h2', { text: 'Terms' }), terms),
    el('section', { class: 'sect' }, el('h2', { text: 'How your client pays you' }), field('Payment instructions', payIns), field('Payment link', payLink)),
    el('p', { class: 'row sect' }, preview, send), out);
}
