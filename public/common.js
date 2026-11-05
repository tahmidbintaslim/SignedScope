'use strict';
// Shared helpers. All rendering uses textContent; never innerHTML with user data.
const $ = (s, r = document) => r.querySelector(s);
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c);
  return n;
}
async function api(path, body) {
  const r = await fetch('/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: 'Network error' }));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
const KIND = { scope: 'In scope', uat: 'UAT check', out: 'Out of scope' };
const tokenFromHash = () => decodeURIComponent(location.hash.slice(1));
function copyBtn(input) {
  return el('button', { class: 'btn ghost', type: 'button', onclick: async () => {
    try { await navigator.clipboard.writeText(input.value); } catch { input.select(); document.execCommand('copy'); }
  }, text: 'Copy' });
}
function fmt(iso) { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } }
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'SGD', 'THB', 'BDT', 'VND', 'PHP', 'INR', 'MYR', 'IDR', 'JPY'];
// Formats an amount in the document's currency, e.g. money(480, 'USD') -> "$480".
function money(n, cur = 'USD') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n); }
  catch { return `${cur} ${n}`; }
}
