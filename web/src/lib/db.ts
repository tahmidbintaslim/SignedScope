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
