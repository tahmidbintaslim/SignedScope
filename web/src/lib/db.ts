// Workspace data in Supabase. Row Level Security limits every query to the signed-in user's rows,
// so these helpers never filter by owner themselves. Query keys live here so pages and
// prefetching agree.
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type ProjectStatus = 'lead' | 'estimating' | 'proposal_sent' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export interface Profile {
  id: string; name: string | null; business_name: string | null; email: string | null; currency: string; hourly_rate: number | null;
  lang: 'en' | 'bn' | 'th'; pay_instructions: string | null; notify_signed: boolean; notify_viewed: boolean; notify_overdue: boolean;
  country: string | null; time_zone: string | null; onboarded_at: string | null;
}
export interface Client { id: string; name: string; company: string | null; email: string | null; phone: string | null; country: string | null; notes: string | null; created_at: string }
export interface Project { id: string; client_id: string | null; title: string; status: ProjectStatus; currency: string; start_date: string | null; due_date: string | null; notes: string | null; created_at: string; updated_at: string }
export interface Doc { id: string; project_id: string | null; kind: string; title: string; revision: number; status: 'sent' | 'viewed' | 'signed' | 'changes_requested'; currency: string | null; total: number | null; created_at: string; signed_at: string | null; signer_name: string | null; token?: string; receipt_token?: string | null }
export interface Payment { id: string; project_id: string; document_id: string | null; label: string; amount: number; currency: string; due_date: string | null; status: 'requested' | 'paid_manual' | 'paid_provider' | 'cancelled'; method: string | null; reference: string | null; paid_at: string | null; created_at: string }
export interface Activity { id: number; project_id: string | null; kind: string; detail: Record<string, string | number | undefined>; created_at: string }

/** Profile fields the browser may change (column grants in the security and onboarding migrations). */
export type ProfilePatch = Partial<Pick<Profile, 'name' | 'business_name' | 'currency' | 'hourly_rate' | 'lang' | 'pay_instructions' | 'notify_signed' | 'notify_viewed' | 'notify_overdue' | 'country' | 'time_zone' | 'onboarded_at'>>;

export async function db(): Promise<SupabaseClient> {
  const sb = await supabase();
  if (!sb) throw new Error('Accounts are not set up yet.');
  return sb;
}
/** Unwraps a Supabase result, throwing its error so React Query can show it. */
export function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export const keys = {
  profile: ['profile'] as const,
  projects: ['projects'] as const,
  clients: ['clients'] as const,
  documents: ['documents'] as const,
  payments: ['payments'] as const,
  activity: (n: number) => ['activity', n] as const,
};

export async function getProfile(userId: string): Promise<Profile | null> {
  return ok(await (await db()).from('profiles').select('*').eq('id', userId).maybeSingle());
}
export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const sb = await db();
  const row = ok(await sb.from('profiles').update(patch).eq('id', userId).select('*').maybeSingle()) as Profile | null;
  if (row) return row;
  // No profile row (the sign-up trigger failed): the server recreates it, then save again.
  const { api } = await import('./api');
  await api('config', {});
  return ok(await sb.from('profiles').update(patch).eq('id', userId).select('*').single());
}
export async function listProjects(): Promise<Project[]> {
  return ok(await (await db()).from('projects').select('*').order('updated_at', { ascending: false }));
}
export async function listClients(): Promise<Client[]> {
  return ok(await (await db()).from('clients').select('*').order('name'));
}
export async function listDocuments(): Promise<Doc[]> {
  return ok(await (await db()).from('documents').select('id, project_id, kind, title, revision, status, currency, total, created_at, signed_at, signer_name').order('created_at', { ascending: false }));
}
export async function listPayments(): Promise<Payment[]> {
  return ok(await (await db()).from('payments').select('*').order('created_at', { ascending: false }));
}
export async function listActivity(limit = 12): Promise<Activity[]> {
  return ok(await (await db()).from('activity').select('*').order('created_at', { ascending: false }).limit(limit));
}
export async function createClient(c: Pick<Client, 'name'> & Partial<Client>): Promise<Client> {
  const sb = await db();
  const row = ok(await sb.from('clients').insert(c).select('*').single()) as Client;
  await sb.from('activity').insert({ kind: 'client_created', detail: { name: row.name } });
  return row;
}
export async function createProject(p: Pick<Project, 'title'> & Partial<Project>): Promise<Project> {
  const sb = await db();
  const row = ok(await sb.from('projects').insert(p).select('*').single()) as Project;
  await sb.from('activity').insert({ project_id: row.id, kind: 'project_created', detail: { title: row.title } });
  return row;
}

/** Totals per currency, e.g. [{currency:'THB', amount:12000}, {currency:'USD', amount:800}]. */
export function sumByCurrency(rows: { currency: string; amount: number | string }[]) {
  const by = new Map<string, number>();
  rows.forEach((r) => by.set(r.currency, (by.get(r.currency) ?? 0) + Number(r.amount || 0)));
  return [...by].map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }));
}

// ---- Projects, clients, payments, files (phase E part 2) ----
export interface EstimateRow { id: string; project_id: string; currency: string; rate: number; buffer_pct: number; data: { features?: { name: string; stories: { title: string; hoursLow: number; hoursHigh: number }[] }[]; outOfScope?: string[] }; hours_low: number; hours_high: number; price_low: number; price_high: number; created_at: string }
export interface VaultFile { name: string; path: string; shown: string; size: number; created_at: string }

