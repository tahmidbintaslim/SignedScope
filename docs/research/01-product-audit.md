# Task 1: Product audit

**Date:** 6 Nov 2026 · **What was checked:** https://singedscope.tahmid.space/ (live) and `main` at `3c2681f`
**Method:** Playwright on a desktop (1440×900) and an iPhone 13 screen, an axe-core 4.10 accessibility scan, requests to the live API, and a code read. No customer data used.

---

## 1. Executive recommendation

1. **Fix production configuration today.** The live app cannot create a document (see 3.1). Any survey participant who clicked "Create a free scope" hit an error. Until this is fixed, "confused" may simply mean "broken".
2. **Keep the engine, replace the shell.** The signing, versioning, diff and pricing logic fits the "change request" strength we chose to lead with and can be reused. The stateless, no-account design cannot meet the MVP in the plan (accounts, history, revocation, dashboard, notifications). It needs a database and authentication, built after validation, not before.
3. **Rework the story, not the visuals.** The v4 design is fine. The problem is that the home page shows a change request on a project the visitor never saw being created, uses six different nouns for one flow, and never answers "how many steps", "is it secure" or "why not Google Docs".

---

## 2. Current user journey (as built)

```
Agency                                   Client
──────                                   ──────
/new  fill form (title, client, name, email,
      optional paste → "Turn into items",
      items: In scope / UAT check / Out of scope,
      price, currency, pay link)
  → "Create sign-off link"
  → copies a long URL (state lives in the #fragment)
  → sends it by email/LINE/WhatsApp ───────▶ /sign#<token>
                                             approve / reject each line,
                                             type name, draw signature
                                             → "Sign off"
  ◀──── client sends receipt link back ───── /receipt#<token>
/verify  either side pastes a link to check it      (optional "Pay now")

Change request: agency opens /new?parent=<receipt>, adds lines → new link → client signs revision 2
```

Steps: **3 for the agency** (fill, create, send) and **2 for the client** (decide, sign). Short, but the site never says so.

---

## 3. Findings

### 3.1 Critical: production is not configured

| Check (live) | Result | Cause |
|---|---|---|
| `POST /api/seal` (create a document) | `{"error":"Server is not configured"}` | `SIGNING_SECRET` not set in Vercel |
| `POST /api/waitlist` | `Waitlist is temporarily unavailable` (503) | `BLOB_READ_WRITE_TOKEN` not set |
| `POST /api/draft` | `"source":"rules"` | `ANTHROPIC_API_KEY` not set, so AI drafting is off |
| Pricing buttons `/api/checkout` | Fall back to the waitlist, which also fails | `STRIPE_LINK_PRO/AGENCY` not set |

**Effect:** no visitor can create a document, join the waitlist or see AI drafting. Fix this before any further survey or interview.

### 3.2 UX problems

| # | Problem | Evidence | Severity |
|---|---|---|---|
| U1 | The demo starts mid-story: a change request on an already-signed project. Visitors never see how a project starts. | Home `#demo` steps 1–5 begin with "drag the client's ask" | High |
| U2 | Six nouns for one flow: scope, sign-off, UAT check, receipt, revision, change request. "UAT" is jargon for most freelancers. | `/new` h1 "New sign-off", item kind "UAT check", CTA "Create a free scope" | High |
| U3 | Never answers the survey's questions: number of steps, security, contracts or PDF, why not Google Docs. | No section or page for these. `/security`, `/terms` and `/pricing` return 404 | High |
| U4 | Very long page: 696 words, about 7,200 px on desktop and about 11,000 px on mobile (about 13 phone screens). | Playwright measurement | Medium |
| U5 | `/new` opens with four form fields. The paste box, the fastest and most "magic" step, is optional and below the fold. | Mobile screenshot | Medium |
| U6 | Opening `/sign` without a link shows only an error line and no way forward. | `/sign` screenshot; no h1 | Low |
| U7 | The document lives only in the URL. If the agency loses the link, the document is gone. There is no list of "my documents". | Stateless architecture | High (trust) |
| U8 | The pay link accepts only https links from an allow-list. **PromptPay, bank transfer, bKash and similar cannot be entered at all.** | `PAY_HOSTS` in `api/_lib.js` | High for TH/BD |

### 3.3 Feature gaps against the MVP (section 6.2 of the plan)

