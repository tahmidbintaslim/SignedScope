<p align="center"><img src="public/favicon.svg" width="56" alt=""></p>
<h1 align="center">SignedScope</h1>
<p align="center"><b>Every line signed. Every change priced.</b><br>
The client accepts or rejects each scope item and UAT check, with a price on each line, and signs. They get an HMAC-signed receipt. A later request becomes a change request shown as a priced diff against what they signed, with your own Pay link.<br>
No database and no client login. Formerly ScopeLock.</p>
<p align="center"><a href="https://scopelock-sable.vercel.app">Live app</a> · <a href="#how-it-works">How it works</a> · <a href="#self-host">Self-host</a></p>

<p align="center"><a href="https://scopelock-sable.vercel.app"><b>Try the live demo</b></a> &nbsp;·&nbsp; free, no signup</p>

<p align="center"><img src="docs/img/demo.gif" width="760" alt="Demo: a client request is dragged onto the signed scope, priced, approved by the client and signed, and the total updates"></p>

## Why

Scope disputes usually come down to one sentence: "I thought that was included." A PDF and an email that says "looks good" do not settle it, and every "one small change" after that is a discount nobody agreed to. SignedScope records what was shown, what was approved or rejected, who signed and when, in a form neither side can edit without verification failing.

## Screenshots

| 1. Agency creates a sign-off | 2. Client reviews and signs |
|---|---|
| <img src="docs/img/02-create.png" alt="Create form with in-scope, UAT and out-of-scope items"> | <img src="docs/img/04-client-review.png" alt="Client page with accept or reject per item and a comment on the rejected one"> |
| **3. Signed receipt with evidence** | **4. Change request shown as a diff** |
| <img src="docs/img/05-receipt.png" alt="Receipt showing approved and rejected items, signer, time and hashes"> | <img src="docs/img/07-client-diff.png" alt="Change request with a changed item (was / now) and an added item"> |
| **5. Anyone can verify a link** | **6. An edited link fails verification** |
| <img src="docs/img/08-verify.png" alt="Verify page confirming a valid receipt"> | <img src="docs/img/09-tampered.png" alt="Verify page rejecting a receipt whose signer name was edited"> |

<p align="center"><img src="docs/img/10-mobile.png" width="280" alt="Client sign page on a phone"><br><sub>The client page on a phone.</sub></p>

## How it works

1. **Seal.** The agency lists in-scope items, UAT checks and out-of-scope exclusions. `POST /api/seal` returns `v1.<base64url(json)>.<hmac>`. That token is the whole document.
2. **Sign.** The client opens `/sign#<token>`. The data sits in the URL fragment, so it is not part of the page request. The page then sends it in the body of an API call that checks the signature and stores nothing. They accept or reject each item (a rejection needs a comment), acknowledge the exclusions and sign. `POST /api/sign` checks the token and returns a signed **receipt** that embeds the document, its SHA-256, the decisions, the signer, a timestamp, the country and a UA hash.
3. **Verify.** `/verify` (or `POST /api/verify`) recomputes the HMAC. If the document changed, verification fails.
4. **Change request.** "Start a change request" on a receipt seals revision *n+1* linked to the baseline receipt's hash. The client sees added, changed and removed items compared with what they approved.
5. **Prices and payment.** Any in-scope or UAT line can carry a price, in one of 15 currencies. The receipt records the accepted total and, on a change request, the signed baseline it is compared with. An optional Pay link (Stripe, Wise, Omise, PayPal or Payoneer hosts only) is shown to the client after signing. SignedScope never handles the money.
6. **Draft from a message.** `POST /api/draft` turns a pasted client message or brief into draft lines. With `ANTHROPIC_API_KEY` set it uses Claude; otherwise a rule-based splitter. Nothing is sealed until the agency reviews it.

| | Free (this repo) | Pro, planned, $19/mo flat | Agency, planned, $49/mo flat |
|---|---|---|---|
| Unlimited sign-offs, receipts, priced change requests, your own Pay link | Yes | Yes | Yes |
| Saved workspace, email notifications, branding, PDF, invoices and tax via Stripe Connect | No | Yes | Yes |
| 5 seats, custom domain, API/webhooks | No | No | Yes |

## Security model

* Integrity comes from HMAC-SHA256 with a server secret, compared in constant time. A token cannot be forged or edited without `SIGNING_SECRET`.
* Signer identity is self-declared: the receipt shows what the person who opened the link entered. It is a sign-off record, not an eIDAS or ESIGN qualified signature.
* Rotating the secret makes every existing link fail verification. Key IDs (`v2.<kid>.…`) would fix that, and they are on the roadmap.
* Inputs are size-limited (64 KB body, up to 100 items of 600 characters each, and about 60,000 characters per link). Waitlist sign-ups are rate-limited per IP (5 per 10 min), with counters in Blob under a keyed hash, so raw IPs are never stored. The UI renders everything with `textContent`, under a strict CSP.

## Self-host

```bash
git clone https://github.com/tahmidbintaslim/signedscope && cd signedscope
npm install && npm test
# Vercel: set SIGNING_SECRET (32+ random chars); optional ANTHROPIC_API_KEY for AI drafts, BLOB_READ_WRITE_TOKEN for the waitlist,
# STRIPE_LINK_PRO / STRIPE_LINK_AGENCY for checkout redirects
# Accounts and the /app workspace: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (see docs/SETUP-ACCOUNTS.md)
npx vercel deploy
```

No framework and no build step: static files in `public/` plus Node functions in `api/`. Accounts use Supabase (Postgres with Row Level Security); the schema is in `supabase/migrations/`, and the browser client is vendored in `public/vendor/` so the CSP can stay `script-src 'self'`. Fonts (Plus Jakarta Sans, JetBrains Mono; OFL) are self-hosted under `public/fonts/`.

### Run it locally

```bash
SIGNING_SECRET=$(openssl rand -base64 32) npm run dev   # http://localhost:3000, no Vercel CLI needed
```

Tests: `npm test` runs unit and server tests; set `PGTEST_URL` to a Postgres URL to also run the Row Level Security tests (CI does). `node test/browser/app.e2e.js` drives the workspace in a browser against an in-memory Supabase.

`scripts/capture-screenshots.js` regenerates the app screenshots in `docs/img/`, and `scripts/capture-demo.js` records `docs/img/demo.gif` and `public/og.png`, both from a real run against the dev server (`BASE=http://localhost:3000`).

Payments: Pro and Agency are not built yet, so the landing page links to the waitlist. The `/api/checkout` route and the Stripe test-mode links stay in place for when live mode is approved.

## Roadmap

- [ ] Key IDs and secret rotation
- [x] Accounts and a workspace: clients, projects, saved AI estimates, document status (sent, viewed, signed), payments, activity, two-step sign-in
- [ ] Proposals and agreements from templates, clause library, PDF export
- [ ] Document vault, email on view/sign, payment reminders, logo and colors
- [ ] Pro: invoices, pay links and tax through Stripe Connect (each agency a connected account)
- [ ] Email OTP to confirm signer identity (optional per document)
- [ ] Import from Markdown, Notion or Google Docs checklists
- [ ] Agency: webhooks, seats, custom domain

## Author

Tahmid Rafi, Lead Full Stack Software Engineer & Solutions Architect, Bangkok.

## License

MIT