export const projectKeys = {
  one: (id: string) => ['project', id] as const,
  estimates: (id: string) => ['project', id, 'estimates'] as const,
  documents: (id: string) => ['project', id, 'documents'] as const,
  payments: (id: string) => ['project', id, 'payments'] as const,
  activity: (id: string) => ['project', id, 'activity'] as const,
  files: (id: string) => ['project', id, 'files'] as const,
};
export const clientKeys = { one: (id: string) => ['client', id] as const };

async function log(projectId: string | null, kind: string, detail: Record<string, unknown>) {
  try { await (await db()).from('activity').insert({ project_id: projectId, kind, detail }); } catch { /* best effort */ }
}

export async function getProject(id: string): Promise<Project | null> {
  return ok(await (await db()).from('projects').select('*').eq('id', id).maybeSingle());
}
export async function updateProject(p: Project, patch: Partial<Pick<Project, 'status' | 'client_id' | 'title' | 'due_date' | 'notes'>>): Promise<Project> {
  const row = ok(await (await db()).from('projects').update(patch).eq('id', p.id).select('*').single()) as Project;
  if (patch.status && patch.status !== p.status) await log(p.id, 'status_changed', { from: p.status, to: patch.status });
  return row;
}
export async function listEstimates(projectId: string): Promise<EstimateRow[]> {
  return ok(await (await db()).from('estimates').select('*').eq('project_id', projectId).order('created_at', { ascending: false }));
}
export async function listProjectDocuments(projectId: string): Promise<Doc[]> {
  return ok(await (await db()).from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }));
}
export async function listProjectPayments(projectId: string): Promise<Payment[]> {
  return ok(await (await db()).from('payments').select('*').eq('project_id', projectId).order('created_at', { ascending: true }));
}
export async function listProjectActivity(projectId: string): Promise<Activity[]> {
  return ok(await (await db()).from('activity').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(30));
}
export async function requestPayment(projectId: string, row: { label: string; amount: number; currency: string; due_date: string | null; document_id: string | null }, shown: string) {
  ok(await (await db()).from('payments').insert({ project_id: projectId, ...row }).select('id').single());
  await log(projectId, 'payment_requested', { label: row.label, amount: shown });
}
export async function markPaid(p: Payment, reference: string, shown: string) {
  ok(await (await db()).from('payments').update({ status: 'paid_manual', paid_at: new Date().toISOString(), reference: reference.slice(0, 120) || null, method: 'manual' }).eq('id', p.id).select('id').single());
  await log(p.project_id, 'payment_paid', { label: p.label, amount: shown });
}

// Vault: private files under <user id>/<project id>/ in the "vault" bucket.
export const MAX_FILE = 25 * 1024 * 1024;
/** Pages and scripts are never stored: a share link must not be able to serve a web page. */
export const blockedFile = (name: string, type: string) => /\.(html?|xhtml|svg|xml|js|mjs)$/i.test(name) || /html|svg|javascript|xml/i.test(type);
export const safeFileName = (name: string) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(-100) || 'file';

export async function listFiles(userId: string, projectId: string): Promise<VaultFile[]> {
  const prefix = `${userId}/${projectId}`;
  const files = ok(await (await db()).storage.from('vault').list(prefix, { sortBy: { column: 'created_at', order: 'desc' } })) as { name: string; created_at: string; metadata?: { size?: number } }[];
  return files.filter((f) => f.name && f.name !== '.emptyFolderPlaceholder')
    .map((f) => ({ name: f.name, path: `${prefix}/${f.name}`, shown: f.name.replace(/^\d+-/, ''), size: f.metadata?.size ?? 0, created_at: f.created_at }));
}
export async function uploadFile(userId: string, projectId: string, file: File) {
  ok(await (await db()).storage.from('vault').upload(`${userId}/${projectId}/${Date.now()}-${safeFileName(file.name)}`, file, { contentType: file.type || 'application/octet-stream', upsert: false }));
}
export async function fileUrl(path: string, seconds: number, download = false): Promise<string> {
  return (ok(await (await db()).storage.from('vault').createSignedUrl(path, seconds, download ? { download: true } : undefined)) as { signedUrl: string }).signedUrl;
}
export async function removeFile(path: string) { ok(await (await db()).storage.from('vault').remove([path])); }

/** Deletes a project with its rows (cascade) and its vault files (not rows, so removed first). */
export async function deleteProject(userId: string, projectId: string) {
  const sb = await db();
  const files = await listFiles(userId, projectId);
  if (files.length) ok(await sb.storage.from('vault').remove(files.map((f) => f.path)));
  ok(await sb.from('projects').delete().eq('id', projectId));
}

export async function getClient(id: string): Promise<Client | null> {
  return ok(await (await db()).from('clients').select('*').eq('id', id).maybeSingle());
}
export async function updateClient(id: string, patch: Partial<Client>): Promise<Client> {
  return ok(await (await db()).from('clients').update(patch).eq('id', id).select('*').single());
}
export async function deleteClient(id: string) { ok(await (await db()).from('clients').delete().eq('id', id)); }

/** Everything in the workspace as one JSON object (Settings → Export). */
export async function exportAll(userId: string, profile: Profile | null | undefined) {
  const sb = await db();
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), profile };
  for (const t of ['clients', 'projects', 'estimates', 'documents', 'payments', 'activity']) out[t] = ok(await sb.from(t).select('*'));
  const files: unknown[] = [];
  for (const p of out.projects as Project[]) files.push(...(await listFiles(userId, p.id)).map((f) => ({ project_id: p.id, name: f.shown, size: f.size })));
  out.files = files;
  return out;
}
