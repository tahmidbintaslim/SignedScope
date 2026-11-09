// Shapes of sealed sign-off links and receipts (see api/seal.js and api/sign.js), and the
// client-side math the sign page shows live. The server recomputes everything on signing.
import { useEffect, useState } from 'react';

export type ItemKind = 'scope' | 'uat' | 'out';
export interface SealedItem { id: string; kind: ItemKind; text: string; price?: number | null }
export interface SealedDoc {
  type: 'doc'; kind?: 'scope' | 'proposal' | 'agreement'; title: string; client: string; agency: string; agencyEmail?: string; notes?: string;
  currency?: string; payLink?: string; payInstructions?: string; items: SealedItem[]; revision?: number; createdAt?: string; anon?: boolean;
  /** Share (1-100) of the approved amount due when the client signs. */
  deposit?: number;
  sections?: { heading: string; body: string }[]; schedule?: { label: string; amount: number; due?: string }[];
  parent?: { receiptHash: string; docHash: string; title: string; signedAt: string; signer: string; items: SealedItem[]; total?: number; currency?: string };
}
export type DecisionStatus = 'accepted' | 'rejected' | 'acknowledged';
export interface Decision { status: DecisionStatus; note?: string }
export interface SealedReceipt {
  type: 'receipt'; docHash: string; doc: Omit<SealedDoc, 'type'>; signer: { name: string; email?: string }; decisions: Record<string, Decision>;
  totals?: { currency: string; accepted: number; baseline: number | null }; outcome: 'approved' | 'changes_requested'; signedAt: string;
  evidence: { country?: string; uaHash: string };
  due?: Due;
}
/** What is due on signing under a deposit rule (computed by the server; mirrored by depositDue). */
export interface Due { pct: number; base: number; now: number; later: number; currency: string }
export interface Verified<T> { valid: true; hash: string; data: T; questions?: LineQuestion[] }
/** A client's question on one line of a filed link, and the sender's answer. Absent on unfiled links. */
export interface LineQuestion { id: string; itemId: string; question: string; answer: string | null; answeredAt: string | null; createdAt: string }

export const KINDS: ItemKind[] = ['scope', 'uat', 'out'];

/** decodeURIComponent that returns the raw text for malformed input (a cut-off link) instead of throwing. */
export const safeDecode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** Reads the token after "#", as sent in sign-off and receipt links. */
export const hashToken = () => (typeof window === 'undefined' ? '' : safeDecode(window.location.hash.slice(1)));

/** The token from the URL hash: null while pre-rendering, then kept in sync when the hash changes. */
export function useHashToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setToken(hashToken());
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return token;
}

/** "added" / "changed" against the signed baseline of a change request, or null. */
export function diffStatus(it: SealedItem, parent?: SealedDoc['parent']): 'added' | 'changed' | null {
  if (!parent) return null;
  const p = parent.items.find((x) => x.id === it.id);
  if (!p) return 'added';
  return p.text !== it.text || p.kind !== it.kind || (p.price ?? null) !== (it.price ?? null) ? 'changed' : null;
}

/** Live total: undecided priced lines count as proposed; only rejecting one lowers it. */
export function proposedTotal(items: SealedItem[], decisions: Record<string, DecisionStatus | undefined>) {
  let cents = 0, decided = 0, priced = 0;
  for (const it of items) {
    if (it.price == null) continue;
    priced++;
    const d = decisions[it.id];
    if (d) decided++;
    if (d !== 'rejected') cents += Math.round(it.price * 100);
  }
  return { amount: cents / 100, allDecided: decided === priced, priced };
}

/** Same rule as payable() in api/_lib.js: something accepted, and a priced total above zero. */
export function isPayable(items: SealedItem[], decisions: Record<string, Decision>, acceptedTotal?: number) {
  if (!items.some((it) => decisions[it.id]?.status === 'accepted')) return false;
  return items.some((it) => it.price != null) ? (acceptedTotal ?? 0) > 0 : true;
}

/** Only https pay links are shown as a button; the host is named so clients see where money goes. */
export const payHost = (link?: string) => {
  if (!link || !/^https:\/\//.test(link)) return null;
  try { return new URL(link).hostname; } catch { return null; }
};

/** Same rule as amountDue() in api/_lib.js: a share of the approved amount, or of the increase on a change request. */
export function depositDue(pct: number | undefined, approved: number, baseline: number | null | undefined) {
  if (!pct) return null;
  const base = Math.round(approved * 100) - (baseline != null ? Math.round(baseline * 100) : 0);
  if (base <= 0) return null;
  const now = Math.round((base * pct) / 100);
  return { pct, base: base / 100, now: now / 100, later: (base - now) / 100 };
}