| MVP area | Today | Gap |
|---|---|---|
| A. Account and workspace | None (by design) | Full build: auth, workspace, profile, tenancy |
| B. Client management | Client name typed per document | Full build |
| C. Brief capture | Paste, then split into lines (AI or rules) | Extraction of objectives, assumptions, open questions and risks; the AI zod schema can be extended |
| D. Proposal and quotation | Items, prices, currency | Milestones, timeline, revision terms, templates, PDF, version list |
| E. Client share page | Tamper-proof link; mobile-friendly | Expiry and revocation (impossible while the state lives in the URL), comments, "viewed" event |
| F. Agreement and signature | Drawn signature, typed name, timestamp, receipt and verify | Agreement text or template, signer identity check, downloadable PDF, a clear legal-validity position |
| G. Payment request and tracking | One external link and a total | Manual instructions (PromptPay, bank), statuses, deposit and milestones, a "marked paid" record |
| H. Dashboard | None | Full build |
| I. Notifications | None | Full build (email) |
| Change requests / versions | **Built:** parent link, diff, baseline total | Needs storage to show history |

### 3.4 Technical debt

- The architecture has no database. Everything is in the token, so nothing can be revoked, listed or reported "viewed". That was the right call for an MVP-zero, but it is a dead end for the plan's MVP.
- The in-memory rate limits for draft, hit and waitlist do little on serverless, where every instance has its own memory.
- 8 open code-review findings (see `docs/STATUS.md`, P0 and P1).
- `CURRENCIES` is duplicated between `api/_lib.js` and `public/common.js`.
- `package.json` still says `scopelock` and describes the product as "UAT sign-off links".
- CI: the actions are not pinned to commit hashes, `persist-credentials` is not disabled, and the browser test does not run in CI.
- The site's pricing (Free / $19 / $49) no longer matches the $10 / $20 hypothesis.

### 3.5 Accessibility and responsiveness (axe-core 4.10)

| Page | Issue | Detail |
|---|---|---|
| `/` | Colour contrast (serious) | Coral `#FF5B3A` text on white is 3.08:1 and on `#F5F7FC` is 2.87:1 (`.coral`, `#leak`). The nav demo link is 4.48:1. All need 4.5:1 |
| `/sign` | Colour contrast (serious) | Error text `#err` in coral on white is 3.08:1 |
| `/sign` | No h1 (moderate) | Empty or error state |
| `/new` | Clean | — |

No horizontal scrolling on either screen size. Reduced-motion and keyboard paths exist in `demo.js` and should be re-tested after any redesign.

### 3.6 Trust and security gaps

- **Strengths to tell people about:** the documents are sealed with a cryptographic signature (HMAC-SHA256), the content sits in the URL `#fragment` so it never reaches server logs, `/verify` checks a link, there is a strict CSP, and nothing about the client is stored.
- **Gaps:**
  - Signer identity is only a typed name; there is no email or OTP check.
  - Links cannot be revoked and never expire.
  - The copy says "not a legal e-signature", which reads as "not secure".
  - There is no security page, terms or subprocessor list (Vercel, Anthropic).
  - The privacy page does not mention Anthropic.

---

## 4. Worth reusing

| Component | Reuse as |
|---|---|
| `seal`/`sign`/`verify` and the canonical-MAC token | The integrity hash on stored, versioned snapshots and in receipts |
| Item model (scope / out / check) with per-line decisions | The core of the ScopeVersion and ChangeRequest entities |
| `diffStatus` and the baseline total | The change-request comparison (our main difference from competitors) |
| `api/draft.js` (zod structured output, rules fallback) | The first piece of brief extraction; extend the schema |
| Pay-link validation | Level 1 payment method, extended with manual instructions |
| Signature pad, receipt layout | The client signing step |
| Design tokens, fonts, CSP, tests | Carried over unchanged |
| `demo.js` state machine | The new demo storyboard (Task 5) |

---

## 5. Assumptions and uncertainty

- The survey feedback was collected while production was misconfigured. Some of the confusion may come from errors rather than the concept.
- Accessibility was checked automatically only. A manual screen-reader pass has not been done.
- I have not checked whether the Vercel project serves `main` at this commit; I inferred it from the matching content.

## 6. Success criteria for this phase

- `POST /api/seal` and `/api/waitlist` return 200 on the live site.
- 0 serious axe violations.
- A new visitor can say what SignedScope does and how many steps it takes (tested in the validation kit, prototype script, part B).

## 7. Next actions

| Owner | Action |
|---|---|
| Founder | In Vercel → signedscope → Settings → Environment Variables, set `SIGNING_SECRET` (32+ random characters), `BLOB_READ_WRITE_TOKEN` (connect a Blob store), and optionally `ANTHROPIC_API_KEY`. Then redeploy. |
| Founder | Decide on the domain spelling: "singed" vs "signed". |
| Claude | Small, safe fixes (only after the founder agrees): contrast, the /sign empty state, terminology clean-up, P0 review findings. |
| Both | Start interviews with `02-validation-kit.md`. |
