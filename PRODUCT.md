# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary A: web and Shopify agency owners and project managers** (3 to 30 people). Job: get a client to approve scope at kickoff, sign off UAT at handover so the final milestone can be invoiced, and agree in writing to every change before it is quoted.
- **Primary B: offshore and nearshore dev teams** (Bangladesh, Vietnam, the Philippines, Thailand) serving US, UK, EU and AU clients across time zones, often on fixed-price or Upwork milestones.
- **The client (signer):** opens one link in any browser, with no account, decides on each item and signs.

## Product Purpose
Turn a scope or UAT checklist into a priced link the client accepts or rejects item by item and signs, producing a tamper-evident receipt. New asks become change requests shown as a priced diff against the signed version, with the agency's own Pay link. Success: the agency gets the final milestone signed and paid, and every change paid for.

## Positioning
Item-level decisions (every rejection needs a reason) plus change requests linked by hash to the signed revision, with a receipt anyone can verify, and no stored documents on the free tier. Email approval has no structure; PDF plus e-signature signs a whole file and cannot diff changes.

## Operating Context
Used at three moments: kickoff scope, UAT handover, change requests. Agencies paste existing checklists or start from templates (Shopify store launch, WordPress site handover, mobile app UAT). Clients sign on desktop or phone, often non-technical.

## Capabilities and Constraints
- Stateless: `POST /api/seal` returns `v1.<base64url(json)>.<hmac>`; data lives in the URL fragment (`/sign#`, `/receipt#`, `/new#cr=`). `/verify` recomputes the HMAC.
- App URLs `/new`, `/sign`, `/receipt`, `/verify`, `/privacy`, `/thanks` must not change (links already sent).
- Limits: up to 100 items of 600 characters, one link of about 60,000 characters.
- CSP: `script-src 'self'`, no inline scripts, no third-party scripts or analytics.
- Marketing site: static HTML/CSS/vanilla JS in `public/` (no build step), deployed on Vercel.
- Pricing: Free $0 (works today, unlimited); Pro $19/month flat and Agency $49/month flat are planned, waitlist only.
- Payments: free tier shows the agency's own Pay link (Stripe, Wise, Omise, PayPal, Payoneer). Pro adds invoices and tax through Stripe Connect.
- Not a legally binding e-signature; signer identity is self-declared.

## Brand Commitments
- Name: SignedScope (decided 2026-11-03; scopelock.app is an unrelated live product). Formerly ScopeLock.
- Voice: plain, first person from the builder (Tahmid Rafi, Bangkok), concrete, no hype, no em-dashes in body copy, US spelling.
- Open source, MIT license.
- Visual direction (2026-11-03): bold, editorial, paper-and-ink receipt motif. The home page is a playable demo of the "one small change" moment. The earlier category-standard SaaS direction was rejected by the owner and is an anti-reference.

## Evidence on Hand
- The interactive demo on the home page and real screens in `docs/img/`.
- Strategy and research: the "ScopeLock product strategy" doc (competitors, voice of customer, decisions).
- No testimonials, customer logos, user counts or case studies exist. Never fabricate them; the product itself is the proof.

## Product Principles
1. Show the receipt, not adjectives: the signed artifact is the proof.
2. Honest limits: say what it is not (not an e-signature, Pro not built yet).
3. Zero friction for the client: no account, one link, works on a phone.
4. Money outcome first, mechanism second.

## Accessibility & Inclusion
WCAG 2.2 AA. Signers are often non-technical and may read English as a second language: plain words, large targets, works at phone width.
